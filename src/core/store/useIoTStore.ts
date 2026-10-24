import { create } from 'zustand';
import { IoTPlatformState, LogEntry, SensorData } from '../types/iot';

export const useIoTStore = create<IoTPlatformState>((set, get) => ({
  mode: 'simulation',
  connectionState: 'connected',
  picoIpAddress: '192.168.1.100',
  selectedDeviceId: null,
  isExhibitionMode: false,
  isAutoRotate: false,

  sensors: {
    dht11_temp: {
      deviceId: 'dht11_temp',
      name: '실내 온도 (DHT11)',
      value: 24.2,
      unit: '℃',
      updatedAt: Date.now(),
      isStale: false,
      minWarning: 15,
      maxWarning: 30,
    },
    dht11_humi: {
      deviceId: 'dht11_humi',
      name: '실내 습도 (DHT11)',
      value: 48.0,
      unit: '%',
      updatedAt: Date.now(),
      isStale: false,
      minWarning: 30,
      maxWarning: 70,
    },
    cds_light: {
      deviceId: 'cds_light',
      name: '조도 센서 (Cds)',
      value: 38200,
      unit: 'ADC',
      updatedAt: Date.now(),
      isStale: false,
    },
  },

  actuators: {
    sg90_door: {
      deviceId: 'sg90_door',
      name: '스마트 도어 서보 (SG90)',
      targetAngle: 0,
      reportedAngle: 0,
      pending: false,
    },
    rgb_light: {
      deviceId: 'rgb_light',
      name: '실내 무드등 (RGB LED)',
      targetColor: '#3B82F6',
      reportedColor: '#3B82F6',
      targetState: 'ON',
      reportedState: 'ON',
      pending: false,
    },
  },

  customSensors: {},
  activeRoomPackage: null,
  lastCommand: null,

  logs: [
    {
      id: 'log-init-1',
      timestamp: Date.now(),
      type: 'info',
      message: '스마트홈 3D IoT 플랫폼 초기화 완료',
      source: 'SYSTEM',
    },
    {
      id: 'log-init-2',
      timestamp: Date.now() + 100,
      type: 'success',
      message: '시뮬레이션 모드 활성화 (DHT11, Cds, SG90, RGB LED 준비됨)',
      source: 'MOCK',
    },
  ],

  setMode: (mode) => {
    set({ mode });
    get().addLog(
      'info',
      mode === 'simulation'
        ? '시뮬레이션 모드로 전환되었습니다.'
        : `하드웨어 모드로 전환되었습니다 (대상: ${get().picoIpAddress})`,
      'SYSTEM'
    );
  },

  setPicoIpAddress: (ip) => set({ picoIpAddress: ip }),
  setConnectionState: (state) => set({ connectionState: state }),
  setSelectedDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
  setExhibitionMode: (enabled) => set({ isExhibitionMode: enabled }),
  setAutoRotate: (enabled) => set({ isAutoRotate: enabled }),

  updateSensor: (id, value) => {
    set((state) => ({
      sensors: {
        ...state.sensors,
        [id]: {
          ...state.sensors[id],
          value,
          updatedAt: Date.now(),
          isStale: false,
        },
      },
    }));
  },

  setServoAngle: async (angle) => {
    const current = get().actuators.sg90_door;
    if (current.pending) return false;

    set((state) => ({
      actuators: {
        ...state.actuators,
        sg90_door: {
          ...state.actuators.sg90_door,
          targetAngle: angle,
          pending: true,
          lastCommandAt: Date.now(),
          errorMessage: undefined,
        },
      },
    }));

    get().addLog(
      'info',
      `서보모터(SG90) 각도 명령 전송: ${angle}° (확인 대기 중...)`,
      get().mode === 'simulation' ? 'MOCK' : 'USER'
    );
    return true;
  },

  confirmServoAck: (angle) => {
    set((state) => ({
      actuators: {
        ...state.actuators,
        sg90_door: {
          ...state.actuators.sg90_door,
          reportedAngle: angle,
          pending: false,
        },
      },
    }));
    get().addLog('success', `서보모터(SG90) 회전 완료 확인: ${angle}°`, 'SYSTEM');
  },

  setRgbColor: async (color) => {
    const current = get().actuators.rgb_light;
    if (current.pending) return false;

    set((state) => ({
      actuators: {
        ...state.actuators,
        rgb_light: {
          ...state.actuators.rgb_light,
          targetColor: color,
          pending: true,
          lastCommandAt: Date.now(),
          errorMessage: undefined,
        },
      },
    }));

    get().addLog('info', `RGB LED 색상 변경 명령 전송: ${color}`, 'USER');
    return true;
  },

  setRgbState: async (targetState) => {
    const current = get().actuators.rgb_light;
    if (current.pending) return false;

    set((state) => ({
      actuators: {
        ...state.actuators,
        rgb_light: {
          ...state.actuators.rgb_light,
          targetState,
          pending: true,
          lastCommandAt: Date.now(),
          errorMessage: undefined,
        },
      },
    }));

    get().addLog('info', `RGB LED 전원 토글 명령 전송: ${targetState}`, 'USER');
    return true;
  },

  confirmRgbAck: (color, state) => {
    set((prev) => ({
      actuators: {
        ...prev.actuators,
        rgb_light: {
          ...prev.actuators.rgb_light,
          reportedColor: color,
          reportedState: state,
          pending: false,
        },
      },
    }));
    get().addLog('success', `RGB LED 설정 완료 확인: ${color} [${state}]`, 'SYSTEM');
  },

  failCommand: (actuatorId, errorMessage) => {
    set((prev) => {
      const actuator = prev.actuators[actuatorId];
      if (actuatorId === 'sg90_door') {
        const door = actuator as IoTPlatformState['actuators']['sg90_door'];
        return {
          actuators: {
            ...prev.actuators,
            sg90_door: {
              ...door,
              targetAngle: door.reportedAngle, // 롤백
              pending: false,
              errorMessage,
            },
          },
        };
      } else {
        const light = actuator as IoTPlatformState['actuators']['rgb_light'];
        return {
          actuators: {
            ...prev.actuators,
            rgb_light: {
              ...light,
              targetColor: light.reportedColor, // 롤백
              targetState: light.reportedState, // 롤백
              pending: false,
              errorMessage,
            },
          },
        };
      }
    });
    get().addLog('error', `명령 실패 (${actuatorId}): ${errorMessage}`, 'SYSTEM');
  },

  setActiveRoomPackage: (pkg) => {
    // 공간이 바뀌면 확장 센서 목록을 room.json 정의대로 초기화 (이전 값은 같은 key면 유지)
    set((state) => {
      const next: Record<string, SensorData> = {};
      (pkg?.meta.customSensors || []).forEach((def) => {
        const prev = state.customSensors[def.key];
        next[def.key] = {
          deviceId: def.key,
          name: def.name,
          value: prev ? prev.value : def.min ?? 0,
          unit: def.unit,
          updatedAt: prev ? prev.updatedAt : 0,
          isStale: prev ? prev.isStale : true,
          minWarning: def.minWarning,
          maxWarning: def.maxWarning,
        };
      });
      return { activeRoomPackage: pkg, customSensors: next };
    });
  },

  updateCustomSensor: (key, value) => {
    set((state) => {
      const prev = state.customSensors[key];
      return {
        customSensors: {
          ...state.customSensors,
          [key]: {
            deviceId: key,
            name: prev?.name || key,
            unit: prev?.unit || '',
            minWarning: prev?.minWarning,
            maxWarning: prev?.maxWarning,
            value,
            updatedAt: Date.now(),
            isStale: false,
          },
        },
      };
    });
  },

  sendCommand: (action, value) => {
    const roomId = get().activeRoomPackage?.meta.id || 'builtin';
    set({
      lastCommand: {
        id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomId,
        action,
        value,
      },
    });
    get().addLog('info', `확장 명령 전송: ${action} = ${String(value)} (${roomId})`, 'USER');
  },

  addLog: (type, message, source = 'SYSTEM') => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      type,
      message,
      source,
    };
    set((state) => ({
      logs: [newEntry, ...state.logs.slice(0, 49)], // 최근 50개 유지
    }));
  },

  clearLogs: () => set({ logs: [] }),

  checkStaleSensors: () => {
    const now = Date.now();
    const staleThreshold = 10000; // 10초
    set((state) => {
      const updatedSensors = { ...state.sensors };
      let changed = false;

      (Object.keys(updatedSensors) as Array<keyof typeof updatedSensors>).forEach((key) => {
        const sensor = updatedSensors[key];
        const isStale = now - sensor.updatedAt > staleThreshold;
        if (sensor.isStale !== isStale) {
          updatedSensors[key] = { ...sensor, isStale };
          changed = true;
        }
      });

      const updatedCustom = { ...state.customSensors };
      Object.keys(updatedCustom).forEach((key) => {
        const sensor = updatedCustom[key];
        const isStale = now - sensor.updatedAt > staleThreshold;
        if (sensor.isStale !== isStale) {
          updatedCustom[key] = { ...sensor, isStale };
          changed = true;
        }
      });

      return changed ? { sensors: updatedSensors, customSensors: updatedCustom } : state;
    });
  },
}));
