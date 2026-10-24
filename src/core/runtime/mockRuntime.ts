// 팀 mock.js 실행기 (브라우저 시뮬레이션 모드용)
// mock.js 규격: module.exports = { tick(state) → { key: value }, onCommand(action, value, state) → { key: value } }
// 같은 파일이 firmware/mock_pico_server.js(Node)에서도 그대로 실행됩니다.

export interface MockState {
  t: number; // 시뮬레이션 시작 후 경과 시간(초)
  base: {
    temperature: number;
    humidity: number;
    light: number;
    servoAngle: number;
    rgbColor: string;
    rgbState: 'ON' | 'OFF';
  };
  custom: Record<string, number>;
}

export type MockValues = Record<string, number>;

export interface TeamMock {
  tick?: (state: MockState) => MockValues | void;
  onCommand?: (action: string, value: unknown, state: MockState) => MockValues | void;
}

export function compileMock(source: string): TeamMock {
  const module: { exports: TeamMock } = { exports: {} };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', `"use strict";\n${source}`);
  fn(module, module.exports);
  const mod = module.exports;
  if (typeof mod !== 'object' || mod === null) {
    throw new Error('mock.js는 module.exports = { tick() { ... } } 형태여야 합니다.');
  }
  if (mod.tick !== undefined && typeof mod.tick !== 'function') {
    throw new Error('mock.js의 tick은 함수여야 합니다.');
  }
  return mod;
}

// mock.js 가 기본 장치를 흉내 낼 때 쓰는 key (Pico /api/status 와 같은 이름)
// → code.py 의 base.set_servo() / base.set_rgb() 와 같은 동작을 시뮬레이션에서도 재현
export interface MockBaseValues {
  servo_angle?: number;
  rgb_color?: string;
  rgb_state?: 'ON' | 'OFF';
}

export const MOCK_BASE_KEYS = ['servo_angle', 'rgb_color', 'rgb_state'] as const;

// tick/onCommand 반환값 → 확장 센서 값(유한한 숫자) + 기본 장치 값
export function splitMockValues(values: unknown): { custom: MockValues; base: MockBaseValues } {
  const custom: MockValues = {};
  const base: MockBaseValues = {};
  if (!values || typeof values !== 'object') return { custom, base };
  Object.entries(values as Record<string, unknown>).forEach(([key, v]) => {
    if (key === 'servo_angle') {
      if (typeof v === 'number' && Number.isFinite(v)) base.servo_angle = Math.max(0, Math.min(180, Math.round(v)));
    } else if (key === 'rgb_color') {
      if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) base.rgb_color = v.toUpperCase();
    } else if (key === 'rgb_state') {
      if (v === 'ON' || v === 'OFF') base.rgb_state = v;
    } else if (typeof v === 'number' && Number.isFinite(v)) custom[key] = v;
    else if (typeof v === 'boolean') custom[key] = v ? 1 : 0;
  });
  return { custom, base };
}

// 확장 센서 값만 필요할 때
export function sanitizeMockValues(values: unknown): MockValues {
  return splitMockValues(values).custom;
}
