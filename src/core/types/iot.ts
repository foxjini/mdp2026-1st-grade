export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';
export type PlatformMode = 'simulation' | 'hardware';

export interface SensorData {
  deviceId: string;
  name: string;
  value: number;
  unit: string;
  updatedAt: number;     // ms timestamp
  isStale: boolean;       // true if not updated for > 10s
  minWarning?: number;
  maxWarning?: number;
}

export interface ServoActuatorData {
  deviceId: string;
  name: string;
  targetAngle: number;    // 0 ~ 180 degrees
  reportedAngle: number;  // 0 ~ 180 degrees
  pending: boolean;
  lastCommandAt?: number;
  errorMessage?: string;
}

export interface RgbActuatorData {
  deviceId: string;
  name: string;
  targetColor: string;    // Hex code, e.g. "#FF5500"
  reportedColor: string;
  targetState: 'ON' | 'OFF';
  reportedState: 'ON' | 'OFF';
  pending: boolean;
  lastCommandAt?: number;
  errorMessage?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
  source: 'SYSTEM' | 'MOCK' | 'PICO_2W' | 'USER';
}

// ------------------------------------------------------------------------------
// 공간 꾸러미 (Room Package): 팀별 공간 = room.json + Scene.tsx + mock.js + code.py
// ------------------------------------------------------------------------------
export type RoomIconType = 'home' | 'farm' | 'factory' | 'sparkles' | 'shield';

export const ROOM_FILE_NAMES = ['room.json', 'Scene.tsx', 'mock.js', 'code.py'] as const;
export type RoomFileName = (typeof ROOM_FILE_NAMES)[number];

// 팀이 추가한 확장 센서 정의 (Pico /api/status 의 custom.{key} 값과 연결)
export interface CustomSensorDef {
  key: string;            // 예: "soil_moisture" (영문 소문자/숫자/_)
  name: string;           // 예: "토양 수분"
  unit: string;           // 예: "%"
  min?: number;           // 게이지 최소값 (기본 0)
  max?: number;           // 게이지 최대값 (기본 100)
  minWarning?: number;
  maxWarning?: number;
}

// room.json 내용
export interface RoomMeta {
  id: string;
  name: string;
  team: string;
  iconType: RoomIconType;
  sensorsDesc: string;
  customSensors: CustomSensorDef[];
  pins: string[];         // 팀이 추가로 사용하는 Pico 핀 (예: ["GP27"])
  hasNotification?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RoomPackage {
  meta: RoomMeta;
  files: Partial<Record<Exclude<RoomFileName, 'room.json'>, string>>;
  warnings: string[];     // 핀 충돌 등 서버 검사 경고
}

// 팀 확장 액추에이터 명령 (POST /api/command)
export interface CustomCommand {
  id: string;
  roomId: string;
  action: string;
  value: number | string | boolean;
}

export interface IoTPlatformState {
  mode: PlatformMode;
  connectionState: ConnectionState;
  picoIpAddress: string;
  selectedDeviceId: string | null;
  isExhibitionMode: boolean;
  isAutoRotate: boolean;

  // Sensors
  sensors: {
    dht11_temp: SensorData;
    dht11_humi: SensorData;
    cds_light: SensorData;
  };

  // Actuators
  actuators: {
    sg90_door: ServoActuatorData;
    rgb_light: RgbActuatorData;
  };

  // 팀 확장 센서 (현재 공간의 room.json customSensors 기준)
  customSensors: Record<string, SensorData>;
  // 현재 선택된 업로드 공간 꾸러미 (기본 예제 공간이면 null)
  activeRoomPackage: RoomPackage | null;
  // 마지막 확장 명령 (IoTProvider가 감지하여 어댑터로 전달)
  lastCommand: CustomCommand | null;

  // System Logs
  logs: LogEntry[];

  // Actions
  setMode: (mode: PlatformMode) => void;
  setPicoIpAddress: (ip: string) => void;
  setConnectionState: (state: ConnectionState) => void;
  setSelectedDevice: (deviceId: string | null) => void;
  setExhibitionMode: (enabled: boolean) => void;
  setAutoRotate: (enabled: boolean) => void;

  updateSensor: (id: 'dht11_temp' | 'dht11_humi' | 'cds_light', value: number) => void;
  setServoAngle: (angle: number) => Promise<boolean>;
  setRgbColor: (color: string) => Promise<boolean>;
  setRgbState: (state: 'ON' | 'OFF') => Promise<boolean>;

  confirmServoAck: (angle: number) => void;
  confirmRgbAck: (color: string, state: 'ON' | 'OFF') => void;
  failCommand: (actuatorId: 'sg90_door' | 'rgb_light', errorMessage: string) => void;

  setActiveRoomPackage: (pkg: RoomPackage | null) => void;
  updateCustomSensor: (key: string, value: number) => void;
  sendCommand: (action: string, value: CustomCommand['value']) => void;

  addLog: (type: LogEntry['type'], message: string, source?: LogEntry['source']) => void;
  clearLogs: () => void;
  checkStaleSensors: () => void;
}
