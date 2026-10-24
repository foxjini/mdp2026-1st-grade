import { create } from 'zustand';

// 업로드 공간의 Scene.tsx 적용 상태 (3D 캔버스 밖 UI에서 오류 표시용)
export interface SceneStatus {
  roomId: string | null;
  state: 'empty' | 'ok' | 'error';
  message?: string;
}

export const useSceneStatus = create<SceneStatus & { setStatus: (s: SceneStatus) => void }>((set) => ({
  roomId: null,
  state: 'empty',
  setStatus: (s) => set(s),
}));
