// 학생용 플랫폼 SDK: 업로드한 Scene.tsx 에서 `import { ... } from '@/core/sdk'` 로 사용합니다.
// 기본 4종 장치(DHT11 · Cds · SG90 · RGB LED)와 팀 확장 센서/명령을 한 곳에서 다룹니다.
import { useIoTStore } from '../store/useIoTStore';
import { CustomCommand, SensorData } from '../types/iot';

export type BaseSensorId = 'dht11_temp' | 'dht11_humi' | 'cds_light';

/** 기본 센서 값 (dht11_temp: ℃, dht11_humi: %, cds_light: 0~65535 ADC) */
export function useSensor(id: BaseSensorId): SensorData {
  return useIoTStore((s) => s.sensors[id]);
}

/** 팀 확장 센서 값 (room.json customSensors 의 key). 아직 값이 없으면 undefined */
export function useCustomSensor(key: string): SensorData | undefined {
  return useIoTStore((s) => s.customSensors[key]);
}

/** 확장 센서 숫자 값만 필요할 때: 값이 없으면 fallback */
export function useCustomValue(key: string, fallback = 0): number {
  return useIoTStore((s) => s.customSensors[key]?.value ?? fallback);
}

/** SG90 서보 (0~180°) */
export function useServo() {
  const angle = useIoTStore((s) => s.actuators.sg90_door.reportedAngle);
  const targetAngle = useIoTStore((s) => s.actuators.sg90_door.targetAngle);
  const pending = useIoTStore((s) => s.actuators.sg90_door.pending);
  const setAngle = useIoTStore((s) => s.setServoAngle);
  return { angle, targetAngle, pending, setAngle };
}

/** RGB LED (color: "#RRGGBB", on: 켜짐 여부) */
export function useRgb() {
  const color = useIoTStore((s) => s.actuators.rgb_light.reportedColor);
  const state = useIoTStore((s) => s.actuators.rgb_light.reportedState);
  const pending = useIoTStore((s) => s.actuators.rgb_light.pending);
  const setColor = useIoTStore((s) => s.setRgbColor);
  const setState = useIoTStore((s) => s.setRgbState);
  return { color, on: state === 'ON', pending, setColor, setOn: (on: boolean) => setState(on ? 'ON' : 'OFF') };
}

/** 팀 확장 명령 전송 → 시뮬레이션: mock.js onCommand / 하드웨어: Pico POST /api/command → 팀 모듈 handle() */
export function sendCommand(action: string, value: CustomCommand['value'] = true): void {
  useIoTStore.getState().sendCommand(action, value);
}

/** 현재 모드 ('simulation' | 'hardware') */
export function usePlatformMode() {
  return useIoTStore((s) => s.mode);
}
