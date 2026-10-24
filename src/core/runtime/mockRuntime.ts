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

// tick/onCommand 반환값 중 유한한 숫자만 남김
export function sanitizeMockValues(values: unknown): MockValues {
  const out: MockValues = {};
  if (!values || typeof values !== 'object') return out;
  Object.entries(values as Record<string, unknown>).forEach(([key, v]) => {
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    else if (typeof v === 'boolean') out[key] = v ? 1 : 0;
  });
  return out;
}
