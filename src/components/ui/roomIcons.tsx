// 공간 대표 아이콘 10종 (새 공간 추가 · 공간 목록 공용)
import { Car, Factory, GraduationCap, HeartPulse, Home, LucideIcon, PawPrint, ShieldCheck, Sparkles, Sprout, Zap } from 'lucide-react';
import { RoomIconType } from '@/core/types/iot';

export const ROOM_ICONS: Record<RoomIconType, { label: string; Icon: LucideIcon }> = {
  home: { label: '거실/홈', Icon: Home },
  farm: { label: '팜/온실', Icon: Sprout },
  factory: { label: '공장', Icon: Factory },
  sparkles: { label: '조명', Icon: Sparkles },
  shield: { label: '보안', Icon: ShieldCheck },
  school: { label: '교실', Icon: GraduationCap },
  car: { label: '교통', Icon: Car },
  health: { label: '헬스케어', Icon: HeartPulse },
  pet: { label: '반려동물', Icon: PawPrint },
  energy: { label: '에너지', Icon: Zap },
};

export const ROOM_ICON_TYPES = Object.keys(ROOM_ICONS) as RoomIconType[];
