'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';
import {
  announce,
  isSpeechSupported,
  stopSpeaking,
  useVoiceStore,
  VOICE_CATEGORY_LABELS,
  VoiceCategory,
  pickVoice,
  useKoreanVoices,
  voiceLabel,
} from '@/core/voice/voice';

// NavRail 스피커 버튼 → 음성 안내 설정 (전체 on/off · 항목 · 속도 · 들어 보기)
export function VoiceControl() {
  const { enabled: savedEnabled, categories, rate, pitch, voiceURI, lastSpoken, lastVoice, setEnabled, setCategory, setRate, setPitch, setVoiceURI } =
    useVoiceStore();
  const koVoices = useKoreanVoices();
  const recommended = koVoices.length ? pickVoice('') : null;
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  // 저장된 설정(localStorage)은 브라우저에서만 읽히므로 마운트 뒤에 반영 (서버 렌더와 어긋나지 않게)
  const [mounted, setMounted] = useState(false);
  const enabled = mounted && savedEnabled;
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setSupported(isSpeechSupported());
  }, []);

  // 바깥을 누르면 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (next) announce(null, '음성 안내를 켰습니다.', true);
    else stopSpeaking();
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
          enabled
            ? 'bg-blue-50 text-blue-600 border border-blue-200'
            : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-xs'
        }`}
        title={enabled ? '음성 안내 켜짐 (설정)' : '음성 안내 꺼짐 (설정)'}
        aria-label="음성 안내 설정"
      >
        {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-3 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 flex flex-col gap-3 z-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-slate-900">음성 안내</div>
              <div className="text-[10px] text-slate-400">승인 요청 · 제어 · 자동화 · 연결 상태를 말로 알려 줍니다</div>
            </div>
            <button
              onClick={toggle}
              role="switch"
              aria-checked={enabled}
              aria-label="음성 안내 켜기/끄기"
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {!supported && (
            <p className="text-[11px] text-rose-600 font-semibold">이 브라우저는 음성 안내(Web Speech)를 지원하지 않습니다. 크롬 · 엣지를 사용하세요.</p>
          )}

          <div className={`flex flex-col gap-1.5 ${enabled ? '' : 'opacity-50'}`}>
            <span className="text-[11px] font-bold text-slate-500">안내할 항목</span>
            {(Object.keys(VOICE_CATEGORY_LABELS) as VoiceCategory[]).map((c) => (
              <label key={c} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={categories[c]}
                  disabled={!enabled}
                  onChange={(e) => setCategory(c, e.target.checked)}
                  className="accent-blue-600"
                />
                {VOICE_CATEGORY_LABELS[c]}
              </label>
            ))}
          </div>

          {/* 목소리: 자동 = Google 한국의(크롬 · 밝은 여성) 우선 */}
          <div className={`flex flex-col gap-1 ${enabled ? '' : 'opacity-50'}`}>
            <span className="text-[11px] font-bold text-slate-500">목소리</span>
            <select
              value={voiceURI}
              disabled={!enabled}
              onChange={(e) => setVoiceURI(e.target.value)}
              aria-label="목소리 선택"
              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
            >
              <option value="">자동 (추천: {recommended ? recommended.name : '브라우저 기본'})</option>
              {koVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                  {v.localService ? '' : ' · 온라인'}
                  {v === recommended ? ' ⭐' : ''}
                </option>
              ))}
            </select>
            {mounted && supported && koVoices.length === 0 && (
              <span className="text-[10px] text-amber-700 leading-relaxed">
                한국어 목소리를 찾지 못했습니다. 윈도우 설정 → 시간 및 언어 → 음성에서 한국어 음성을 설치하거나 크롬 · 엣지 최신 버전을 쓰세요.
              </span>
            )}
          </div>

          <div className={`flex flex-col gap-1 ${enabled ? '' : 'opacity-50'}`}>
            <span className="text-[11px] font-bold text-slate-500">목소리 높낮이 {pitch.toFixed(2)} (높을수록 밝게)</span>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={pitch}
              disabled={!enabled}
              onChange={(e) => setPitch(Number(e.target.value))}
              aria-label="목소리 높낮이"
              className="w-full accent-blue-600"
            />
          </div>

          <div className={`flex flex-col gap-1 ${enabled ? '' : 'opacity-50'}`}>
            <span className="text-[11px] font-bold text-slate-500">말하기 속도 {rate.toFixed(1)}배</span>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.1"
              value={rate}
              disabled={!enabled}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <button
            onClick={() => announce(null, '음성 안내 테스트입니다. 전시장에서 잘 들리는지 확인하세요.', true)}
            disabled={!supported}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> 들어 보기
          </button>

          <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
            <b className="text-slate-600">지금 목소리:</b>{' '}
            <span data-testid="current-voice">{voiceLabel(koVoices.length ? pickVoice(voiceURI) : null)}</span>
            {lastVoice && lastVoice !== voiceLabel(koVoices.length ? pickVoice(voiceURI) : null) && (
              <span className="text-slate-400"> (마지막 안내: {lastVoice})</span>
            )}
            {lastSpoken && (
              <>
                <br />
                <b className="text-slate-600">최근 안내:</b> {lastSpoken}
              </>
            )}
          </p>
          <p className="text-[10px] text-slate-400">설정은 이 PC 에 저장됩니다. 새로고침 후에는 화면을 한 번 클릭해야 소리가 납니다.</p>
        </div>
      )}
    </div>
  );
}
