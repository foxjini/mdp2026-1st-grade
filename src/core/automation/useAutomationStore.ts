// 자동화 규칙 켜기/끄기(공간마다 따로) · 실행 기록 · 사용자 확인(승인) 요청 상태
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ApprovalState {
  status: 'pending' | 'approved';
  message: string;      // 비어 있으면 인스펙터 기본 데모 문구
  ruleId?: string;      // 자동화 규칙이 요청한 경우
}

// 공간마다 따로 저장 (한 팀이 끈 규칙이 다른 팀 공간에서는 그대로 켜져 있게). 저장값이 없으면 켜짐
const DEFAULT_ROOM = '__default';

interface AutomationState {
  /** 지금 보고 있는 공간 ID (page.tsx 가 공간을 고를 때 설정) */
  roomId: string;
  activeByRoom: Record<string, Record<string, boolean>>;
  lastRun: Record<string, number>;
  approval: ApprovalState;
  setRoomId: (roomId: string) => void;
  /** 지금 공간에서 이 규칙이 켜져 있는지 */
  isActive: (ruleId: string) => boolean;
  /** 지금 공간에서만 켜기/끄기 */
  setActive: (id: string, on: boolean) => void;
  markRun: (id: string) => void;
  requestApproval: (message: string, ruleId?: string) => void;
  resolveApproval: () => void;
}

export const useAutomationStore = create<AutomationState>()(
  persist(
    (set, get) => ({
      roomId: DEFAULT_ROOM,
      activeByRoom: {},
      lastRun: {},
      approval: { status: 'pending', message: '' },
      setRoomId: (roomId) => set({ roomId }),
      isActive: (ruleId) => {
        const { activeByRoom, roomId } = get();
        return activeByRoom[roomId]?.[ruleId] ?? activeByRoom[DEFAULT_ROOM]?.[ruleId] ?? true;
      },
      setActive: (id, on) =>
        set((s) => ({
          activeByRoom: { ...s.activeByRoom, [s.roomId]: { ...s.activeByRoom[s.roomId], [id]: on } },
        })),
      markRun: (id) => set((s) => ({ lastRun: { ...s.lastRun, [id]: Date.now() } })),
      requestApproval: (message, ruleId) => set({ approval: { status: 'pending', message, ruleId } }),
      resolveApproval: () => set((s) => ({ approval: { ...s.approval, status: 'approved' } })),
    }),
    {
      name: 'iot-automation-rules',
      storage: createJSONStorage(() => localStorage),
      // 규칙 켜기/끄기만 저장 (승인 · 실행 기록은 실행할 때마다 새로)
      partialize: (s) => ({ activeByRoom: s.activeByRoom }),
      version: 1,
      // 예전(전시 PC 전체 공통) 값은 모든 공간의 기본값으로
      migrate: (persisted, version) => {
        const old = persisted as { active?: Record<string, boolean>; activeByRoom?: Record<string, Record<string, boolean>> };
        if (version < 1 && old?.active) return { activeByRoom: { [DEFAULT_ROOM]: old.active } };
        return { activeByRoom: old?.activeByRoom ?? {} };
      },
    }
  )
);
