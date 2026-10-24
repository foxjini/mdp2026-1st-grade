'use client';

import React, { useEffect, useRef } from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { MockIoTAdapter } from '@/core/adapter/MockIoTAdapter';
import { CircuitPythonAdapter } from '@/core/adapter/CircuitPythonAdapter';
import { IIoTAdapter } from '@/core/adapter/IIoTAdapter';

export function IoTProvider({ children }: { children: React.ReactNode }) {
  const mode = useIoTStore((s) => s.mode);
  // 시뮬레이션에서는 IP 가 바뀌어도 어댑터를 다시 만들지 않음 (mock.js 상태가 초기화되지 않도록)
  const picoIpAddress = useIoTStore((s) => (s.mode === 'hardware' ? s.picoIpAddress : ''));
  const currentAdapterRef = useRef<IIoTAdapter | null>(null);

  useEffect(() => {
    // 이전 어댑터 정리
    if (currentAdapterRef.current) {
      currentAdapterRef.current.destroy();
    }

    // 모드에 따라 새 어댑터 인스턴스화
    const adapter: IIoTAdapter =
      mode === 'simulation' ? new MockIoTAdapter() : new CircuitPythonAdapter();

    currentAdapterRef.current = adapter;
    adapter.init();

    // Zustand 스토어의 액션과 실제 어댑터 연결
    const unsubscribe = useIoTStore.subscribe((state, prevState) => {
      // 1. 서보모터 명령 변경 감지
      if (
        state.actuators.sg90_door.pending &&
        !prevState.actuators.sg90_door.pending
      ) {
        adapter.sendServoCommand(state.actuators.sg90_door.targetAngle);
      }

      // 2. RGB LED 명령 변경 감지
      if (
        state.actuators.rgb_light.pending &&
        !prevState.actuators.rgb_light.pending
      ) {
        adapter.sendRgbCommand(
          state.actuators.rgb_light.targetColor,
          state.actuators.rgb_light.targetState
        );
      }

      // 3. 팀 확장 명령 (sendCommand) 감지
      if (state.lastCommand && state.lastCommand !== prevState.lastCommand) {
        adapter.sendCommand(state.lastCommand);
      }
    });

    return () => {
      unsubscribe();
      adapter.destroy();
    };
  }, [mode, picoIpAddress]);

  return <>{children}</>;
}
