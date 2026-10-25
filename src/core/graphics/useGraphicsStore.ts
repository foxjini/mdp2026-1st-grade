// 3D 그래픽 품질 (고급: 환경광 · SSAO · 블룸 · SMAA / 절전: 기본 조명만). 이 PC 의 localStorage 에 저장
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type GraphicsQuality = 'high' | 'low';

interface GraphicsState {
  quality: GraphicsQuality;
  autoLowered: boolean; // FPS 가 떨어져 자동으로 절전으로 낮췄는지
  setQuality: (quality: GraphicsQuality) => void;
  lowerAutomatically: () => void;
}

export const useGraphicsStore = create<GraphicsState>()(
  persist(
    (set) => ({
      quality: 'high',
      autoLowered: false,
      setQuality: (quality) => set({ quality, autoLowered: false }),
      lowerAutomatically: () => set({ quality: 'low', autoLowered: true }),
    }),
    {
      name: 'iot-graphics',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ quality: s.quality }),
    }
  )
);
