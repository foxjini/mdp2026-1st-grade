// 브라우저 → /api/rooms 호출 헬퍼
import { RoomIconType, RoomMeta, RoomPackage } from '../types/iot';
import type { RoomItem } from '@/components/ui/RoomsSidebar';

const KEY_STORAGE = 'mdp.roomUploadKey';

export function getUploadKey(): string {
  try {
    return window.localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setUploadKey(key: string): void {
  try {
    window.localStorage.setItem(KEY_STORAGE, key);
  } catch {
    // 저장 불가 환경(시크릿 창 등)은 무시
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-room-key': getUploadKey(), ...(init?.headers || {}) },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (HTTP ${res.status})`);
  return data as T;
}

export const roomsApi = {
  list: () => call<{ rooms: RoomMeta[] }>('/api/rooms').then((d) => d.rooms),
  get: (id: string) => call<RoomPackage>(`/api/rooms/${id}`),
  create: (meta: Partial<RoomMeta>) => call<RoomPackage>('/api/rooms', { method: 'POST', body: JSON.stringify(meta) }),
  upload: (id: string, files: Record<string, string>) =>
    call<RoomPackage>(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify({ files }) }),
  patch: (id: string, patch: Record<string, unknown>) =>
    call<RoomPackage>(`/api/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  duplicate: (id: string) =>
    call<RoomPackage>(`/api/rooms/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'duplicate' }) }),
  removeFile: (id: string, name: string) =>
    call<RoomPackage>(`/api/rooms/${id}`, { method: 'PATCH', body: JSON.stringify({ removeFile: name }) }),
  remove: (id: string) => call<{ ok: true }>(`/api/rooms/${id}`, { method: 'DELETE' }),
};

export const ICON_COLORS: Record<RoomIconType, { bg: string; color: string }> = {
  home: { bg: 'bg-amber-100', color: 'text-amber-700' },
  farm: { bg: 'bg-emerald-100', color: 'text-emerald-700' },
  factory: { bg: 'bg-blue-100', color: 'text-blue-700' },
  sparkles: { bg: 'bg-purple-100', color: 'text-purple-700' },
  shield: { bg: 'bg-rose-100', color: 'text-rose-700' },
};

export function metaToRoomItem(meta: RoomMeta): RoomItem {
  return {
    id: meta.id,
    name: meta.name,
    sensorsDesc: meta.sensorsDesc,
    iconType: meta.iconType,
    iconBg: ICON_COLORS[meta.iconType].bg,
    iconColor: ICON_COLORS[meta.iconType].color,
    hasNotification: meta.hasNotification,
    source: 'uploaded',
    team: meta.team,
  };
}

// 플랫폼 기본 예제 공간 (src/components/3d/ 내장 컴포넌트, 삭제 불가)
export const BUILTIN_ROOMS: RoomItem[] = [
  {
    id: 'builtin_home',
    name: '스마트 거실 허브',
    sensorsDesc: '센서 3종 · 액추에이터 2종',
    iconType: 'home',
    iconBg: ICON_COLORS.home.bg,
    iconColor: ICON_COLORS.home.color,
    source: 'builtin',
  },
  {
    id: 'builtin_farm',
    name: '스마트 팜 온실',
    sensorsDesc: '온습도 & 토양 제어',
    iconType: 'farm',
    iconBg: ICON_COLORS.farm.bg,
    iconColor: ICON_COLORS.farm.color,
    source: 'builtin',
  },
  {
    id: 'builtin_factory',
    name: '스마트 팩토리 공정',
    sensorsDesc: '모터 및 컨베이어 감지',
    iconType: 'factory',
    iconBg: ICON_COLORS.factory.bg,
    iconColor: ICON_COLORS.factory.color,
    source: 'builtin',
  },
];
