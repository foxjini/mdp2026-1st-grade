// 자동화 스케줄 실행 엔진: 2초마다 켜진 규칙을 검사해 지금 공간의 장치를 제어하고 음성 · 로그로 알림
import { useEffect } from 'react';
import { useIoTStore } from '../store/useIoTStore';
import { roomUsesDevice } from '../rooms/devices';
import { announce, markAutomation } from '../voice/voice';
import { AUTOMATION_RULES, AutomationRule, AutomationSnapshot, isTimeDue, missingDevices, shouldFire } from './rules';
import { useAutomationStore } from './useAutomationStore';

const armed = new Map<string, boolean>();     // 센서 규칙의 직전 조건 (거짓 → 참 순간만 실행)
const lastRunDay = new Map<string, string>(); // 시각 규칙: 하루 한 번

// 지금 공간에서 쓰고 값이 들어오는 센서만 (수신 대기 · 미사용 센서는 판단하지 않음)
function snapshot(): AutomationSnapshot {
  const s = useIoTStore.getState();
  const pkg = s.activeRoomPackage;
  const { dht11_temp: t, dht11_humi: h, cds_light: l } = s.sensors;
  return {
    temperature: roomUsesDevice(pkg, 'dht11') && !t.isStale ? t.value : undefined,
    humidity: roomUsesDevice(pkg, 'dht11') && !h.isStale ? h.value : undefined,
    light: roomUsesDevice(pkg, 'cds') && !l.isStale ? l.value : undefined,
  };
}

// RGB 색 명령이 끝난 뒤 켜기/끄기 (스토어는 명령 대기 중이면 새 명령을 받지 않음)
function afterRgbIdle(fn: () => void, waited = 0): void {
  if (!useIoTStore.getState().actuators.rgb_light.pending || waited > 3000) fn();
  else setTimeout(() => afterRgbIdle(fn, waited + 100), 100);
}

/** 규칙 하나 실행. 이 공간에 필요한 장치가 없으면 실행하지 않고 이유를 돌려줌 */
export function runRule(rule: AutomationRule, reason: 'auto' | 'test' = 'auto'): { ok: boolean; message: string } {
  const iot = useIoTStore.getState();
  const missing = missingDevices(rule, iot.activeRoomPackage);
  if (missing.length) {
    return { ok: false, message: `이 공간에는 ${missing.join(' · ')} 이(가) 없어 "${rule.title}" 규칙을 건너뜁니다.` };
  }
  let approvalRequested = false;
  const text = rule.run({
    snapshot: snapshot(),
    has: (d) => roomUsesDevice(iot.activeRoomPackage, d),
    servoName: iot.servoName,
    setServo: (angle) => {
      markAutomation('sg90');
      iot.setServoAngle(angle);
    },
    setRgb: (color, state) => {
      markAutomation('rgb');
      if (color) {
        iot.setRgbColor(color);
        if (useIoTStore.getState().actuators.rgb_light.reportedState !== state) {
          afterRgbIdle(() => {
            markAutomation('rgb');
            useIoTStore.getState().setRgbState(state);
          });
        }
      } else {
        iot.setRgbState(state);
      }
    },
    requestApproval: (message) => {
      approvalRequested = true;
      useAutomationStore.getState().requestApproval(message, rule.id);
      announce('approval', `사용자 확인이 필요합니다. ${message}`);
    },
  });
  useAutomationStore.getState().markRun(rule.id);
  iot.addLog('info', `[자동화${reason === 'test' ? ' 테스트' : ''}] ${rule.title}: ${text}`, 'SYSTEM');
  // 승인 요청은 '승인' 항목으로 이미 안내함
  if (!approvalRequested) announce('automation', `자동화 규칙, ${rule.title}. ${text}`);
  return { ok: true, message: text };
}

/** 설정 창 [테스트 실행]: 조건과 관계없이 지금 실행 (장치 검사는 함) */
export function runRuleNow(id: string): { ok: boolean; message: string } {
  const rule = AUTOMATION_RULES.find((r) => r.id === id);
  if (!rule) return { ok: false, message: '규칙을 찾을 수 없습니다.' };
  return runRule(rule, 'test');
}

export function useAutomationEngine(): void {
  useEffect(() => {
    // 공간이 바뀌면 조건 상태를 새로 시작 (이전 공간의 '참' 상태가 남지 않도록)
    const unsubscribe = useIoTStore.subscribe((s, prev) => {
      if (s.activeRoomPackage?.meta.id !== prev.activeRoomPackage?.meta.id) armed.clear();
    });

    const timer = setInterval(() => {
      const { active } = useAutomationStore.getState();
      const pkg = useIoTStore.getState().activeRoomPackage;
      const snap = snapshot();
      const now = new Date();
      AUTOMATION_RULES.forEach((rule) => {
        if (!active[rule.id] || missingDevices(rule, pkg).length) return;
        if (rule.kind === 'sensor') {
          if (shouldFire(rule, snap, armed)) runRule(rule);
        } else if (isTimeDue(rule, now, lastRunDay.get(rule.id))) {
          lastRunDay.set(rule.id, now.toDateString());
          runRule(rule);
        }
      });
    }, 2000);

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);
}
