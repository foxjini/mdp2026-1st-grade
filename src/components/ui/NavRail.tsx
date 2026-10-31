'use client';

import React from 'react';
import Link from 'next/link';
import { useIoTStore } from '@/core/store/useIoTStore';
import { useExhibitionToggle } from './useExhibitionToggle';
import { VoiceControl } from './VoiceControl';
import {
  LayoutGrid,
  Clock,
  Sliders,
  Wifi,
  BookOpen,
  ListChecks,
  Maximize,
  RotateCcw,
  Sparkles,
  Repeat,
} from 'lucide-react';

interface NavRailProps {
  onOpenIpModal: () => void;
  onOpenAbout: () => void;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  /** 작품 자동 순환 켜기/끄기 (켤 때 공간 수 확인은 page 가 맡음) */
  onToggleCycle: () => void;
  autoCycle: boolean;
  cycleSeconds: number;
}

export function NavRail({
  onOpenIpModal,
  onOpenAbout,
  activeNavTab,
  setActiveNavTab,
  onToggleCycle,
  autoCycle,
  cycleSeconds,
}: NavRailProps) {
  const isAutoRotate = useIoTStore((s) => s.isAutoRotate);
  const setAutoRotate = useIoTStore((s) => s.setAutoRotate);
  const { isExhibitionMode, toggleExhibition } = useExhibitionToggle();
  const connectionState = useIoTStore((s) => s.connectionState);
  const mode = useIoTStore((s) => s.mode);

  return (
    <aside className="w-[68px] h-full flex flex-col items-center py-4 px-2.5 bg-[#F6F8FB] border-r border-slate-200/80 justify-between shrink-0 select-none z-30">
      {/* 1. 상단 로고 & 메인 내비게이션 */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* 학교 마크: 클릭하면 플랫폼 소개 · 전시 현황 창 */}
        <button
          type="button"
          onClick={onOpenAbout}
          className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-md shadow-blue-900/10 hover:scale-105 hover:border-blue-300 transition-all flex items-center justify-center overflow-hidden"
          title="인천전자마이스터고 · 3D IoT 전시 플랫폼 — 플랫폼 소개 · 전시 현황"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/school-logo.png" alt="인천전자마이스터고등학교" className="w-9 h-9 object-contain" />
        </button>

        {/* 메인 메뉴 아이콘 버튼 리스트 */}
        <nav className="flex flex-col items-center gap-2.5 w-full mt-2">
          {/* 3D 가상 공간 (Active) */}
          <button
            onClick={() => setActiveNavTab('space')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              activeNavTab === 'space'
                ? 'bg-[#185ADB] text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/20'
                : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70 shadow-sm'
            }`}
            title="3D 가상 공간 뷰 (기본 투시 시점 복귀)"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>

          {/* 센서 로그 및 텔레메트리 히스토리 */}
          <button
            onClick={() => setActiveNavTab('telemetry')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              activeNavTab === 'telemetry'
                ? 'bg-[#185ADB] text-white shadow-lg shadow-blue-600/30'
                : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70 shadow-sm'
            }`}
            title="실시간 텔레메트리 & 로그"
          >
            <Clock className="w-5 h-5" />
          </button>

          {/* 장치 액추에이터 제어 */}
          <button
            onClick={() => setActiveNavTab('control')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              activeNavTab === 'control'
                ? 'bg-[#185ADB] text-white shadow-lg shadow-blue-600/30'
                : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70 shadow-sm'
            }`}
            title="하드웨어 제어 컨트롤러"
          >
            <Sliders className="w-5 h-5" />
          </button>

          {/* 하드웨어 Pico 2 W 연결 모달 */}
          <button
            onClick={onOpenIpModal}
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70 shadow-sm transition-all`}
            title={`Pico 2 W 하드웨어 연결 설정 (${mode === 'simulation' ? '시뮬레이션' : '하드웨어'})`}
          >
            <Wifi className="w-5 h-5" />
            <span
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-white ${
                connectionState === 'connected'
                  ? 'bg-emerald-500'
                  : connectionState === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
          </button>

          {/* 개별 프로젝트 제작 매뉴얼 (9단계) */}
          <a
            href="/개별%20프로젝트%20제작%20매뉴얼.html"
            target="_blank"
            rel="noreferrer"
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-200/70 shadow-sm transition-all"
            title="개별 프로젝트 제작 매뉴얼 (9단계)"
          >
            <ListChecks className="w-5 h-5" />
          </a>

          {/* 바이브 코딩 실전 매뉴얼 */}
          <Link
            href="/manual.html"
            target="_blank"
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-200/70 shadow-sm transition-all"
            title="바이브 코딩 가이드 매뉴얼"
          >
            <BookOpen className="w-5 h-5" />
          </Link>

          {/* 음성 안내 켜기/끄기 · 설정 */}
          <VoiceControl />
        </nav>
      </div>

      {/* 2. 하단 유틸리티 툴바 */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* 작품 자동 순환: 공간 목록의 학생 작품을 교대로 표시 */}
        <button
          onClick={onToggleCycle}
          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all border ${
            autoCycle
              ? 'bg-violet-50 text-violet-600 border-violet-200 shadow-sm'
              : 'bg-white text-slate-400 hover:text-slate-700 border-slate-200/70 shadow-sm'
          }`}
          title={autoCycle ? `작품 자동 순환 끄기 (지금 ${cycleSeconds}초마다)` : `작품 자동 순환 켜기 — 학생 작품을 ${cycleSeconds}초마다 교대로 표시`}
          aria-pressed={autoCycle}
        >
          <Repeat className="w-4 h-4" />
          {autoCycle && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-white" />}
        </button>

        {/* 3D 자동 회전 (Auto-Rotate) 토글 */}
        <button
          onClick={() => setAutoRotate(!isAutoRotate)}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border ${
            isAutoRotate
              ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
              : 'bg-white text-slate-400 hover:text-slate-700 border-slate-200/70 shadow-sm'
          }`}
          title={isAutoRotate ? '3D 자동 회전 정지' : '3D 자동 회전 시작'}
        >
          <RotateCcw
            className={`w-4 h-4 ${isAutoRotate ? 'animate-spin' : ''}`}
            style={{ animationDuration: '6s' }}
          />
        </button>

        {/* 전시 모드 (전체화면 / 화면꺼짐방지) */}
        <button
          onClick={toggleExhibition}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border ${
            isExhibitionMode
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm'
              : 'bg-white text-slate-400 hover:text-slate-700 border-slate-200/70 shadow-sm'
          }`}
          title="부스 전시 모드 (전체화면 & 화면 켜짐 유지)"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
