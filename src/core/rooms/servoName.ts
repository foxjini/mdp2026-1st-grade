// 공간마다 SG90 서보모터를 부르는 이름 (인스펙터 · 음성 안내 · 자동화 · 승인 문구 공용)
// 기본 공간은 아래 표, 팀 · 예제 꾸러미 공간은 room.json 의 servoName (없으면 '서보모터')
import type { RoomPackage } from '../types/iot';

export const DEFAULT_SERVO_NAME = '서보모터';

export const BUILTIN_SERVO_NAMES: Record<string, string> = {
  builtin_home: '스마트 도어',
  builtin_farm: '환기창',
  builtin_factory: '분류 게이트',
};

export function servoNameFor(roomId: string, pkg: RoomPackage | null): string {
  if (roomId in BUILTIN_SERVO_NAMES) return BUILTIN_SERVO_NAMES[roomId];
  return pkg?.meta.servoName?.trim() || DEFAULT_SERVO_NAME;
}

// 받침 유무에 맞는 조사: josa('환기창', '을/를') → '환기창을', josa('분류 게이트', '이/가') → '분류 게이트가'
export function josa(word: string, pair: '을/를' | '이/가' | '은/는' | '와/과' | '으로/로'): string {
  const [withBatchim, withoutBatchim] = pair.split('/');
  const last = word.trim().charCodeAt(word.trim().length - 1);
  // 한글이 아니면(영문 · 숫자 등) 받침 없는 쪽을 씀
  if (!(last >= 0xac00 && last <= 0xd7a3)) return word + withoutBatchim;
  const jong = (last - 0xac00) % 28;
  // '으로/로' 는 받침이 없거나 ㄹ 받침(8)이면 '로'
  if (pair === '으로/로') return word + (jong === 0 || jong === 8 ? withoutBatchim : withBatchim);
  return word + (jong ? withBatchim : withoutBatchim);
}
