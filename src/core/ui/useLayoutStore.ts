// 좌 · 우 패널 서랍 접힘 상태 (3D 화면을 넓게 보기) · 전시용 작품 자동 순환. 이 PC 의 localStorage 에 저장
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const CYCLE_SECONDS = [15, 30, 60] as const;
export type CycleSeconds = (typeof CYCLE_SECONDS)[number];

interface LayoutState {
  leftOpen: boolean;
  rightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  setRightOpen: (open: boolean) => void;
  /** 전시회: 공간 목록의 학생 작품을 교대로 화면에 표시 */
  autoCycle: boolean;
  cycleSeconds: CycleSeconds;
  setAutoCycle: (on: boolean) => void;
  setCycleSeconds: (s: CycleSeconds) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftOpen: true,
      rightOpen: true,
      toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
      toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
      setRightOpen: (rightOpen) => set({ rightOpen }),
      autoCycle: false,
      cycleSeconds: 30,
      setAutoCycle: (autoCycle) => set({ autoCycle }),
      setCycleSeconds: (cycleSeconds) => set({ cycleSeconds }),
    }),
    {
      name: 'iot-layout',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ leftOpen: s.leftOpen, rightOpen: s.rightOpen, autoCycle: s.autoCycle, cycleSeconds: s.cycleSeconds }),
    }
  )
);
