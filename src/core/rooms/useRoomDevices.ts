// 현재 공간에서 사용하는 기본 장치 · 확장 센서 (오른쪽 패널 · 오버레이 공용)
import { useIoTStore } from '../store/useIoTStore';
import { roomUsesDevice } from './devices';

export function useRoomDevices() {
  const pkg = useIoTStore((s) => s.activeRoomPackage);
  return {
    isUploaded: !!pkg,
    dht11: roomUsesDevice(pkg, 'dht11'),
    cds: roomUsesDevice(pkg, 'cds'),
    sg90: roomUsesDevice(pkg, 'sg90'),
    rgb: roomUsesDevice(pkg, 'rgb'),
    customDefs: pkg?.meta.customSensors || [],
  };
}
