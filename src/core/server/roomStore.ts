// 서버 전용: 전시 PC의 rooms-data/<roomId>/ 폴더에 공간 꾸러미를 저장/조회합니다.
import { promises as fs } from 'fs';
import path from 'path';
import {
  BaseDeviceId,
  BASE_DEVICE_IDS,
  BASE_DEVICE_INFO,
  CustomSensorDef,
  PlatformMode,
  RoomConnection,
  RoomFileName,
  RoomIconType,
  RoomMeta,
  RoomPackage,
  ROOM_FILE_NAMES,
} from '../types/iot';

export const ROOMS_DIR = process.env.ROOMS_DATA_DIR || path.join(process.cwd(), 'rooms-data');
export const MAX_FILE_BYTES = 200 * 1024;

const ROOM_ID_RE = /^[a-z0-9_-]{1,64}$/;
const SENSOR_KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;
const PIN_RE = /^GP([0-9]|1[0-9]|2[0-8])$/;
// 예: 192.168.0.51, 192.168.0.51:80, 127.0.0.1:5051, localhost:5051
const PICO_IP_RE = /^(((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)|localhost)(:\d{1,5})?$/;
const ICONS: RoomIconType[] = ['home', 'farm', 'factory', 'sparkles', 'shield'];
const BUILTIN_ROOM_IDS = ['builtin_home', 'builtin_farm', 'builtin_factory'];

// Pico 2 W 내부(무선 모듈)가 사용하는 핀: 어떤 공간도 사용 불가
const WIRELESS_PINS = ['GP23', 'GP24', 'GP25', 'GP29'];

// 공간이 사용하는 기본 장치의 핀 + 무선 모듈 핀 = 팀 확장에 사용할 수 없는 핀
// (scripts/bundle-firmware.mjs 의 reservedPins 와 동일하게 유지)
export function reservedPins(baseDevices: BaseDeviceId[]): Record<string, string> {
  const reserved: Record<string, string> = {};
  WIRELESS_PINS.forEach((pin) => (reserved[pin] = 'Pico 2 W 무선 모듈'));
  baseDevices.forEach((d) => BASE_DEVICE_INFO[d].pins.forEach((pin) => (reserved[pin] = BASE_DEVICE_INFO[d].name)));
  return reserved;
}

export class RoomError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function assertRoomId(id: string): void {
  if (!ROOM_ID_RE.test(id)) throw new RoomError('잘못된 공간 ID입니다.', 400);
}

export function assertFileName(name: string): asserts name is RoomFileName {
  if (!(ROOM_FILE_NAMES as readonly string[]).includes(name)) {
    throw new RoomError(`업로드할 수 있는 파일은 ${ROOM_FILE_NAMES.join(', ')} 입니다. (받은 파일: ${name})`);
  }
}

const roomDir = (id: string) => path.join(ROOMS_DIR, id);

function str(v: unknown, fallback: string, max = 80): string {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

// 브라우저 · Node fetch 가 보안상 막는 포트 (WHATWG Fetch "bad port" 목록) — 이 포트의 Pico/mock 에는 연결할 수 없음
// (firmware/mock_pico_server.js 의 BLOCKED_PORTS 와 동일하게 유지)
export const BLOCKED_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111,
  113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548,
  554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566,
  6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080,
]);

// Pico IP / 모드 정규화 (빈 IP 허용, 하드웨어 모드인데 IP가 없으면 시뮬레이션)
export function normalizeConnection(src: Record<string, unknown>, prev?: RoomConnection): RoomConnection {
  let picoIp = prev?.picoIp || '';
  if (typeof src.picoIp === 'string') {
    const ip = src.picoIp.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (ip && !PICO_IP_RE.test(ip)) {
      throw new RoomError(`Pico IP "${src.picoIp}"가 올바르지 않습니다. 예: 192.168.0.51 또는 127.0.0.1:5051`);
    }
    const port = Number(ip.split(':')[1] || 80);
    if (port < 1 || port > 65535 || BLOCKED_PORTS.has(port)) {
      throw new RoomError(`포트 ${port} 는 브라우저가 보안상 막는 포트라 연결할 수 없습니다. 다른 포트를 쓰세요. (예: 5051, 5052)`);
    }
    picoIp = ip;
  }
  let mode: PlatformMode = src.mode === 'hardware' || src.mode === 'simulation' ? src.mode : prev?.mode || 'simulation';
  if (mode === 'hardware' && !picoIp) mode = 'simulation';
  return { picoIp, mode };
}

