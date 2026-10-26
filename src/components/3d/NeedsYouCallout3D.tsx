'use client';

import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { X } from 'lucide-react';
import { useAutomationStore } from '@/core/automation/useAutomationStore';
import { useRoomDevices } from '@/core/rooms/useRoomDevices';

interface NeedsYouCallout3DProps {
  onApprove: () => void;
  onReview?: () => void;
  approvalStatus: 'pending' | 'approved';
  isModalOpen?: boolean;
}

export function NeedsYouCallout3D({
  onApprove,
  onReview,
  approvalStatus,
  isModalOpen = false,
}: NeedsYouCallout3DProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const approvalMessage = useAutomationStore((s) => s.approval.message);
  const { servoName } = useRoomDevices();

  // 승인 완료 상태 시 4.5초 후 자동 숨김
  useEffect(() => {
    if (approvalStatus === 'approved') {
      const timer = setTimeout(() => {
        setIsDismissed(true);
      }, 4500);
      return () => clearTimeout(timer);
    } else {
      setIsDismissed(false);
    }
  }, [approvalStatus]);

  // 모달이 열려있거나 사용자가 닫았으면 3D 오버레이 렌더링 중단
  if (isModalOpen || isDismissed) {
    return null;
  }

  if (approvalStatus === 'approved') {
    return (
      <Html position={[0.2, 1.85, 0.2]} center distanceFactor={7} zIndexRange={[10, 0]}>
        <div className="bg-white rounded-2xl px-3.5 py-2 border-2 border-emerald-500 shadow-xl pointer-events-auto flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 animate-in fade-in zoom-in-95 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span className="text-xs font-bold text-slate-900 whitespace-nowrap">
            ✅ 승인 완료! {servoName} 90° 개방 실행됨
          </span>
          <button
            onClick={() => setIsDismissed(true)}
            className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shrink-0 ml-1"
            title="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </Html>
    );
  }

  return (
    <Html position={[0.1, 1.95, 0.1]} center distanceFactor={7} zIndexRange={[10, 0]}>
      <div className="relative select-none pointer-events-auto filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-200">
        {/* 말풍선 본체 카드 */}
        <div className="w-[285px] bg-white rounded-2xl p-3.5 border-2 border-slate-900 flex flex-col gap-2.5 relative z-10">
          {/* 상단 뱃지 & 타임라인 & 닫기 */}
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-950 text-white font-black text-[9px] tracking-wide">
              승인 필요
            </span>
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              스마트 환기 제어
            </span>
            <button
              onClick={() => setIsDismissed(true)}
              className="ml-auto text-slate-400 hover:text-slate-700 w-4 h-4 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
              title="닫기"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* 본문 텍스트 */}
          <p className="text-[11px] text-slate-800 font-semibold leading-relaxed">
            {approvalMessage || `실내 온도가 높습니다. 쾌적한 실내 환경을 위해 ${servoName}를 90°로 개방할까요?`}
          </p>

          {/* 하단 액션 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-0.5">
            <button
              onClick={onReview}
              className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
            >
              상태 검토
            </button>
            <button
              onClick={onApprove}
              className="px-3.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold transition-colors border border-blue-200"
            >
              동작 승인
            </button>
          </div>
        </div>

        {/* 말풍선 꼬리침 */}
        <div className="absolute left-12 -bottom-2.5 z-20 pointer-events-none">
          <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
            <path
              d="M0 0L11 11L22 0H0Z"
              fill="#FFFFFF"
              stroke="#0F172A"
              strokeWidth="2"
            />
            <rect x="1" y="0" width="20" height="2" fill="#FFFFFF" />
          </svg>
        </div>
      </div>
    </Html>
  );
}
