// 부스 전시 모드 켜기/끄기 (전체화면 + 화면 꺼짐 방지). NavRail · 플랫폼 소개 창 공용
import { useCallback } from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';

export function useExhibitionToggle() {
  const isExhibitionMode = useIoTStore((s) => s.isExhibitionMode);
  const setExhibitionMode = useIoTStore((s) => s.setExhibitionMode);

  const toggleExhibition = useCallback(async () => {
    if (!isExhibitionMode) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        if ('wakeLock' in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Fullscreen/WakeLock error:', err);
      }
      setExhibitionMode(true);
    } else {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setExhibitionMode(false);
    }
  }, [isExhibitionMode, setExhibitionMode]);

  return { isExhibitionMode, toggleExhibition };
}
