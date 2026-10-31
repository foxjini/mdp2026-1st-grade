// 전시용 작품 자동 순환 엔진: 정해진 간격마다 다음 학생 작품 공간으로 넘김
// - 관람객이 화면을 만지면(누르기 · 끌기 · 휠 · 키) 남은 시간을 처음부터 다시 셈
// - 모달이 열려 있으면 멈춤
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RoomItem } from '@/components/ui/RoomsSidebar';

/** 순환할 공간: 학생 작품(팀이 올린 공간)만. 2개 미만이면 샘플을 포함한 목록 전체 */
export function pickCycleRooms(roomList: RoomItem[]): RoomItem[] {
  const student = roomList.filter((r) => r.source === 'uploaded' && !r.isExample);
  return student.length >= 2 ? student : roomList;
}

export function useRoomCycle({
  roomList,
  activeRoomId,
  seconds,
  paused,
  onNext,
}: {
  roomList: RoomItem[];
  activeRoomId: string;
  seconds: number;
  paused: boolean;
  onNext: (roomId: string) => void;
}) {
  const rooms = useMemo(() => pickCycleRooms(roomList), [roomList]);
  const [remaining, setRemaining] = useState(seconds);
  const left = useRef(seconds);
  const next = useRef(onNext);
  next.current = onNext;

  // 지금 공간 다음 차례 (지금 공간이 순환 목록에 없으면 첫 공간)
  const idx = rooms.findIndex((r) => r.id === activeRoomId);
  const nextRoom = rooms.length >= 2 ? rooms[(idx + 1) % rooms.length] : null;

  // 공간이 바뀌거나(자동 · 손으로) 간격을 바꾸면 처음부터
  useEffect(() => {
    left.current = seconds;
    setRemaining(seconds);
  }, [activeRoomId, seconds]);

  // 관람객이 화면을 만지면 처음부터
  useEffect(() => {
    const reset = () => {
      left.current = seconds;
      setRemaining(seconds);
    };
    const events = ['pointerdown', 'wheel', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, reset));
  }, [seconds]);

  useEffect(() => {
    if (paused || !nextRoom) return;
    const timer = setInterval(() => {
      left.current -= 1;
      if (left.current <= 0) {
        left.current = seconds;
        next.current(nextRoom.id);
      }
      setRemaining(left.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [paused, nextRoom, seconds]);

  return { remaining, nextRoom, rooms };
}
