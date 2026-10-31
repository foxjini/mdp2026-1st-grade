'use client';

// 작품 자동 순환이 켜져 있을 때 3D 화면 위에 뜨는 안내 칩: 다음 작품 · 남은 시간 · 간격 고르기 · 끄기
import React from 'react';
import { Repeat, Pause } from 'lucide-react';
import { CYCLE_SECONDS, useLayoutStore } from '@/core/ui/useLayoutStore';
import { useRoomCycle } from '@/core/ui/useRoomCycle';
import type { RoomItem } from './RoomsSidebar';

interface RoomCycleChipProps {
  roomList: RoomItem[];
  activeRoomId: string;
  paused: boolean;
  onNext: (roomId: string) => void;
}

export function RoomCycleChip({ roomList, activeRoomId, paused, onNext }: RoomCycleChipProps) {
  const seconds = useLayoutStore((s) => s.cycleSeconds);
  const setCycleSeconds = useLayoutStore((s) => s.setCycleSeconds);
  const setAutoCycle = useLayoutStore((s) => s.setAutoCycle);
  const { remaining, nextRoom, rooms } = useRoomCycle({ roomList, activeRoomId, seconds, paused, onNext });

  if (!nextRoom) return null;
  const order = rooms.findIndex((r) => r.id === activeRoomId) + 1;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-[min(420px,calc(100%-32px))] rounded-2xl bg-white/90 backdrop-blur border border-slate-200 shadow-sm px-3.5 py-2">
      <div className="flex items-center gap-2 text-xs">
        <Repeat className="w-3.5 h-3.5 text-violet-600 shrink-0" />
        <span className="font-bold text-slate-800 shrink-0">
          작품 순환 {order > 0 ? `${order}/${rooms.length}` : ''}
        </span>
        <span className="text-slate-500 truncate min-w-0">
          다음: <b className="text-slate-700">{nextRoom.name}</b>
          {nextRoom.team ? ` (${nextRoom.team})` : ''}
        </span>
        <span className="ml-auto font-mono tabular-nums text-slate-500 shrink-0">{paused ? '멈춤' : `${remaining}초`}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          {CYCLE_SECONDS.map((s) => (
            <button
              key={s}
              onClick={() => setCycleSeconds(s)}
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                s === seconds ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
              title={`${s}초마다 다음 작품`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAutoCycle(false)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          title="작품 자동 순환 끄기"
        >
          <Pause className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-violet-500 transition-[width] duration-1000 ease-linear"
          style={{ width: `${((seconds - remaining) / seconds) * 100}%` }}
        />
      </div>
    </div>
  );
}