// room.json 입력을 안전한 RoomMeta로 정규화 (id/createdAt은 서버가 관리)
export function normalizeMeta(input: unknown, id: string, prev?: RoomMeta): RoomMeta {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const now = Date.now();

  const customSensors: CustomSensorDef[] = [];
  if (Array.isArray(src.customSensors)) {
    for (const raw of src.customSensors.slice(0, 12)) {
      if (!raw || typeof raw !== 'object') continue;
      const r = raw as Record<string, unknown>;
      const key = typeof r.key === 'string' ? r.key.trim() : '';
      if (!SENSOR_KEY_RE.test(key)) {
        throw new RoomError(`customSensors의 key "${key}"는 영문 소문자로 시작하는 소문자/숫자/_ 조합이어야 합니다.`);
      }
      if (customSensors.some((s) => s.key === key)) continue;
      customSensors.push({
        key,
        name: str(r.name, key, 40),
        unit: str(r.unit, '', 12),
        min: num(r.min),
        max: num(r.max),
        minWarning: num(r.minWarning),
        maxWarning: num(r.maxWarning),
      });
    }
  }

  const pins: string[] = [];
  if (Array.isArray(src.pins)) {
    for (const p of src.pins) {
      const pin = typeof p === 'string' ? p.trim().toUpperCase() : '';
      if (!PIN_RE.test(pin)) throw new RoomError(`pins의 "${String(p)}"는 GP0 ~ GP28 형식이어야 합니다.`);
      if (!pins.includes(pin)) pins.push(pin);
    }
  }

  const iconType = ICONS.includes(src.iconType as RoomIconType)
    ? (src.iconType as RoomIconType)
    : prev?.iconType || 'sparkles';

  let baseDevices: BaseDeviceId[] = prev?.baseDevices || [...BASE_DEVICE_IDS];
  if (Array.isArray(src.baseDevices)) {
    const unknown = src.baseDevices.filter((d) => !(BASE_DEVICE_IDS as readonly unknown[]).includes(d));
    if (unknown.length) {
      throw new RoomError(`baseDevices에는 ${BASE_DEVICE_IDS.join(', ')} 만 쓸 수 있습니다. (받은 값: ${unknown.join(', ')})`);
    }
    baseDevices = BASE_DEVICE_IDS.filter((d) => (src.baseDevices as unknown[]).includes(d));
  }

  return {
    id,
    name: str(src.name, prev?.name || '새 공간', 40),
    team: str(src.team, prev?.team || '', 40),
    iconType,
    sensorsDesc: str(src.sensorsDesc, prev?.sensorsDesc || '팀 프로젝트 공간', 60),
    ...normalizeConnection(src, prev),
    baseDevices,
    customSensors,
    pins,
    hasNotification: typeof src.hasNotification === 'boolean' ? src.hasNotification : prev?.hasNotification,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };
}

async function readMeta(id: string): Promise<RoomMeta | null> {
  try {
    const raw = JSON.parse(await fs.readFile(path.join(roomDir(id), 'room.json'), 'utf8'));
    let meta: RoomMeta;
    try {
      meta = normalizeMeta(raw, id, raw);
    } catch {
      // 저장된 연결 설정이 (규칙 변경 등으로) 더 이상 유효하지 않아도 공간이 사라지지 않도록
      // Pico IP 를 비우고 시뮬레이션으로 되돌려 다시 읽음
      meta = normalizeMeta({ ...raw, picoIp: '', mode: 'simulation' }, id, { ...raw, picoIp: '', mode: 'simulation' });
    }
    return { ...meta, updatedAt: num(raw.updatedAt) ?? meta.updatedAt };
  } catch {
    return null;
  }
}

