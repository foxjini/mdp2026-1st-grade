'use client';

import React, { useEffect, useState } from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { RoomConnection } from '@/core/types/iot';
import { Wifi, X, Check, Radio } from 'lucide-react';

interface PicoIpModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 공간마다 Pico 2 W 1대: 현재 공간의 이름과 저장된 연결 설정
  roomName: string;
  connection: RoomConnection;
  onSave: (conn: RoomConnection) => Promise<boolean>;
}

export function PicoIpModal({ isOpen, onClose, roomName, connection, onSave }: PicoIpModalProps) {
  const mode = useIoTStore((s) => s.mode);
  const connectionState = useIoTStore((s) => s.connectionState);

  const [tempIp, setTempIp] = useState(connection.picoIp);
  const [saving, setSaving] = useState(false);

  // 모달을 열 때마다 현재 공간의 저장된 IP 로 초기화
  useEffect(() => {
    if (isOpen) setTempIp(connection.picoIp);
  }, [isOpen, connection.picoIp]);

  if (!isOpen) return null;

  const save = async (conn: RoomConnection) => {
    setSaving(true);
    const ok = await onSave(conn);
    setSaving(false);
    if (ok) onClose();
  };

  const handleSave = () => save({ picoIp: tempIp.trim(), mode: 'hardware' });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs select-none p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                <span className="text-blue-600">{roomName}</span> 의 Pico 2 W 연결
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                공간마다 Pico 2 W 1대 · 공간을 선택하면 이 IP로 자동 연결됩니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 연결 상태 요약 */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">현재 통신 상태:</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-emerald-500'
                  : connectionState === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-bold text-slate-800">
              {mode === 'simulation'
                ? '가상 시뮬레이터 (Mock)'
                : connectionState === 'connected'
                ? 'Pico 2 W 연결 성공'
                : 'Pico 2 W 연결 대기'}
            </span>
          </div>
        </div>

        {/* IP 입력 폼 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700">
            Raspberry Pi Pico 2 W Wi-Fi IP 주소
          </label>
          <div className="relative">
            <input
              type="text"
              value={tempIp}
              onChange={(e) => setTempIp(e.target.value)}
              placeholder="예: 192.168.0.51 (연습: 127.0.0.1:5051)"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <span className="text-[11px] text-slate-400">
            * 이 공간 전용 Pico 2 W의 시리얼 모니터에 출력된 IP(또는 settings.toml 의 PICO_STATIC_IP)를 입력하세요.
            다른 공간과 같은 IP를 쓰면 안 됩니다.
          </span>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => save({ picoIp: tempIp.trim(), mode: 'simulation' })}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            이 공간은 시뮬레이션으로
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !tempIp.trim()}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Pico 2 W 연결 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
}
