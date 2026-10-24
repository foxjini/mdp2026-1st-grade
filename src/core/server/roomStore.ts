// 서버 전용: 전시 PC의 rooms-data/<roomId>/ 폴더에 공간 꾸러미를 저장/조회합니다.
import { promises as fs } from 'fs';
import path from 'path';
import {
  CustomSensorDef,
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
const ICONS: RoomIconType[] = ['home', 'farm', 'factory', 'sparkles', 'shield'];

// 기본 4종 장치와 Pico 2 W 내부(무선 모듈 등)가 사용하는 핀: 팀 확장에 사용 불가
export const RESERVED_PINS: Record<string, string> = {
  GP15: 'DHT11',
  GP16: 'SG90 서보',
  GP18: 'RGB LED (R)',
  GP19: 'RGB LED (G)',
  GP20: 'RGB LED (B)',
  GP26: 'Cds 조도 (ADC0)',
  GP23: 'Pico 2 W 무선 모듈',
  GP24: 'Pico 2 W 무선 모듈',
  GP25: 'Pico 2 W 무선 모듈',
  GP29: 'Pico 2 W 무선 모듈',
};

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

  return {
    id,
    name: str(src.name, prev?.name || '새 공간', 40),
    team: str(src.team, prev?.team || '', 40),
    iconType,
    sensorsDesc: str(src.sensorsDesc, prev?.sensorsDesc || '팀 프로젝트 공간', 60),
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
    const meta = normalizeMeta(raw, id, raw);
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

// 핀 충돌 검사: 기본 장치 핀 또는 다른 팀이 선언한 핀과 겹치면 경고
export function computePinWarnings(meta: RoomMeta, all: RoomMeta[]): string[] {
  const warnings: string[] = [];
  for (const pin of meta.pins) {
    if (RESERVED_PINS[pin]) warnings.push(`${pin}은(는) ${RESERVED_PINS[pin]}이(가) 사용하는 핀입니다.`);
    const other = all.find((m) => m.id !== meta.id && m.pins.includes(pin));
    if (other) warnings.push(`${pin}은(는) "${other.name}"(${other.team || other.id}) 공간과 겹칩니다.`);
  }
  return warnings;
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
  return { meta, files, warnings: computePinWarnings(meta, await listRooms()) };
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
      await writeMeta(normalizeMeta(parsed, id, prev));
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
  const copy = await createRoom({ ...src.meta, name: `${src.meta.name} (사본)`.slice(0, 40), pins: [] });
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
