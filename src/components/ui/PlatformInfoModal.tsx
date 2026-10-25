'use client';

import React from 'react';
import { X, Home, BookOpen, Maximize, Cpu, AlertTriangle } from 'lucide-react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { BASE_DEVICE_INFO } from '@/core/types/iot';
import { RoomItem } from './RoomsSidebar';
import { ROOM_ICONS } from './roomIcons';
import { useExhibitionToggle } from './useExhibitionToggle';

export const SCHOOL_NAME = '인천전자마이스터고등학교';

interface PlatformInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomList: RoomItem[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onGoHome: () => void;
}

// 왼쪽 위 학교 마크 → 플랫폼 소개 · 전시 현황 (전시 당일 모든 공간의 Pico 연결 설정 점검용)
export function PlatformInfoModal({ isOpen, onClose, roomList, activeRoomId, onSelectRoom, onGoHome }: PlatformInfoModalProps) {
  const connectionState = useIoTStore((s) => s.connectionState);
  const mode = useIoTStore((s) => s.mode);
  const { isExhibitionMode, toggleExhibition } = useExhibitionToggle();

  if (!isOpen) return null;

  const teamRooms = roomList.filter((r) => r.source === 'uploaded');
  const hardwareRooms = roomList.filter((r) => r.mode === 'hardware');
  // 같은 Pico IP 를 쓰는 공간 (공간마다 Pico 1대 → IP 가 겹치면 안 됨)
  const ipCount = new Map<string, number>();
  roomList.forEach((r) => r.picoIp && ipCount.set(r.picoIp, (ipCount.get(r.picoIp) || 0) + 1));

  const current = roomList.find((r) => r.id === activeRoomId);
  const currentStatus =
    mode === 'simulation'
      ? '시뮬레이션'
      : connectionState === 'connected'
        ? 'Pico 연결됨'
        : connectionState === 'connecting'
          ? 'Pico 연결 중'
          : 'Pico 응답 없음';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs select-none p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
        {/* 헤더: 학교 마크 + 플랫폼 이름 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/school-logo.png" alt={SCHOOL_NAME} className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{SCHOOL_NAME}</h3>
              <p className="text-xs text-slate-500 font-medium">3D IoT 공용 전시 플랫폼 · 고교 팀 프로젝트 (공간마다 Pico 2 W 1대)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 요약 칩 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">전체 공간</div>
            <div className="text-lg font-black text-slate-900">{roomList.length}</div>
            <div className="text-[10px] text-slate-500">기본 예제 {roomList.length - teamRooms.length} · 팀 공간 {teamRooms.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">연결 설정</div>
            <div className="text-lg font-black text-slate-900">
              {hardwareRooms.length}
              <span className="text-xs font-bold text-slate-400"> / {roomList.length}</span>
            </div>
            <div className="text-[10px] text-slate-500">하드웨어 {hardwareRooms.length} · 시뮬레이션 {roomList.length - hardwareRooms.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">지금 보는 공간</div>
            <div className="text-xs font-black text-slate-900 truncate mt-1">{current?.name || '-'}</div>
            <div
              className={`text-[10px] font-bold mt-0.5 ${
                mode === 'simulation' ? 'text-sky-600' : connectionState === 'connected' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {currentStatus}
            </div>
          </div>
        </div>

        {/* 전시 현황: 공간별 Pico 연결 설정 */}
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider">
            전시 현황 — 행을 누르면 그 공간으로 이동 (실시간 연결 상태는 지금 보는 공간만 표시)
          </span>
          {roomList.map((room) => {
            const RoomIcon = (ROOM_ICONS[room.iconType] || ROOM_ICONS.sparkles).Icon;
            const devices = room.baseDevices || (Object.keys(BASE_DEVICE_INFO) as Array<keyof typeof BASE_DEVICE_INFO>);
            const warn =
              room.mode === 'hardware' && !room.picoIp
                ? 'IP 미지정'
                : room.picoIp && (ipCount.get(room.picoIp) || 0) > 1
                  ? 'IP 중복'
                  : '';
            return (
              <button
                key={room.id}
                onClick={() => {
                  onSelectRoom(room.id);
                  onClose();
                }}
                className={`w-full p-2.5 rounded-2xl border flex items-center gap-3 text-left transition-colors ${
                  room.id === activeRoomId ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl ${room.iconBg} ${room.iconColor} flex items-center justify-center shrink-0`}>
                  <RoomIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {room.name}
                    {room.source === 'builtin' && <span className="ml-1.5 text-[9px] font-bold text-slate-400">기본 예제</span>}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">
                    {room.team ? `${room.team} · ` : ''}기본 장치 {devices.length ? devices.map((d) => BASE_DEVICE_INFO[d].name).join(', ') : '없음'}
                  </span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      room.mode === 'hardware'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-sky-50 text-sky-600 border-sky-200'
                    }`}
                  >
                    {room.mode === 'hardware' ? '하드웨어' : '시뮬레이션'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                    {warn && (
                      <span className="text-rose-600 font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> {warn}
                      </span>
                    )}
                    {room.picoIp || (warn ? '' : 'IP 없음')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 바로가기 */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onGoHome();
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" /> 첫 화면으로
            </button>
            <a
              href="/manual.html"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> 매뉴얼 열기
            </a>
            <button
              onClick={() => {
                toggleExhibition();
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <Maximize className="w-3.5 h-3.5" /> {isExhibitionMode ? '전시 모드 종료' : '전시 모드 시작'}
            </button>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> Raspberry Pi Pico 2 W · CircuitPython 10.x
          </span>
        </div>
      </div>
    </div>
  );
}
