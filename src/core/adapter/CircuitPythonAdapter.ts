import { IIoTAdapter } from './IIoTAdapter';
import { useIoTStore } from '../store/useIoTStore';
import { CustomCommand } from '../types/iot';

export class CircuitPythonAdapter implements IIoTAdapter {
  private pollInterval: NodeJS.Timeout | null = null;
  private staleCheckInterval: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private isFetching = false;
  private isDestroyed = false;

  init(): void {
    this.isDestroyed = false;
    const store = useIoTStore.getState();
    const cleanIp = (store.picoIpAddress || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    store.setConnectionState('connecting');
    store.addLog('info', `Pico 2 W (${cleanIp || 'IP 미지정'}) 연결 시도 중...`, 'PICO_2W');

    // 1.5초마다 Pico 2 W 상태 폴링
    this.pollInterval = setInterval(() => {
      if (this.isDestroyed || useIoTStore.getState().mode !== 'hardware') return;
      this.fetchPicoStatus();
    }, 1500);

    // 5초마다 미수신 센서 stale 검사
    this.staleCheckInterval = setInterval(() => {
      if (this.isDestroyed) return;
      useIoTStore.getState().checkStaleSensors();
    }, 5000);

    // 즉시 1회 호출
    this.fetchPicoStatus();
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.staleCheckInterval) clearInterval(this.staleCheckInterval);
    if (this.abortController) this.abortController.abort();
    this.isFetching = false;
  }

  private async fetchPicoStatus(): Promise<void> {
    if (this.isFetching || this.isDestroyed) return;
    this.isFetching = true;

    const store = useIoTStore.getState();
    const rawIp = store.picoIpAddress;
    if (!rawIp) {
      if (store.connectionState !== 'disconnected') {
        store.setConnectionState('disconnected');
      }
      this.isFetching = false;
      return;
    }
    const ip = rawIp.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();

    try {
      this.abortController = new AbortController();
      const timeoutId = setTimeout(() => this.abortController?.abort(), 2000);

      // 1차 시도: 브라우저 직접 fetch (CORS 지원 Pico HTTP Server)
      let res: Response;
      try {
        res = await fetch(`http://${ip}/api/status`, {
          signal: this.abortController.signal,
          mode: 'cors',
        });
      } catch {
        // 2차 시도: Next.js 프록시 우회
        res = await fetch(`/api/pico/status?target=${encodeURIComponent(ip)}`, {
          signal: this.abortController.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      if (store.connectionState !== 'connected') {
        store.setConnectionState('connected');
        store.addLog('success', `Pico 2 W 연결 성공! (IP: ${ip})`, 'PICO_2W');
      }

      // 센서 데이터 갱신
      if (typeof data.temperature === 'number') store.updateSensor('dht11_temp', data.temperature);
      if (typeof data.humidity === 'number') store.updateSensor('dht11_humi', data.humidity);
      
      const lightVal = typeof data.light_adc === 'number' ? data.light_adc : (typeof data.light_raw === 'number' ? data.light_raw : null);
      if (lightVal !== null) store.updateSensor('cds_light', lightVal);

      // 액추에이터 reported 상태 갱신 (pending이 아닐 때만)
      if (!store.actuators.sg90_door.pending && typeof data.servo_angle === 'number') {
        store.confirmServoAck(data.servo_angle);
      }
      if (!store.actuators.rgb_light.pending && data.rgb_color && data.rgb_state) {
        store.confirmRgbAck(data.rgb_color, data.rgb_state);
      }

      // 팀 확장 센서: 통합 펌웨어는 { rooms: { 공간ID: {...} }, custom: {...전체 병합} } 를 반환
      const roomId = useIoTStore.getState().activeRoomPackage?.meta.id;
      const customValues =
        roomId && data.rooms && typeof data.rooms[roomId] === 'object' ? data.rooms[roomId] : data.custom;
      if (customValues && typeof customValues === 'object') {
        Object.entries(customValues as Record<string, unknown>).forEach(([key, value]) => {
          if (typeof value === 'number' && Number.isFinite(value)) store.updateCustomSensor(key, value);
          else if (typeof value === 'boolean') store.updateCustomSensor(key, value ? 1 : 0);
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '통신 오류';
      if (store.connectionState !== 'error') {
        store.setConnectionState('error');
        store.addLog('warn', `Pico 2 W 연결 실패 또는 응답 없음 (${message})`, 'PICO_2W');
      }
    } finally {
      this.isFetching = false;
    }
  }

  async sendServoCommand(angle: number): Promise<boolean> {
    const store = useIoTStore.getState();
    const rawIp = store.picoIpAddress;
    if (!rawIp) {
      store.failCommand('sg90_door', 'Pico 2 W IP 주소가 지정되지 않았습니다.');
      return false;
    }
    const ip = rawIp.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      let res: Response;
      try {
        res = await fetch(`http://${ip}/api/servo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ angle }),
          signal: controller.signal,
          mode: 'cors',
        });
      } catch {
        res = await fetch(`/api/pico/servo?target=${encodeURIComponent(ip)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ angle }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // 연결하지 않은 장치 등 펌웨어가 거부하면 { success: false, error } 로 응답
      const ack = await res.json().catch(() => ({}));
      if (ack && ack.success === false) throw new Error(ack.error || 'Pico 가 명령을 거부했습니다.');

      store.confirmServoAck(angle);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '명령 전송 실패';
      store.failCommand('sg90_door', msg);
      return false;
    }
  }

  async sendRgbCommand(color: string, state: 'ON' | 'OFF'): Promise<boolean> {
    const store = useIoTStore.getState();
    const rawIp = store.picoIpAddress;
    if (!rawIp) {
      store.failCommand('rgb_light', 'Pico 2 W IP 주소가 지정되지 않았습니다.');
      return false;
    }
    const ip = rawIp.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      let res: Response;
      try {
        res = await fetch(`http://${ip}/api/rgb`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color, state }),
          signal: controller.signal,
          mode: 'cors',
        });
      } catch {
        res = await fetch(`/api/pico/rgb?target=${encodeURIComponent(ip)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color, state }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ack = await res.json().catch(() => ({}));
      if (ack && ack.success === false) throw new Error(ack.error || 'Pico 가 명령을 거부했습니다.');

      store.confirmRgbAck(color, state);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '명령 전송 실패';
      store.failCommand('rgb_light', msg);
      return false;
    }
  }

  async sendCommand(command: CustomCommand): Promise<boolean> {
    const store = useIoTStore.getState();
    const rawIp = store.picoIpAddress;
    if (!rawIp) {
      store.addLog('error', 'Pico 2 W IP 주소가 지정되지 않았습니다.', 'PICO_2W');
      return false;
    }
    const ip = rawIp.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    const body = JSON.stringify({ room: command.roomId, action: command.action, value: command.value });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      let res: Response;
      try {
        res = await fetch(`http://${ip}/api/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
          mode: 'cors',
        });
      } catch {
        res = await fetch(`/api/pico/command?target=${encodeURIComponent(ip)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });
      }

      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      if (data && data.success === false) throw new Error(data.error || '팀 모듈 처리 실패');

      store.addLog('success', `확장 명령 처리 완료: ${command.action}`, 'PICO_2W');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '명령 전송 실패';
      store.addLog('error', `확장 명령 실패 (${command.action}): ${msg}`, 'PICO_2W');
      return false;
    }
  }
}
