// 자동화 규칙 켜기/끄기 · 실행 기록 · 사용자 확인(승인) 요청 상태
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AUTOMATION_RULES } from './rules';

export interface ApprovalState {
  status: 'pending' | 'approved';
  message: string;      // 비어 있으면 인스펙터 기본 데모 문구
  ruleId?: string;      // 자동화 규칙이 요청한 경우
}

interface AutomationState {
  active: Record<string, boolean>;
  lastRun: Record<string, number>;
  approval: ApprovalState;
  setActive: (id: string, on: boolean) => void;
  markRun: (id: string) => void;
  requestApproval: (message: string, ruleId?: string) => void;
  resolveApproval: () => void;
}

export const useAutomationStore = create<AutomationState>()(
  persist(
    (set) => ({
      active: Object.fromEntries(AUTOMATION_RULES.map((r) => [r.id, true])),
      lastRun: {},
      approval: { status: 'pending', message: '' },
      setActive: (id, on) => set((s) => ({ active: { ...s.active, [id]: on } })),
      markRun: (id) => set((s) => ({ lastRun: { ...s.lastRun, [id]: Date.now() } })),
      requestApproval: (message, ruleId) => set({ approval: { status: 'pending', message, ruleId } }),
      resolveApproval: () => set((s) => ({ approval: { ...s.approval, status: 'approved' } })),
    }),
    {
      name: 'iot-automation-rules',
      storage: createJSONStorage(() => localStorage),
      // 규칙 켜기/끄기만 저장 (승인 · 실행 기록은 실행할 때마다 새로)
      partialize: (s) => ({ active: s.active }),
    }
  )
);
