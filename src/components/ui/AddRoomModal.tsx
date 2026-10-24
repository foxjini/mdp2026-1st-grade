'use client';

import React, { useState } from 'react';
import { X, Plus, Home, Sprout, Factory, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { RoomIconType, RoomPackage } from '@/core/types/iot';
import { roomsApi } from '@/core/rooms/roomsApi';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 1단계(공간 생성) 완료 → 부모가 2단계(코드 업로드 모달)를 엽니다.
  onCreated: (pkg: RoomPackage) => void;
}

export function AddRoomModal({ isOpen, onClose, onCreated }: AddRoomModalProps) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [sensorsDesc, setSensorsDesc] = useState('');
  const [iconType, setIconType] = useState<RoomIconType>('sparkles');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const pkg = await roomsApi.create({
        name: name.trim(),
        team: team.trim(),
        sensorsDesc: sensorsDesc.trim() || '팀 프로젝트 공간',
        iconType,
      });
      setName('');
      setTeam('');
      setSensorsDesc('');
      onCreated(pkg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '공간 생성 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs select-none p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                새 공간 추가 <span className="text-blue-600">(1/2 공간 정보)</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                팀 프로젝트 공간을 만든 뒤, 바이브 코딩으로 만든 코드를 업로드합니다.
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

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">공간 및 구역 명칭</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 스마트 펫룸, 베란다 수경재배 온실"
              required
              maxLength={40}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">팀 이름</label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="예: 1학년 3반 2팀"
              maxLength={40}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">배치 센서 및 장치 설명</label>
            <input
              type="text"
              value={sensorsDesc}
              onChange={(e) => setSensorsDesc(e.target.value)}
              placeholder="예: 온습도 센서 · 급식기 서보모터"
              maxLength={60}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">대표 아이콘 선택</label>
            <div className="flex items-center gap-2">
              {[
                { type: 'home' as const, label: '거실/홈', icon: Home },
                { type: 'farm' as const, label: '팜/온실', icon: Sprout },
                { type: 'factory' as const, label: '공장', icon: Factory },
                { type: 'sparkles' as const, label: '조명', icon: Sparkles },
                { type: 'shield' as const, label: '보안', icon: ShieldCheck },
              ].map(({ type, label, icon: IconComponent }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setIconType(type)}
                  className={`flex-1 py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    iconType === type
                      ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-2xs font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-[10px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* 하단 버튼 */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              공간 생성 후 코드 업로드 →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
