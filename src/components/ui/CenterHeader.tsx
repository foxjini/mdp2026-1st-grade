'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Radio, Settings } from 'lucide-react';
import { useIoTStore } from '@/core/store/useIoTStore';

interface CenterHeaderProps {
  roomName: string;
  activeTab: 'inspector' | 'output' | 'thread';
  onTabChange: (tab: 'inspector' | 'output' | 'thread') => void;
  onOpenIpModal: () => void;
  // 모드 전환은 현재 공간의 연결 설정으로 저장됩니다 (공간마다 Pico 2 W 1대)
  onChangeMode: (mode: 'simulation' | 'hardware') => void;
  /** 오른쪽 패널 서랍 (탭 끝 › 버튼) */
  rightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
}

export function CenterHeader({
  roomName,
  activeTab,
  onTabChange,
  onOpenIpModal,
  onChangeMode,
  rightPanelOpen = true,
  onToggleRightPanel,
}: CenterHeaderProps) {
  const mode = useIoTStore((s) => s.mode);
  const connectionState = useIoTStore((s) => s.connectionState);
  const picoIpAddress = useIoTStore((s) => s.picoIpAddress);

  const [timeString, setTimeString] = useState('14 : 30');

  // 3D 화면 폭이 좁으면(양쪽 패널을 편 1366 화면 등) 헤더를 줄여서 글자가 세로로 꺾이지 않게
  const headerRef = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 820));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeString(`${hours} : ${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`h-16 flex items-center justify-between gap-3 select-none z-10 shrink-0 border-b border-slate-200/50 bg-[#F6F8FB]/60 backdrop-blur-xs ${
        compact ? 'px-4' : 'px-6'
      }`}
    >
      {/* 1. 좌측 룸 타이틀 & 서브타이틀 & 실시간 상태 */}
      <div className="flex items-center gap-6 min-w-0">
        <div className="min-w-0">
          <h1 className="text-[19px] font-extrabold text-slate-900 tracking-tight leading-none truncate" title={roomName}>
            {roomName}
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 truncate">
            {mode === 'simulation'
              ? '시뮬레이션 모드 · 가상 센서 데이터'
              : `Pico 2 W ${picoIpAddress} · ${
                  connectionState === 'connected' ? '연결됨' : connectionState === 'connecting' ? '연결 중…' : '응답 없음'
                }`}
          </p>
        </div>

        {/* 실시간 모니터링 인디케이터 (● 실시간 14 : 30) */}
        <div className={`items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-slate-200/70 shadow-2xs whitespace-nowrap shrink-0 ${compact ? 'hidden' : 'flex'}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-bold text-emerald-600 tracking-tight whitespace-nowrap">
            실시간
          </span>
          <span className="text-[11px] font-mono font-medium text-slate-500 whitespace-nowrap">
            {timeString}
          </span>
        </div>
      </div>

      {/* 2. 우측 모드 전환 & 인스펙터/출력/로그 세그먼트 탭 */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 하드웨어 / 시뮬레이션 모드 전환 알약 스위치 */}
        <div className="flex items-center bg-white/90 p-1 rounded-full border border-slate-200/80 shadow-2xs whitespace-nowrap">
          <button
            onClick={() => onChangeMode('simulation')}
            title="시뮬레이션 모드 (mock.js)"
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              mode === 'simulation'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {compact ? '시뮬' : '시뮬레이션'}
          </button>
          <button
            onClick={() => onChangeMode('hardware')}
            title="우리 팀 Pico 2 W 와 연결"
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              mode === 'hardware'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Pico 2 W</span>
          </button>
          <button
            onClick={onOpenIpModal}
            className="p-1 text-slate-400 hover:text-slate-700 ml-0.5 rounded-full hover:bg-slate-100 transition-colors"
            title={`${roomName} 공간의 Pico 2 W IP 설정`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Segmented Tab Pill: [ 장치 인스펙터 ] 센서 출력 제어 로그 > */}
        <div className="flex items-center bg-white/90 p-1 rounded-full border border-slate-200/80 shadow-2xs whitespace-nowrap shrink-0">
          <button
            onClick={() => onTabChange('inspector')}
            title="장치 인스펙터"
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'inspector'
                ? 'bg-[#18181B] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {compact ? '인스펙터' : '장치 인스펙터'}
          </button>

          <button
            onClick={() => onTabChange('output')}
            title="센서 출력"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'output'
                ? 'bg-[#18181B] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {compact ? '출력' : '센서 출력'}
          </button>

          <button
            onClick={() => onTabChange('thread')}
            title="제어 로그"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'thread'
                ? 'bg-[#18181B] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {compact ? '로그' : '제어 로그'}
          </button>

          <button
            onClick={onToggleRightPanel}
            aria-expanded={rightPanelOpen}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-0.5 shrink-0"
            title={rightPanelOpen ? '오른쪽 패널 접기 (])' : '오른쪽 패널 펼치기 (])'}
          >
            {rightPanelOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
