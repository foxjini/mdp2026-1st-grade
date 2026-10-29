'use client';

import React, { useEffect, useState } from 'react';
import { X, Calendar, Play, Volume2, VolumeX } from 'lucide-react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { BASE_DEVICE_INFO } from '@/core/types/iot';
import { AUTOMATION_RULES, missingDevices } from '@/core/automation/rules';
import { useAutomationStore } from '@/core/automation/useAutomationStore';
import { runRuleNow } from '@/core/automation/useAutomationEngine';
import { useVoiceStore } from '@/core/voice/voice';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 자동화 스케줄 & 규칙: 켜 둔 규칙은 2초마다 지금 공간의 센서 · 시각을 검사해 실제로 실행 (useAutomationEngine)
export function ScheduleModal({ isOpen, onClose }: ScheduleModalProps) {
  const roomPackage = useIoTStore((s) => s.activeRoomPackage);
  const { lastRun, setActive, isActive: ruleActive } = useAutomationStore();
  useAutomationStore((s) => s.activeByRoom); // 켜기/끄기가 바뀌면 다시 그림
  const voiceOn = useVoiceStore((s) => s.enabled && s.categories.automation);
  const [result, setResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) setResult(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs select-none p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">스마트 공간 자동화 스케줄 & 규칙</h3>
              <p className="text-xs text-slate-400 font-medium">켜 둔 규칙은 지금 공간의 센서 · 시각을 2초마다 검사해 실제로 실행됩니다 · 켜기/끄기는 <b>이 공간에만</b> 적용</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                voiceOn ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
              title="왼쪽 메뉴의 스피커 버튼에서 바꿀 수 있습니다"
            >
              {voiceOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              {voiceOn ? '음성 안내 켜짐' : '음성 안내 꺼짐'}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 규칙 리스트 */}
        <div className="flex flex-col gap-2.5 overflow-y-auto">
          {AUTOMATION_RULES.map((rule) => {
            const isActive = ruleActive(rule.id);
            const missing = missingDevices(rule, roomPackage);
            const skipped = missing.length > 0;
            const devices = rule.anyDevices || rule.devices;
            const ran = lastRun[rule.id];
            return (
              <div
                key={rule.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isActive && !skipped ? 'bg-white border-slate-200/90 shadow-2xs' : 'bg-slate-50 border-slate-200/50'
                }`}
              >
                <div className={`flex flex-col min-w-0 ${isActive && !skipped ? '' : 'opacity-70'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 truncate">{rule.title}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        !isActive
                          ? 'bg-slate-200 text-slate-500'
                          : skipped
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {!isActive ? '비활성' : skipped ? `이 공간에서 건너뜀 (${missing.join(' · ')} 없음)` : '실행 중'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    <strong>조건:</strong> {rule.trigger}
                  </span>
                  <span className="text-[11px] text-blue-600 font-medium">
                    <strong>동작:</strong> {rule.action}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    필요 장치 {devices.map((d) => BASE_DEVICE_INFO[d].name).join(rule.anyDevices ? ' 또는 ' : ' · ')}
                    {ran ? ` · 마지막 실행 ${new Date(ran).toLocaleTimeString('ko-KR')}` : ''}
                  </span>
                  {result?.id === rule.id && (
                    <span className={`text-[10px] font-semibold mt-0.5 ${result.ok ? 'text-emerald-600' : 'text-amber-700'}`}>
                      {result.ok ? '▶ 테스트 실행: ' : '⚠ '}
                      {result.message}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setResult({ id: rule.id, ...runRuleNow(rule.id) })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center gap-1"
                    title="조건과 관계없이 지금 한 번 실행 (음성 안내 확인용)"
                  >
                    <Play className="w-3 h-3" /> 테스트 실행
                  </button>
                  {/* 토글 스위치 (이 PC 에 저장) */}
                  <button
                    onClick={() => setActive(rule.id, !isActive)}
                    role="switch"
                    aria-checked={isActive}
                    aria-label={`${rule.title} 켜기/끄기`}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 팁 안내 */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 leading-relaxed">
          ⚡ <strong>동작 방식:</strong> 센서 규칙은 조건이 <strong>처음 맞는 순간 한 번</strong> 실행되고, 조건이 풀렸다가 다시 맞으면 또 실행됩니다.
          시각 규칙은 그 시각에 하루 한 번 실행됩니다. 고온 규칙은 바로 움직이지 않고 오른쪽 패널에 <strong>사용자 확인(승인)</strong>을 요청합니다.
          이 공간에 없는 장치가 필요한 규칙은 건너뜁니다. 팀 고유의 자동 동작은 <code>code.py</code> 의 <code>read()</code> · mock.js 에 넣으세요.
        </div>

        {/* 하단 닫기 */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
