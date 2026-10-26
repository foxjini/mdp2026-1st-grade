'use client';

import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { BaseDeviceId, BASE_DEVICE_IDS, BASE_DEVICE_INFO, RoomIconType, RoomPackage } from '@/core/types/iot';
import { roomsApi } from '@/core/rooms/roomsApi';
import { ROOM_ICONS, ROOM_ICON_TYPES } from './roomIcons';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 1단계(공간 생성) 완료 → 부모가 2단계(코드 업로드 모달)를 엽니다.
  onCreated: (pkg: RoomPackage) => void;
}

export function AddRoomModal({ isOpen, onClose, onCreated }: AddRoomModalProps) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [sensorsDesc, setSensorsDesc] = useState('');
  const [iconType, setIconType] = useState<RoomIconType>('sparkles');
  // 이 공간 전용 Pico 2 W 에 실제로 연결하는 기본 장치 / Pico IP (비우면 시뮬레이션)
  const [baseDevices, setBaseDevices] = useState<BaseDeviceId[]>([...BASE_DEVICE_IDS]);
  const [picoIp, setPicoIp] = useState('');
  const [servoName, setServoName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const pkg = await roomsApi.create({
        name: name.trim(),
        team: team.trim(),
        sensorsDesc: sensorsDesc.trim() || '팀 프로젝트 공간',
        iconType,
        baseDevices,
        servoName: baseDevices.includes('sg90') ? servoName.trim() : '',
        picoIp: picoIp.trim(),
        mode: picoIp.trim() ? 'hardware' : 'simulation',
      });
      setName('');
      setTeam('');
      setSensorsDesc('');
      setPicoIp('');
      setServoName('');
      setBaseDevices([...BASE_DEVICE_IDS]);
      onCreated(pkg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '공간 생성 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs select-none p-4">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                새 공간 추가 <span className="text-blue-600">(1/2 공간 정보)</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                팀 프로젝트 공간을 만든 뒤, 바이브 코딩으로 만든 코드를 업로드합니다.
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

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">공간 및 구역 명칭</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 스마트 펫룸, 베란다 수경재배 온실"
              required
              maxLength={40}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">팀 이름</label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="예: 1학년 3반 2팀"
              maxLength={40}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">배치 센서 및 장치 설명</label>
            <input
              type="text"
              value={sensorsDesc}
              onChange={(e) => setSensorsDesc(e.target.value)}
              placeholder="예: 온습도 센서 · 급식기 서보모터"
              maxLength={60}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">대표 아이콘 선택 (10종)</label>
            <div className="grid grid-cols-5 gap-2">
              {ROOM_ICON_TYPES.map((type) => ({ type, ...ROOM_ICONS[type] })).map(({ type, label, Icon: IconComponent }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setIconType(type)}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    iconType === type
                      ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-2xs font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-[10px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              우리 팀 Pico 2 W 에 연결할 기본 장치
              <span className="ml-1 font-medium text-slate-400">(연결하지 않는 장치의 핀은 확장 부품에 사용 가능)</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {BASE_DEVICE_IDS.map((id) => {
                const checked = baseDevices.includes(id);
                return (
                  <label
                    key={id}
                    className={`px-2.5 py-2 rounded-xl border text-[11px] flex items-center gap-2 cursor-pointer ${
                      checked ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setBaseDevices((prev) =>
                          checked ? prev.filter((d) => d !== id) : BASE_DEVICE_IDS.filter((d) => d === id || prev.includes(d))
                        )
                      }
                    />
                    <span>{BASE_DEVICE_INFO[id].name}</span>
                    <code className="ml-auto text-[10px] text-slate-400">{BASE_DEVICE_INFO[id].pins.join('/')}</code>
                  </label>
                );
              })}
            </div>
          </div>

          {baseDevices.includes('sg90') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                서보모터(SG90) 이름 <span className="font-medium text-slate-400">(선택 · 인스펙터 · 음성 안내에 표시)</span>
              </label>
              <input
                type="text"
                value={servoName}
                maxLength={20}
                onChange={(e) => setServoName(e.target.value)}
                placeholder="예: 급식기 뚜껑, 환기창, 주차 차단기 (비우면 '서보모터')"
                className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              우리 팀 Pico 2 W IP <span className="font-medium text-slate-400">(선택 · 비우면 시뮬레이션으로 시작)</span>
            </label>
            <input
              type="text"
              value={picoIp}
              onChange={(e) => setPicoIp(e.target.value)}
              placeholder="예: 192.168.0.51"
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {error && (
            <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* 하단 버튼 */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              공간 생성 후 코드 업로드 →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
