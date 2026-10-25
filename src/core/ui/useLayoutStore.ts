// 좌 · 우 패널 서랍 접힘 상태 (3D 화면을 넓게 보기). 이 PC 의 localStorage 에 저장
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LayoutState {
  leftOpen: boolean;
  rightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  setRightOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftOpen: true,
      rightOpen: true,
      toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
      toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
      setRightOpen: (rightOpen) => set({ rightOpen }),
    }),
    {
      name: 'iot-layout',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ leftOpen: s.leftOpen, rightOpen: s.rightOpen }),
    }
  )
);
