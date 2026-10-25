'use client';

// 제어 동작 · 연결 상태 음성 안내: IoT 스토어 변화를 구독 (IoTProvider 와 같은 방식)
// Pico 폴링 · mock.js 가 스스로 바꾼 상태(syncReportedActuators)는 자주 바뀌므로 읽지 않음
import { useEffect } from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { announce, colorName, isAutomationAck, prepareVoices } from '@/core/voice/voice';

export function VoiceAnnouncer() {
  useEffect(() => {
    prepareVoices();
    return useIoTStore.subscribe((s, prev) => {
      const uploaded = !!s.activeRoomPackage;
      const servoName = uploaded ? '서보모터' : '스마트 도어';
      const door = s.actuators.sg90_door;
      const prevDoor = prev.actuators.sg90_door;
      const rgb = s.actuators.rgb_light;
      const prevRgb = prev.actuators.rgb_light;

      // 1. 서보 명령 완료 / 실패
      if (prevDoor.pending && !door.pending) {
        if (door.errorMessage) announce('control', `${servoName} 명령이 실패했습니다.`);
        else if (!isAutomationAck('sg90')) announce('control', `${servoName}를 ${door.reportedAngle}도로 움직였습니다.`);
      }

      // 2. RGB 명령 완료 / 실패
      if (prevRgb.pending && !rgb.pending) {
        if (rgb.errorMessage) announce('control', '조명 명령이 실패했습니다.');
        else if (!isAutomationAck('rgb')) {
          announce('control', rgb.reportedState === 'OFF' ? '조명을 껐습니다.' : `조명을 ${colorName(rgb.reportedColor, true)} 켰습니다.`);
        }
      }

      // 3. 팀 확장 명령 결과
      const result = s.lastCommandResult;
      if (result && result !== prev.lastCommandResult) {
        announce('control', `확장 명령 ${result.action} ${result.ok ? '처리 완료' : '실패'}.`);
      }

      // 4. Pico 연결 상태 (하드웨어 모드에서 바뀔 때만)
      if (s.mode === 'hardware' && s.connectionState !== prev.connectionState) {
        if (s.connectionState === 'connected') announce('connection', 'Pico 2 W에 연결되었습니다.');
        else if (s.connectionState === 'error') announce('connection', 'Pico 2 W가 응답하지 않습니다. 전원과 와이파이를 확인하세요.');
      }
    });
  }, []);

  return null;
}
