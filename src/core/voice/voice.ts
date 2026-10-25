// 음성 안내 (브라우저 내장 Web Speech API · ko-KR). 설정은 이 PC 의 localStorage 에 저장
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
  lastSpoken: string;
  setEnabled: (enabled: boolean) => void;
  setCategory: (category: VoiceCategory, on: boolean) => void;
  setRate: (rate: number) => void;
  setLastSpoken: (text: string) => void;
}

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      enabled: false,
      categories: { approval: true, control: true, automation: true, connection: true },
      rate: 1.05,
      lastSpoken: '',
      setEnabled: (enabled) => set({ enabled }),
      setCategory: (category, on) => set((s) => ({ categories: { ...s.categories, [category]: on } })),
      setRate: (rate) => set({ rate }),
      setLastSpoken: (lastSpoken) => set({ lastSpoken }),
    }),
    {
      name: 'iot-voice-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ enabled: s.enabled, categories: s.categories, rate: s.rate }),
    }
  )
);

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

const recent = new Map<string, number>(); // 같은 문장 4초 안 반복 방지
let queued = 0;

/** 지금 설정(전체 · 항목)이 켜져 있으면 문장을 읽음. force: 설정 창의 [들어 보기] 등 항목과 관계없이 */
export function announce(category: VoiceCategory | null, text: string, force = false): void {
  const s = useVoiceStore.getState();
  if (!force && (!s.enabled || (category && !s.categories[category]))) return;
  if (!isSpeechSupported() || !text) return;

  const now = Date.now();
  if ((recent.get(text) || 0) > now - 4000) return;
  recent.set(text, now);

  const synth = window.speechSynthesis;
  // 대기 문장이 너무 쌓이면 오래된 것을 버리고 최신 상황만
  if (queued >= 3) {
    synth.cancel();
    queued = 0;
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ko-KR';
  utter.rate = s.rate;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('ko'));
  if (voice) utter.voice = voice;
  utter.onend = utter.onerror = () => {
    queued = Math.max(0, queued - 1);
  };
  queued += 1;
  synth.speak(utter);
  s.setLastSpoken(text);
}

/** 음성 안내를 끄면 읽던 문장도 멈춤 */
export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
  queued = 0;
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
