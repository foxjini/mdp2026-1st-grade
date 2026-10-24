import { IIoTAdapter } from './IIoTAdapter';
import { useIoTStore } from '../store/useIoTStore';
import { CustomCommand, RoomPackage } from '../types/iot';
import { compileMock, splitMockValues, MockState, TeamMock } from '../runtime/mockRuntime';

export class MockIoTAdapter implements IIoTAdapter {
  private sensorInterval: NodeJS.Timeout | null = null;
  private staleCheckInterval: NodeJS.Timeout | null = null;
  private unsubscribeRoom: (() => void) | null = null;
  private teamMock: TeamMock | null = null;
  private teamMockRoomId: string | null = null;
  private startedAt = Date.now();

  init(): void {
    const store = useIoTStore.getState();
    store.setConnectionState('connected');
    store.addLog('info', 'Mock IoT 시뮬레이터 연결됨 (가상 센서 활성화)', 'MOCK');

    // 2초마다 DHT11 온습도 및 조도 센서값 시뮬레이션
    this.sensorInterval = setInterval(() => {
      if (useIoTStore.getState().mode !== 'simulation') return;

      const currentTemp = useIoTStore.getState().sensors.dht11_temp.value;
      const currentHumi = useIoTStore.getState().sensors.dht11_humi.value;
      const currentLight = useIoTStore.getState().sensors.cds_light.value;

      // 자연스러운 변동 (Random Walk)
      const tempDelta = (Math.random() - 0.48) * 0.4;
      const humiDelta = (Math.random() - 0.49) * 0.8;
      const lightDelta = Math.floor((Math.random() - 0.5) * 1200);

      const newTemp = Math.round(Math.min(32, Math.max(18, currentTemp + tempDelta)) * 10) / 10;
      const newHumi = Math.round(Math.min(75, Math.max(30, currentHumi + humiDelta)) * 10) / 10;
      const newLight = Math.min(62000, Math.max(15000, currentLight + lightDelta));

      useIoTStore.getState().updateSensor('dht11_temp', newTemp);
      useIoTStore.getState().updateSensor('dht11_humi', newHumi);
      useIoTStore.getState().updateSensor('cds_light', newLight);

      // 팀 mock.js 확장 센서 값 생성
      this.runTeamTick();
    }, 2000);

    // 공간이 바뀌거나 mock.js가 새로 업로드되면 다시 로드
    this.loadTeamMock(store.activeRoomPackage);
    this.unsubscribeRoom = useIoTStore.subscribe((state, prev) => {
      if (state.activeRoomPackage !== prev.activeRoomPackage) {
        this.loadTeamMock(state.activeRoomPackage);
      }
    });

    // 5초마다 Stale 센서 체크
    this.staleCheckInterval = setInterval(() => {
      useIoTStore.getState().checkStaleSensors();
    }, 5000);
  }

  destroy(): void {
    if (this.sensorInterval) clearInterval(this.sensorInterval);
    if (this.staleCheckInterval) clearInterval(this.staleCheckInterval);
    if (this.unsubscribeRoom) this.unsubscribeRoom();
    this.teamMock = null;
  }

  private loadTeamMock(pkg: RoomPackage | null): void {
    const source = pkg?.files['mock.js'];
    this.teamMock = null;
    this.teamMockRoomId = pkg?.meta.id || null;
    if (!pkg || !source) return;
    try {
      this.teamMock = compileMock(source);
      useIoTStore.getState().addLog('success', `[${pkg.meta.name}] mock.js 로드 완료`, 'MOCK');
      this.runTeamTick();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      useIoTStore.getState().addLog('error', `[${pkg.meta.name}] mock.js 오류: ${msg}`, 'MOCK');
    }
  }

  private buildMockState(): MockState {
    const s = useIoTStore.getState();
    const custom: Record<string, number> = {};
    Object.entries(s.customSensors).forEach(([k, v]) => (custom[k] = v.value));
    return {
      t: (Date.now() - this.startedAt) / 1000,
      base: {
        temperature: s.sensors.dht11_temp.value,
        humidity: s.sensors.dht11_humi.value,
        light: s.sensors.cds_light.value,
        servoAngle: s.actuators.sg90_door.reportedAngle,
        rgbColor: s.actuators.rgb_light.reportedColor,
        rgbState: s.actuators.rgb_light.reportedState,
      },
      custom,
    };
  }

  private applyValues(values: unknown): void {
    const store = useIoTStore.getState();
    const { custom, base } = splitMockValues(values);
    Object.entries(custom).forEach(([key, value]) => {
      store.updateCustomSensor(key, value);
    });
    // mock.js 가 servo_angle / rgb_color / rgb_state 를 돌려주면 code.py 처럼 기본 장치도 움직임
    if (base.servo_angle !== undefined || base.rgb_color !== undefined || base.rgb_state !== undefined) {
      store.syncReportedActuators(
        { servoAngle: base.servo_angle, rgbColor: base.rgb_color, rgbState: base.rgb_state },
        'MOCK'
      );
    }
  }

  private runTeamTick(): void {
    const mock = this.teamMock;
    if (!mock?.tick) return;
    try {
      this.applyValues(mock.tick(this.buildMockState()));
    } catch (err: unknown) {
      // mock.js 런타임 오류는 기록만 하고 기본 시뮬레이션은 계속 진행
      const msg = err instanceof Error ? err.message : String(err);
      useIoTStore.getState().addLog('error', `mock.js tick() 오류: ${msg}`, 'MOCK');
      this.teamMock = null;
    }
  }

  async sendCommand(command: CustomCommand): Promise<boolean> {
    const store = useIoTStore.getState();
    const mock = this.teamMock;
    await new Promise((r) => setTimeout(r, 200));
    if (!mock?.onCommand || command.roomId !== this.teamMockRoomId) {
      store.addLog('warn', `mock.js에 onCommand가 없어 "${command.action}" 명령을 무시했습니다.`, 'MOCK');
      return false;
    }
    try {
      this.applyValues(mock.onCommand(command.action, command.value, this.buildMockState()));
      store.addLog('success', `확장 명령 처리 완료: ${command.action}`, 'MOCK');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      store.addLog('error', `mock.js onCommand() 오류: ${msg}`, 'MOCK');
      return false;
    }
  }

  async sendServoCommand(angle: number): Promise<boolean> {
    const store = useIoTStore.getState();
    return new Promise((resolve) => {
      setTimeout(() => {
        store.confirmServoAck(angle);
        resolve(true);
      }, 350); // 350ms 후 모터 회전 완료 시뮬레이션
    });
  }

  async sendRgbCommand(color: string, state: 'ON' | 'OFF'): Promise<boolean> {
    const store = useIoTStore.getState();
    return new Promise((resolve) => {
      setTimeout(() => {
        store.confirmRgbAck(color, state);
        resolve(true);
      }, 200); // 200ms 후 조명 갱신 완료
    });
  }
}
