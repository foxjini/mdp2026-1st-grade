'use client';

import React, { useState } from 'react';
import { Paperclip, Send, Sparkles } from 'lucide-react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { useRoomDevices } from '@/core/rooms/useRoomDevices';
import { describeCustom } from '@/core/rooms/devices';

interface PromptBarProps {
  onFeedbackMessage?: (msg: string) => void;
}

export function PromptBar({ onFeedbackMessage }: PromptBarProps) {
  const [inputText, setInputText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const setServoAngle = useIoTStore((s) => s.setServoAngle);
  const setRgbColor = useIoTStore((s) => s.setRgbColor);
  const setRgbState = useIoTStore((s) => s.setRgbState);
  const sensors = useIoTStore((s) => s.sensors);
  const customSensors = useIoTStore((s) => s.customSensors);
  const addLog = useIoTStore((s) => s.addLog);
  const devices = useRoomDevices();

  const reply = (msg: string, type: 'success' | 'info' | 'warn' = 'success') => {
    addLog(type, `Pico AI 코어: "${msg}"`, 'SYSTEM');
    if (onFeedbackMessage) onFeedbackMessage(msg);
  };

  // 이 공간에 없는 기본 장치면 명령 대신 안내 (스토어 가드와 같은 기준)
  const missing = (device: 'sg90' | 'rgb') => {
    if (devices[device]) return false;
    reply(
      `이 공간의 Pico 에는 ${device === 'sg90' ? 'SG90 서보모터가' : 'RGB LED가'} 연결되어 있지 않습니다. 3D 화면의 우리 팀 장치를 클릭해 조작하세요.`,
      'warn'
    );
    return true;
  };

  const setColor = (color: string, name: string) => {
    if (missing('rgb')) return;
    setRgbColor(color);
    setRgbState('ON');
    reply(`LED 색상을 ${name}(으)로 설정했습니다.`);
  };

  // 현재 공간에서 쓰는 센서 값만 답함 (기본 센서 + 팀 확장 센서)
  const statusMessage = () => {
    const parts: string[] = [];
    if (devices.dht11) {
      parts.push(
        sensors.dht11_temp.isStale
          ? '온습도 수신 대기'
          : `온도 ${sensors.dht11_temp.value.toFixed(1)}℃, 습도 ${sensors.dht11_humi.value.toFixed(0)}%`
      );
    }
    if (devices.cds) parts.push(sensors.cds_light.isStale ? '조도 수신 대기' : `조도 ${sensors.cds_light.value} ADC`);
    devices.customDefs.forEach((def) => parts.push(`${def.name} ${describeCustom(def, customSensors[def.key]).text}`));
    return parts.length ? `현재 ${parts.join(', ')} 입니다.` : '이 공간에는 표시할 센서가 없습니다.';
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    setIsReplying(true);
    addLog('info', `사용자 프롬프트 명령: "${text}"`, 'USER');

    const lower = text.toLowerCase();

    setTimeout(() => {
      setIsReplying(false);

      if (lower.includes('온도') || lower.includes('습도') || lower.includes('상태') || lower.includes('날씨') || lower.includes('센서')) {
        reply(statusMessage());
      } else if (lower.includes('열') || lower.includes('open') || lower.includes('90')) {
        if (missing('sg90')) return;
        setServoAngle(90);
        reply(devices.isUploaded ? '서보모터를 90°로 돌렸습니다.' : '스마트 도어를 90도로 개방했습니다.');
      } else if (lower.includes('닫') || lower.includes('close') || lower.includes('0도')) {
        if (missing('sg90')) return;
        setServoAngle(0);
        reply(devices.isUploaded ? '서보모터를 0°로 돌렸습니다.' : '스마트 도어를 닫았습니다.');
      } else if (lower.includes('불 꺼') || lower.includes('조명 꺼') || lower.includes('off')) {
        if (missing('rgb')) return;
        setRgbState('OFF');
        reply('LED 를 껐습니다.');
      } else if (lower.includes('불 켜') || lower.includes('조명 켜') || lower.includes('on')) {
        if (missing('rgb')) return;
        setRgbState('ON');
        reply('LED 를 켰습니다.');
      } else if (lower.includes('빨간') || lower.includes('레드') || lower.includes('red')) {
        setColor('#EF4444', '선셋 레드');
      } else if (lower.includes('파란') || lower.includes('블루') || lower.includes('blue')) {
        setColor('#3B82F6', '오션 블루');
      } else if (lower.includes('초록') || lower.includes('그린') || lower.includes('green')) {
        setColor('#10B981', '네온 에메랄드');
      } else if (lower.includes('보라') || lower.includes('퍼플') || lower.includes('purple')) {
        setColor('#A855F7', '로맨틱 퍼플');
      } else {
        reply(`명령 "${text}"을(를) 이해하지 못했습니다. 예: "문 열어줘", "조명 파란색", "현재 상태 어때?"`, 'info');
      }
    }, 350);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4 pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-full border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] px-3 py-2 flex items-center gap-2.5 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
        {/* @Pico 태그 뱃지 */}
        <div className="flex items-center gap-1.5 bg-slate-950 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shrink-0 cursor-pointer hover:bg-slate-800 transition-colors">
          <span>@Pico</span>
        </div>

        {/* 텍스트 입력 필드 */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            isReplying
              ? 'Pico 2 W가 명령을 분석하여 제어하는 중입니다...'
              : '무엇이든 명령하세요 — 예: "문 90도 열어줘", "조명 파란색 켜줘", "현재 온도 어때?"'
          }
          disabled={isReplying}
          className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 font-medium outline-none"
        />

        {/* 첨부파일 클립 아이콘 */}
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          title="파일/규칙 첨부"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* 전송 버튼 (종이비행기) */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!inputText.trim() || isReplying}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            inputText.trim() && !isReplying
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              : 'text-slate-300 hover:text-slate-400'
          }`}
          title="명령 전송"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
