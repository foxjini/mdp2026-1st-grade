'use client';

import React from 'react';
import { X, ShieldAlert, CheckCircle2, Thermometer, Wind } from 'lucide-react';
import { useRoomDevices } from '@/core/rooms/useRoomDevices';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
}

export function ReviewModal({ isOpen, onClose, onApprove }: ReviewModalProps) {
  const { servoName } = useRoomDevices();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs select-none p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                자동화 동작 상태 상세 검토
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                안전한 물리 하드웨어 제어를 위한 2단계 사용자 확인
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 상세 분석 내용 */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="font-semibold text-slate-500">요청 동작:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-blue-500" />
              {servoName} 90° 환기 개방
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="font-semibold text-slate-500">감지 센서:</span>
            <span className="font-mono font-bold text-rose-600 flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-rose-500" />
              DHT11 실내 온도 28.4℃
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="font-semibold text-slate-500">기준 임계치:</span>
            <span className="font-mono text-slate-700 font-medium">
              최대 권장 온도 26.0℃ (+2.4℃ 초과)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">제어 하드웨어:</span>
            <span className="font-mono text-slate-700 font-medium">
              SG90 서보모터 (Pico 2 W · GP16 PWM)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 text-[11px] text-blue-900 leading-relaxed">
          ℹ️ <strong>안전 제어 철학:</strong> 한컴 노마디안 및 본 IoT 플랫폼은 돌이킬 수 없는 물리적 동작(문 열림, 장비 가동, 전원 차단 등)에 대해 항상 사용자의 최종 승인을 거치도록 설계되어 있습니다.
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            닫기
          </button>
          <button
            onClick={() => {
              onApprove();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>승인 및 지금 실행</span>
          </button>
        </div>
      </div>
    </div>
  );
}
