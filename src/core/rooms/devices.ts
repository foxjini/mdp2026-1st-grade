// 공간별 장치 구성 도우미 (순수 함수: 스토어 · 패널에서 함께 사용)
import { BaseDeviceId, CustomSensorDef, RoomPackage, SensorData } from '../types/iot';

/** 이 공간의 Pico 에 연결된 기본 장치인가 (기본 예제 공간 = 4종 모두) */
export function roomUsesDevice(pkg: RoomPackage | null, id: BaseDeviceId): boolean {
  return !pkg || pkg.meta.baseDevices.includes(id);
}

export interface CustomSensorView {
  text: string;      // 화면 표시 값 ('--' = 수신 대기)
  stale: boolean;
  warn: boolean;
  ratio: number;     // 게이지 0~100
  isState: boolean;  // 0/1 상태값 (예: pump_on)
}

/** 확장 센서 표시 값: 범위 0~1 은 켜짐/꺼짐, 경고 기준(minWarning/maxWarning) 반영 */
export function describeCustom(def: CustomSensorDef, sensor?: SensorData): CustomSensorView {
  const min = def.min ?? 0;
  const max = def.max ?? 100;
  const isState = min === 0 && max === 1;
  const stale = !sensor || sensor.isStale;
  const value = sensor?.value ?? min;
  const warn =
    !stale &&
    ((def.minWarning !== undefined && value < def.minWarning) || (def.maxWarning !== undefined && value > def.maxWarning));
  const text = stale
    ? '--'
    : isState
      ? value >= 0.5 ? '켜짐' : '꺼짐'
      : `${Number(value.toFixed(2))}${def.unit ? ` ${def.unit}` : ''}`;
  const ratio = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  return { text, stale, warn, ratio, isState };
}

/** 기본 센서 상태: 수신 대기 / 경고 범위 / 정상 범위 */
export function baseSensorStatus(sensor: SensorData): 'stale' | 'warn' | 'ok' {
  if (sensor.isStale) return 'stale';
  if (
    (sensor.minWarning !== undefined && sensor.value < sensor.minWarning) ||
    (sensor.maxWarning !== undefined && sensor.value > sensor.maxWarning)
  ) {
    return 'warn';
  }
  return 'ok';
}
