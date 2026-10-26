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
export type RoomIconType =
  | 'home' | 'farm' | 'factory' | 'sparkles' | 'shield'
  | 'school' | 'car' | 'health' | 'pet' | 'energy';

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

// 기본 장치 4종 중 공간(팀 Pico)이 실제로 연결해 사용하는 장치
export const BASE_DEVICE_IDS = ['dht11', 'cds', 'sg90', 'rgb'] as const;
export type BaseDeviceId = (typeof BASE_DEVICE_IDS)[number];

export const BASE_DEVICE_INFO: Record<BaseDeviceId, { name: string; pins: string[] }> = {
  dht11: { name: 'DHT11 온습도', pins: ['GP15'] },
  cds: { name: 'Cds 조도', pins: ['GP26'] },
  sg90: { name: 'SG90 서보', pins: ['GP16'] },
  rgb: { name: 'RGB LED', pins: ['GP18', 'GP19', 'GP20'] },
};

// 공간별 Pico 2 W 연결 설정 (공간을 선택하면 이 설정으로 자동 연결)
export interface RoomConnection {
  picoIp: string;         // 예: "192.168.0.51" (빈 값 = 미지정)
  mode: PlatformMode;     // 'simulation' | 'hardware'
}

// room.json 내용
export interface RoomMeta extends RoomConnection {
  id: string;
  name: string;
  team: string;
  iconType: RoomIconType;
  sensorsDesc: string;
  baseDevices: BaseDeviceId[];
  customSensors: CustomSensorDef[];
  pins: string[];         // 팀이 추가로 사용하는 Pico 핀 (예: ["GP27"])
  hasNotification?: boolean;
  roomJsonUploadedAt?: number; // 팀이 room.json 파일을 직접 업로드한 시각 (없으면 '새 공간 추가' 기본값)
  example?: boolean;      // 플랫폼 기본 예제 꾸러미 공간 (context/examples 에서 자동 생성, 수정 · 삭제 불가 · 복제 가능)
  exampleHash?: string;   // 예제 원본 파일 내용 해시 (원본이 바뀌면 자동 갱신)
  createdAt: number;
  updatedAt: number;
}

export interface RoomPackage {
  meta: RoomMeta;
  files: Partial<Record<Exclude<RoomFileName, 'room.json'>, string>>;
  warnings: string[];     // 핀 충돌 · IP 중복 등 서버 검사 경고
}

// 팀 확장 액추에이터 명령 (POST /api/command)
export interface CustomCommand {
  id: string;
  roomId: string;
  action: string;
  value: number | string | boolean;
}

// 확장 명령 처리 결과 (시뮬레이션: mock.js onCommand / 하드웨어: code.py handle)
export interface CustomCommandResult extends CustomCommand {
  ok: boolean;
  at: number;
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
  lastCommandResult: CustomCommandResult | null;

  // System Logs
  logs: LogEntry[];

  // Actions
  setMode: (mode: PlatformMode) => void;
  setPicoIpAddress: (ip: string) => void;
  // 공간 선택 시 그 공간의 Pico 2 W 로 연결 전환 (모드 + IP 동시 변경)
  applyRoomConnection: (roomName: string, conn: RoomConnection) => void;
  setConnectionState: (state: ConnectionState) => void;
  setSelectedDevice: (deviceId: string | null) => void;
  setExhibitionMode: (enabled: boolean) => void;
  setAutoRotate: (enabled: boolean) => void;

  updateSensor: (id: 'dht11_temp' | 'dht11_humi' | 'cds_light', value: number) => void;
  setServoAngle: (angle: number) => Promise<boolean>;
  setRgbColor: (color: string) => Promise<boolean>;
  setRgbState: (state: 'ON' | 'OFF') => Promise<boolean>;

  resetActuators: () => void;
  syncReportedActuators: (
    next: { servoAngle?: number; rgbColor?: string; rgbState?: 'ON' | 'OFF' },
    source: LogEntry['source']
  ) => void;
  confirmServoAck: (angle: number) => void;
  confirmRgbAck: (color: string, state: 'ON' | 'OFF') => void;
  failCommand: (actuatorId: 'sg90_door' | 'rgb_light', errorMessage: string) => void;

  // 업로드 공간에서 연결하지 않은 기본 장치면 경고 후 false
  ensureDevice: (id: BaseDeviceId) => boolean;
  setActiveRoomPackage: (pkg: RoomPackage | null) => void;
  updateCustomSensor: (key: string, value: number) => void;
  sendCommand: (action: string, value: CustomCommand['value']) => void;
  setCommandResult: (command: CustomCommand, ok: boolean) => void;

  addLog: (type: LogEntry['type'], message: string, source?: LogEntry['source']) => void;
  clearLogs: () => void;
  checkStaleSensors: () => void;
}
