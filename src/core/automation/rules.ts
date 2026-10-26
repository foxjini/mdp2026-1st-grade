// 자동화 스케줄 규칙 (순수 함수: 엔진 · 설정 창 · 테스트 공용)
import { BaseDeviceId, BASE_DEVICE_INFO, RoomPackage } from '../types/iot';
import { roomUsesDevice } from '../rooms/devices';

/** 규칙이 보는 현재 값 (수신 대기인 센서는 undefined) */
export interface AutomationSnapshot {
  temperature?: number;
  humidity?: number;
  light?: number;
}

/** 규칙이 할 수 있는 동작 (엔진이 스토어 액션으로 연결) */
export interface AutomationContext {
  snapshot: AutomationSnapshot;
  has: (device: BaseDeviceId) => boolean;
  setServo: (angle: number) => void;
  setRgb: (color: string | null, state: 'ON' | 'OFF') => void;
  requestApproval: (message: string) => void;
  /** 이 공간에서 SG90 을 부르는 이름 (기본 거실 = '스마트 도어', 학생 공간 = '서보모터') */
  servoName: string;
}

export interface AutomationRule {
  id: string;
  title: string;
  trigger: string;   // 화면 표시용 조건 문구
  action: string;    // 화면 표시용 동작 문구
  devices: BaseDeviceId[];        // 모두 있어야 실행
  anyDevices?: BaseDeviceId[];    // 이 중 하나만 있어도 실행 (devices 대신)
  kind: 'sensor' | 'time';
  when?: (s: AutomationSnapshot) => boolean | undefined;  // undefined = 값 없음(판단 보류)
  at?: string;       // 'HH:MM' (time 규칙)
  /** 실행하고 음성 · 로그로 알릴 문장을 돌려줌 */
  run: (ctx: AutomationContext) => string;
}

export const AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule-1',
    title: '고온 감지 자동 환기',
    trigger: '실내 온도 28.0℃ 이상 감지 시',
    action: '사용자 확인 요청 → 승인하면 스마트 도어 90° 개방',
    devices: ['dht11', 'sg90'],
    kind: 'sensor',
    when: (s) => (s.temperature === undefined ? undefined : s.temperature >= 28),
    run: (ctx) => {
      const t = ctx.snapshot.temperature ?? 0;
      const msg = `실내 온도 ${t.toFixed(1)}도. 환기를 위해 ${ctx.servoName}를 90도로 열까요? 오른쪽 패널에서 동작 승인을 눌러 주세요.`;
      ctx.requestApproval(msg);
      return msg;
    },
  },
  {
    id: 'rule-2',
    title: '일몰 및 야간 자동 조명',
    trigger: '주변 조도 20,000 ADC 이하 감지 시',
    action: '실내 무드등 오션 블루 색상 ON',
    devices: ['cds', 'rgb'],
    kind: 'sensor',
    when: (s) => (s.light === undefined ? undefined : s.light <= 20000),
    run: (ctx) => {
      ctx.setRgb('#3B82F6', 'ON');
      return '주변이 어두워져 조명을 오션 블루로 켭니다.';
    },
  },
  {
    id: 'rule-3',
    title: '고습도 환경 환기 규칙',
    trigger: '실내 습도 70% 초과 시',
    action: '스마트 도어 45° 미세 환풍 개방',
    devices: ['dht11', 'sg90'],
    kind: 'sensor',
    when: (s) => (s.humidity === undefined ? undefined : s.humidity > 70),
    run: (ctx) => {
      ctx.setServo(45);
      return `습도가 ${Math.round(ctx.snapshot.humidity ?? 0)}퍼센트로 높아 ${ctx.servoName}를 45도 열어 환기합니다.`;
    },
  },
  {
    id: 'rule-4',
    title: '취침 모드 스케줄',
    trigger: '매일 밤 23:00 정각',
    action: '실내 무드등 로맨틱 퍼플 은은한 조명 전환',
    devices: ['rgb'],
    kind: 'time',
    at: '23:00',
    run: (ctx) => {
      ctx.setRgb('#A855F7', 'ON');
      return '밤 11시 취침 모드입니다. 조명을 로맨틱 퍼플로 바꿉니다.';
    },
  },
  {
    id: 'rule-5',
    title: '보안 잠금 스케줄',
    trigger: '매일 자정 24:00 정각',
    action: '전체 조명 OFF 및 스마트 도어 0° 완전 잠금',
    devices: [],
    anyDevices: ['rgb', 'sg90'],
    kind: 'time',
    at: '00:00',
    run: (ctx) => {
      const rgb = ctx.has('rgb');
      const servo = ctx.has('sg90');
      if (rgb) ctx.setRgb(null, 'OFF');
      if (servo) ctx.setServo(0);
      const what = rgb && servo ? `조명을 끄고 ${ctx.servoName}를 0도로 닫습니다.` : rgb ? '조명을 끕니다.' : `${ctx.servoName}를 0도로 닫습니다.`;
      return `자정 보안 잠금입니다. ${what}`;
    },
  },
];

/** 이 공간에서 실행할 수 있는 규칙인가. 아니면 없는 장치 이름 목록 */
export function missingDevices(rule: AutomationRule, pkg: RoomPackage | null): string[] {
  if (rule.anyDevices) {
    return rule.anyDevices.some((d) => roomUsesDevice(pkg, d)) ? [] : rule.anyDevices.map((d) => BASE_DEVICE_INFO[d].name);
  }
  return rule.devices.filter((d) => !roomUsesDevice(pkg, d)).map((d) => BASE_DEVICE_INFO[d].name);
}

/** 센서 규칙의 '거짓 → 참' 순간만 실행 (같은 안내 반복 방지). armed: 규칙별 직전 조건 */
export function shouldFire(rule: AutomationRule, snapshot: AutomationSnapshot, armed: Map<string, boolean>): boolean {
  const cond = rule.when?.(snapshot);
  if (cond === undefined) return false; // 값이 없으면 판단 보류 (직전 상태 유지)
  const prev = armed.get(rule.id) ?? false;
  armed.set(rule.id, cond);
  return cond && !prev;
}

/** 시각 규칙: 그 분(HH:MM)에 하루 한 번 */
export function isTimeDue(rule: AutomationRule, now: Date, lastRunDay?: string): boolean {
  if (!rule.at) return false;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return hhmm === rule.at && lastRunDay !== now.toDateString();
}
