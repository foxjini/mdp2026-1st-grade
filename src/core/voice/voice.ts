// 음성 안내 (브라우저 내장 Web Speech API · ko-KR). 설정은 이 PC 의 localStorage 에 저장
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type VoiceCategory = 'approval' | 'control' | 'automation' | 'connection';

export const VOICE_CATEGORY_LABELS: Record<VoiceCategory, string> = {
  approval: '사용자 확인(승인) 요청',
  control: '제어 동작 결과',
  automation: '자동화 스케줄 동작',
  connection: 'Pico 연결 상태',
};

interface VoiceState {
  enabled: boolean;
  categories: Record<VoiceCategory, boolean>;
  rate: number;
  pitch: number;          // 1.15 = 조금 높고 밝게
  voiceURI: string;       // '' = 자동 추천 (Google 한국의 우선)
  lastSpoken: string;
  lastVoice: string;      // 실제로 읽은 목소리 이름 (설정 창 표시)
  // 지금 말하는 중인지 (도슨트 입모양 · 자막). 저장하지 않음
  speaking: boolean;
  speakingText: string;
  boundaryAt: number;     // 마지막 단어 경계 시각 (performance.now)
  setEnabled: (enabled: boolean) => void;
  setCategory: (category: VoiceCategory, on: boolean) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVoiceURI: (voiceURI: string) => void;
  setLastSpoken: (text: string, voice: string) => void;
}

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      enabled: false,
      categories: { approval: true, control: true, automation: true, connection: true },
      rate: 1.1,
      pitch: 1.15,
      voiceURI: '',
      lastSpoken: '',
      lastVoice: '',
      speaking: false,
      speakingText: '',
      boundaryAt: 0,
      setEnabled: (enabled) => set({ enabled }),
      setCategory: (category, on) => set((s) => ({ categories: { ...s.categories, [category]: on } })),
      setRate: (rate) => set({ rate }),
      setPitch: (pitch) => set({ pitch }),
      setVoiceURI: (voiceURI) => set({ voiceURI }),
      setLastSpoken: (lastSpoken, lastVoice) => set({ lastSpoken, lastVoice }),
    }),
    {
      name: 'iot-voice-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ enabled: s.enabled, categories: s.categories, rate: s.rate, pitch: s.pitch, voiceURI: s.voiceURI }),
    }
  )
);

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

// ------------------------------------------------------------------------------
// 목소리 목록: 크롬은 목록을 늦게 불러오므로(voiceschanged) 받을 때마다 다시 읽음
// ------------------------------------------------------------------------------
let voices: SpeechSynthesisVoice[] = [];
let voicesInit = false;
let onlineFailed = false; // 온라인 목소리(Google)가 한 번 실패하면 이 세션은 로컬 목소리 우선
const voiceListeners = new Set<() => void>();

/** 앱이 열릴 때 바로 목록을 요청 (첫 안내 전에 Google 목소리 목록이 준비되도록) */
export function prepareVoices(): void {
  initVoices();
}

function initVoices(): void {
  if (voicesInit || !isSpeechSupported()) return;
  voicesInit = true;
  const synth = window.speechSynthesis;
  const load = () => {
    voices = synth.getVoices() || [];
    voiceListeners.forEach((fn) => fn());
  };
  load();
  if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', load);
  else (synth as SpeechSynthesis).onvoiceschanged = load;
}

const isKorean = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-').startsWith('ko');

/** 추천 순서: Google 한국의(크롬 · 밝은 여성) → SunHi(엣지 Natural 여성) → Yuna(맥) → Heami(윈도우) → 기타, 남성 목소리는 뒤로 */
function voiceRank(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let rank = n.includes('google') ? 0 : n.includes('sunhi') ? 1 : n.includes('yuna') ? 2 : n.includes('heami') ? 3 : 5;
  if (/injoon|hyunsu|male|남성/.test(n)) rank = 9;
  if (onlineFailed && !v.localService) rank += 10;
  return rank;
}

export function getKoreanVoices(): SpeechSynthesisVoice[] {
  initVoices();
  return voices.filter(isKorean);
}

/** 고른 목소리(voiceURI) 또는 추천 목소리. 한국어 목소리가 없으면 null (브라우저 기본) */
export function pickVoice(voiceURI = ''): SpeechSynthesisVoice | null {
  const ko = getKoreanVoices();
  const chosen = voiceURI ? ko.find((v) => v.voiceURI === voiceURI) : undefined;
  if (chosen && !(onlineFailed && !chosen.localService)) return chosen;
  return [...ko].sort((a, b) => voiceRank(a) - voiceRank(b))[0] || null;
}

export function voiceLabel(v: SpeechSynthesisVoice | null): string {
  return v ? `${v.name}${v.localService ? '' : ' (온라인)'}` : '브라우저 기본 목소리';
}