async function writeMeta(meta: RoomMeta): Promise<void> {
  await fs.mkdir(roomDir(meta.id), { recursive: true });
  await fs.writeFile(path.join(roomDir(meta.id), 'room.json'), JSON.stringify(meta, null, 2), 'utf8');
}

export async function listRooms(): Promise<RoomMeta[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(ROOMS_DIR);
  } catch {
    return [];
  }
  const metas = await Promise.all(entries.filter((e) => ROOM_ID_RE.test(e)).map(readMeta));
  return metas.filter((m): m is RoomMeta => !!m).sort((a, b) => a.createdAt - b.createdAt);
}

// 공간마다 Pico 가 따로 있으므로: 이 공간의 기본 장치 핀과 겹치는지, 다른 공간과 Pico IP 가 같은지 검사
export function computeRoomWarnings(meta: RoomMeta, all: RoomMeta[], builtin: Record<string, RoomConnection> = {}): string[] {
  const warnings: string[] = [];
  const reserved = reservedPins(meta.baseDevices);
  for (const pin of meta.pins) {
    if (reserved[pin]) warnings.push(`${pin}은(는) ${reserved[pin]}이(가) 사용하는 핀입니다.`);
  }
  if (meta.picoIp) {
    const other = all.find((m) => m.id !== meta.id && m.picoIp === meta.picoIp);
    if (other) warnings.push(`Pico IP ${meta.picoIp}를 "${other.name}" 공간도 사용합니다. 공간마다 다른 Pico IP를 지정하세요.`);
    const builtinId = Object.keys(builtin).find((id) => builtin[id].picoIp === meta.picoIp);
    if (builtinId) warnings.push(`Pico IP ${meta.picoIp}를 기본 예제 공간(${builtinId})도 사용합니다.`);
  }
  return warnings;
}

// ------------------------------------------------------------------------------
// 기본 예제 공간(builtin_*)의 Pico 연결 설정: rooms-data/_builtin.json
// ------------------------------------------------------------------------------
const BUILTIN_FILE = () => path.join(ROOMS_DIR, '_builtin.json');

