'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Leaf } from 'lucide-react';
import { useGraphicsStore } from '@/core/graphics/useGraphicsStore';

// 캔버스 왼쪽 아래: 고급 그래픽(환경광 · SSAO · 블룸) ↔ 절전 (느린 PC)
export function GraphicsToggle() {
  const { quality: saved, autoLowered, setQuality } = useGraphicsStore();
  // 저장된 값(localStorage)은 브라우저에서만 읽히므로 마운트 뒤 반영
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const high = !mounted || saved === 'high';

  return (
    <button
      onClick={() => setQuality(high ? 'low' : 'high')}
      className={`px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_14px_rgba(0,0,0,0.08)] border transition-all flex items-center gap-1.5 ${
        high ? 'bg-white/95 text-slate-700 border-slate-200/80 hover:text-blue-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}
      title={
        high
          ? '고급 그래픽 사용 중 (환경광 · 앰비언트 오클루전 · 블룸). 누르면 절전 모드'
          : `절전 그래픽${autoLowered ? ' (화면이 느려져 자동으로 전환됨)' : ''}. 누르면 고급 그래픽`
      }
    >
      {high ? <Sparkles className="w-3.5 h-3.5 text-amber-500" /> : <Leaf className="w-3.5 h-3.5" />}
      <span>{high ? '고급 그래픽' : autoLowered ? '절전 (자동)' : '절전 그래픽'}</span>
    </button>
  );
}