/** 설정 창: 한국어 목소리 목록 (목록이 늦게 와도 다시 그림) */
export function useKoreanVoices(): SpeechSynthesisVoice[] {
  const [list, setList] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const update = () => setList(getKoreanVoices());
    voiceListeners.add(update);
    update();
    return () => {
      voiceListeners.delete(update);
    };
  }, []);
  return list;
}

// 목록이 아직 비어 있으면 voiceschanged 를 최대 2.5초 기다렸다가 읽음 (첫 안내가 기본 목소리로 나가지 않게)
let voicesWaited = false; // 목소리가 아예 없는 PC 에서 매번 기다리지 않도록 한 번만

function whenVoicesReady(fn: () => void): void {
  initVoices();
  if (voices.length || voicesWaited) return fn();
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    voicesWaited = true;
    voiceListeners.delete(run);
    fn();
  };
  voiceListeners.add(run);
  setTimeout(run, 2500);
}

const recent = new Map<string, number>(); // 같은 문장 4초 안 반복 방지
let queued = 0;

function speakNow(text: string, voice: SpeechSynthesisVoice | null, retried = false): void {
  const s = useVoiceStore.getState();
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ko-KR';
  utter.rate = s.rate;
  utter.pitch = s.pitch;
  if (voice) utter.voice = voice;
  const stopIfLast = () => {
    if (useVoiceStore.getState().speakingText === text) useVoiceStore.setState({ speaking: false });
  };
  // 도슨트 입모양 · 자막용 (onboundary 가 없는 목소리도 speaking 동안 입이 움직임)
  utter.onstart = () => useVoiceStore.setState({ speaking: true, speakingText: text, boundaryAt: performance.now() });
  utter.onboundary = () => useVoiceStore.setState({ boundaryAt: performance.now() });
  utter.onend = () => {
    queued = Math.max(0, queued - 1);
    stopIfLast();
  };
  utter.onerror = (e) => {
    queued = Math.max(0, queued - 1);
    stopIfLast();
    // 온라인 목소리(Google)가 인터넷 문제 등으로 실패하면 로컬 한국어 목소리로 한 번 다시
    const reason = (e as SpeechSynthesisErrorEvent).error;
    if (!retried && voice && !voice.localService && reason !== 'interrupted' && reason !== 'canceled') {
      onlineFailed = true;
      const local = pickVoice(s.voiceURI);
      if (local && local !== voice) speakNow(text, local, true);
    }
  };
  queued += 1;
  synth.speak(utter);
  s.setLastSpoken(text, voiceLabel(voice));
}

/** 지금 설정(전체 · 항목)이 켜져 있으면 문장을 읽음. force: 설정 창의 [들어 보기] 등 항목과 관계없이 */
export function announce(category: VoiceCategory | null, text: string, force = false): void {
  const s = useVoiceStore.getState();
  if (!force && (!s.enabled || (category && !s.categories[category]))) return;
  if (!isSpeechSupported() || !text) return;

  const now = Date.now();
  if ((recent.get(text) || 0) > now - 4000) return;
  recent.set(text, now);

  // 대기 문장이 너무 쌓이면 오래된 것을 버리고 최신 상황만
  if (queued >= 3) {
    window.speechSynthesis.cancel();
    queued = 0;
  }
  whenVoicesReady(() => speakNow(text, pickVoice(useVoiceStore.getState().voiceURI)));
}

/** 음성 안내를 끄면 읽던 문장도 멈춤 */
export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
  queued = 0;
  useVoiceStore.setState({ speaking: false });
}

// 자동화가 보낸 명령의 완료(ack)는 자동화 안내와 겹치므로 잠시 읽지 않음
const automationMarks: Partial<Record<'sg90' | 'rgb', number>> = {};

export function markAutomation(device: 'sg90' | 'rgb'): void {
  automationMarks[device] = Date.now();
}

export function isAutomationAck(device: 'sg90' | 'rgb'): boolean {
  return (automationMarks[device] || 0) > Date.now() - 5000;
}

// RGB 프리셋 색 이름 (인스펙터 · 명령창과 같은 색)
const COLOR_NAMES: Record<string, string> = {
  '#3B82F6': '오션 블루',
  '#FDE047': '웜 화이트',
  '#10B981': '네온 에메랄드',
  '#A855F7': '로맨틱 퍼플',
  '#EF4444': '선셋 레드',
};

/** withParticle: '오션 블루로' / '선택한 색으로' 처럼 조사까지 */
export function colorName(hex: string, withParticle = false): string {
  const name = COLOR_NAMES[hex.toUpperCase()];
  if (!withParticle) return name || '선택한 색';
  return name ? `${name}로` : '선택한 색으로';
}