export async function readBuiltinConnections(): Promise<Record<string, RoomConnection>> {
  try {
    const raw = JSON.parse(await fs.readFile(BUILTIN_FILE(), 'utf8')) as Record<string, Record<string, unknown>>;
    const out: Record<string, RoomConnection> = {};
    for (const id of BUILTIN_ROOM_IDS) {
      if (raw[id]) {
        try {
          out[id] = normalizeConnection(raw[id]);
        } catch {
          // 잘못 저장된 값은 무시
        }
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function updateBuiltinConnection(id: string, patch: Record<string, unknown>): Promise<RoomConnection> {
  if (!BUILTIN_ROOM_IDS.includes(id)) throw new RoomError('기본 예제 공간이 아닙니다.', 404);
  const all = await readBuiltinConnections();
  all[id] = normalizeConnection(patch, all[id]);
  await fs.mkdir(ROOMS_DIR, { recursive: true });
  await fs.writeFile(BUILTIN_FILE(), JSON.stringify(all, null, 2), 'utf8');
  return all[id];
}

export async function getRoom(id: string): Promise<RoomPackage> {
  assertRoomId(id);
  const meta = await readMeta(id);
  if (!meta) throw new RoomError('공간을 찾을 수 없습니다.', 404);
  const files: RoomPackage['files'] = {};
  for (const name of ['Scene.tsx', 'mock.js', 'code.py'] as const) {
    try {
      files[name] = await fs.readFile(path.join(roomDir(id), name), 'utf8');
    } catch {
      // 아직 업로드되지 않은 파일
    }
  }
  return { meta, files, warnings: computeRoomWarnings(meta, await listRooms(), await readBuiltinConnections()) };
}

export async function createRoom(input: unknown): Promise<RoomPackage> {
  const id = `room_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  await writeMeta(normalizeMeta(input, id));
  return getRoom(id);
}

export async function updateMeta(id: string, patch: Record<string, unknown>): Promise<RoomPackage> {
  const prev = await readMeta(id);
  if (!prev) throw new RoomError('공간을 찾을 수 없습니다.', 404);
  await writeMeta(normalizeMeta({ ...prev, ...patch }, id, prev));
  return getRoom(id);
}

export async function writeRoomFiles(id: string, files: Record<string, unknown>): Promise<RoomPackage> {
  assertRoomId(id);
  const prev = await readMeta(id);
  if (!prev) throw new RoomError('공간을 찾을 수 없습니다.', 404);

  for (const [name, content] of Object.entries(files)) {
    assertFileName(name);
    if (typeof content !== 'string') throw new RoomError(`${name} 내용이 비어 있습니다.`);
    if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) {
      throw new RoomError(`${name} 파일이 너무 큽니다. (최대 ${MAX_FILE_BYTES / 1024}KB)`);
    }
    if (name === 'room.json') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new RoomError('room.json이 올바른 JSON 형식이 아닙니다.');
      }
      // 연결 모드는 화면의 'Pico 연결 설정'에서만 바꿉니다. (AI가 만든 room.json 이 연결을 끊지 않도록)
      // picoIp 는 업로드 파일에 값이 있을 때만 반영합니다.
      const src = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
      const { mode: _mode, ...rest } = src;
      void _mode;
      if (typeof rest.picoIp !== 'string' || !rest.picoIp.trim()) delete rest.picoIp;
      await writeMeta(normalizeMeta(rest, id, prev));
    }
  }
  // room.json 검증이 끝난 뒤 나머지 파일 저장
  for (const [name, content] of Object.entries(files)) {
    if (name !== 'room.json') await fs.writeFile(path.join(roomDir(id), name), content as string, 'utf8');
  }
  if (!('room.json' in files)) await writeMeta({ ...prev, updatedAt: Date.now() });
  return getRoom(id);
}

export async function deleteRoomFile(id: string, name: string): Promise<RoomPackage> {
  assertRoomId(id);
  assertFileName(name);
  if (name === 'room.json') throw new RoomError('room.json은 삭제할 수 없습니다. 공간 자체를 삭제하세요.');
  await fs.rm(path.join(roomDir(id), name), { force: true });
  return getRoom(id);
}

export async function duplicateRoom(id: string): Promise<RoomPackage> {
  const src = await getRoom(id);
  // 사본은 별도 Pico 를 연결해야 하므로 IP 를 비우고 시뮬레이션으로 시작
  const copy = await createRoom({
    ...src.meta,
    name: `${src.meta.name} (사본)`.slice(0, 40),
    picoIp: '',
    mode: 'simulation',
  });
  const files: Record<string, string> = {};
  Object.entries(src.files).forEach(([k, v]) => v !== undefined && (files[k] = v));
  return Object.keys(files).length ? writeRoomFiles(copy.meta.id, files) : copy;
}

export async function deleteRoom(id: string): Promise<void> {
  assertRoomId(id);
  await fs.rm(roomDir(id), { recursive: true, force: true });
}

export async function readRoomFile(id: string, name: string): Promise<string> {
  assertRoomId(id);
  assertFileName(name);
  try {
    return await fs.readFile(path.join(roomDir(id), name), 'utf8');
  } catch {
    throw new RoomError(`${name} 파일이 아직 업로드되지 않았습니다.`, 404);
  }
}

// 업로드 비밀번호 (선택): ROOM_UPLOAD_KEY 환경변수가 설정된 경우에만 검사
export function assertUploadKey(headers: Headers): void {
  const required = process.env.ROOM_UPLOAD_KEY;
  if (required && headers.get('x-room-key') !== required) {
    throw new RoomError('업로드 비밀번호가 올바르지 않습니다.', 401);
  }
}
