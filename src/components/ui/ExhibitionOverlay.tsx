'use client';

import React from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { useRoomDevices } from '@/core/rooms/useRoomDevices';
import { RotateCcw, DoorOpen, Lightbulb, Minimize2 } from 'lucide-react';

export function ExhibitionOverlay() {
  const isExhibitionMode = useIoTStore((s) => s.isExhibitionMode);
  const setExhibitionMode = useIoTStore((s) => s.setExhibitionMode);
  const door = useIoTStore((s) => s.actuators.sg90_door);
  const light = useIoTStore((s) => s.actuators.rgb_light);
  const setServoAngle = useIoTStore((s) => s.setServoAngle);
  const setRgbState = useIoTStore((s) => s.setRgbState);
  // 이 공간에 연결된 기본 장치의 버튼만 표시
  const devices = useRoomDevices();

  if (!isExhibitionMode) return null;

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setExhibitionMode(false);
  };

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-500/50 shadow-2xl">
      <span className="text-xs font-bold text-amber-400 mr-2 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        전시 관람 모드
      </span>

      {/* 스마트 도어 원터치 토글 */}
      {devices.sg90 && (
      <button
        onClick={() => setServoAngle(door.reportedAngle === 0 ? 90 : 0)}
        className="px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-bold shadow flex items-center gap-1.5 transition-all"
      >
        <DoorOpen className="w-4 h-4" />
        {door.reportedAngle === 0 ? (devices.isUploaded ? '서보 90°' : '문 열기') : (devices.isUploaded ? '서보 0°' : '문 닫기')}
      </button>
      )}

      {/* 조명 원터치 토글 */}
      {devices.rgb && (
      <button
        onClick={() => setRgbState(light.reportedState === 'ON' ? 'OFF' : 'ON')}
        className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow flex items-center gap-1.5 transition-all ${
          light.reportedState === 'ON'
            ? 'bg-amber-600/80 hover:bg-amber-500'
            : 'bg-slate-700/80 hover:bg-slate-600'
        }`}
      >
        <Lightbulb className="w-4 h-4" />
        {light.reportedState === 'ON' ? '조명 끄기' : '조명 켜기'}
      </button>
      )}

      {/* 전시 모드 종료 */}
      <button
        onClick={exitFullscreen}
        className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        title="전시 모드 종료"
      >
        <Minimize2 className="w-4 h-4" />
      </button>
    </div>
  );
}
