'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Coffee,
  Clock,
  Plus,
  MoreVertical,
  SlidersHorizontal,
  Bell,
  BellOff,
  Edit2,
  Copy,
  Trash2,
  X,
  Upload,
  Wifi,
} from 'lucide-react';
import { BaseDeviceId, RoomConnection, RoomIconType } from '@/core/types/iot';
import { ROOM_ICONS } from './roomIcons';

// 공간마다 Pico 2 W 1대: picoIp / mode 는 공간별로 저장되어 공간 선택 시 자동 연결
export interface RoomItem extends RoomConnection {
  id: string;
  name: string;
  sensorsDesc: string;
  iconType: RoomIconType;
  iconBg: string;
  iconColor: string;
  hasNotification?: boolean;
  // builtin: 플랫폼 기본 예제 공간 / uploaded: 팀이 '새 공간 추가'로 만든 공간 (rooms-data/)
  source: 'builtin' | 'uploaded';
  // 기본 예제 꾸러미 공간 (source 는 uploaded 로 꾸러미를 불러오지만 이름 변경 · 삭제 · 업로드 불가, 복제 가능)
  isExample?: boolean;
  team?: string;
  // 업로드 공간의 room.json baseDevices (기본 예제 공간은 생략 = 4종 모두)
  baseDevices?: BaseDeviceId[];
}

interface RoomsSidebarProps {
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onOpenAddRoomModal: () => void;
  onOpenScheduleModal: () => void;
  onOpenDeviceManageModal?: () => void;
  onToggleNotification?: (roomId: string) => void;
  onRenameRoom?: (roomId: string, newName: string) => void;
  onDuplicateRoom?: (roomId: string) => void;
  onDeleteRoom?: (roomId: string) => void;
  onOpenCodeModal?: (roomId: string) => void;
  onOpenConnectionModal?: (roomId: string) => void;
  onCopyRoomId?: (roomId: string) => void;
  /** 공간 목록 패널 접기 (3D 화면 넓게) */
  onCollapse?: () => void;
  roomList: RoomItem[];
}

export function RoomsSidebar({
  activeRoomId,
  onSelectRoom,
  onOpenAddRoomModal,
  onOpenScheduleModal,
  onOpenDeviceManageModal = () => {},
  onToggleNotification = () => {},
  onRenameRoom = () => {},
  onDuplicateRoom = () => {},
  onDeleteRoom = () => {},
  onOpenCodeModal = () => {},
  onOpenConnectionModal = () => {},
  onCopyRoomId = () => {},
  onCollapse = () => {},
  roomList,
}: RoomsSidebarProps) {
  // 열려있는 점 3개 메뉴의 공간 ID
  const [openMenuRoomId, setOpenMenuRoomId] = useState<string | null>(null);

  // 이름 수정 모달 대상 공간 및 텍스트
  const [renameModalRoom, setRenameModalRoom] = useState<RoomItem | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!openMenuRoomId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.room-dropdown-menu') && !target.closest('.room-menu-trigger')) {
        setOpenMenuRoomId(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [openMenuRoomId]);

  const handleStartRename = (room: RoomItem) => {
    setRenameModalRoom(room);
    setRenameInput(room.name);
    setOpenMenuRoomId(null);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameModalRoom && renameInput.trim()) {
      onRenameRoom(renameModalRoom.id, renameInput.trim());
    }
    setRenameModalRoom(null);
  };

  return (
    <>
      <aside className="w-[280px] h-full flex flex-col bg-[#F8FAFC] border-r border-slate-200/80 p-4 gap-3.5 shrink-0 overflow-y-auto select-none relative z-20">
        {/* 1. 상단 타이틀 */}
        <div className="flex items-center gap-2 pt-1 pb-0.5">
          <button
            onClick={onCollapse}
            className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 flex items-center justify-center transition-all shadow-2xs"
            title="공간 목록 접기 ([)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
            스마트 공간 목록
          </h2>
        </div>

        {/* 2. 상단 퀵 카드 2종 (메인 허브 & 자동화 스케줄) */}
        <div className="flex flex-col gap-2.5">
          {/* 거실 메인 라운지 카드 */}
          <div
            onClick={() => onSelectRoom('builtin_home')}
            className="group p-3 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-amber-700 shrink-0">
              <Coffee className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate">
                메인 라운지 (거실)
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                4개 장치 연결 · 3개 센서 정상
              </span>
            </div>
          </div>

          {/* 자동화 스케줄 카드 (클릭 시 스케줄 모달 오픈) */}
          <div
            onClick={onOpenScheduleModal}
            className="group p-3 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate">
                자동화 스케줄
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                5개 규칙 실행 중 · 총 6개 등록
              </span>
            </div>
          </div>
        </div>

        {/* 3. 공간 목록 섹션 헤더 & 카운터 */}
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 tracking-wider pt-2">
          <span>공간 목록</span>
          <span>{roomList.length}개 구역</span>
        </div>

        {/* 4. + 새 공간 추가 점선 버튼 */}
        <button
          onClick={onOpenAddRoomModal}
          className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300/90 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-400 hover:bg-white transition-all flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>새 공간 추가</span>
        </button>

        {/* 5. 공간 리스트 아이템들 */}
        <div className="flex flex-col gap-2">
          {roomList.map((room) => {
            const isSelected = activeRoomId === room.id;
            const isMenuOpen = openMenuRoomId === room.id;

            return (
              <div
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`group relative p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between border ${
                  isSelected
                    ? 'bg-white border-blue-300/80 shadow-[0_4px_14px_rgba(0,0,0,0.04)] ring-1 ring-blue-500/20'
                    : 'bg-white/80 hover:bg-white border-slate-200/70 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* 룸 아이콘 */}
                  <div
                    className={`relative w-8 h-8 rounded-xl ${room.iconBg} ${room.iconColor} flex items-center justify-center shrink-0`}
                  >
                    {(() => {
                      const RoomIcon = (ROOM_ICONS[room.iconType] || ROOM_ICONS.sparkles).Icon;
                      return <RoomIcon className="w-4 h-4" />;
                    })()}

                    {/* 빨간 알림 뱃지 점 */}
                    {room.hasNotification && (
                      <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                    )}
                  </div>

                  {/* 룸 정보 */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {room.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1">
                      <span
                        className={`shrink-0 px-1.5 rounded-md text-[9px] font-bold ${
                          room.source === 'builtin' || room.isExample ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {room.source === 'builtin' || room.isExample ? '예제' : room.team || '팀'}
                      </span>
                      <span className="truncate">{room.sensorsDesc}</span>
                    </span>
                    {/* 이 공간의 Pico 2 W 연결 (공간 선택 시 자동 연결) */}
                    <span
                      className={`mt-0.5 text-[10px] font-mono font-bold truncate flex items-center gap-1 ${
                        room.mode === 'hardware' ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      <Wifi className="w-3 h-3 shrink-0" />
                      {room.mode === 'hardware' ? `Pico ${room.picoIp}` : `시뮬레이션${room.picoIp ? ` · ${room.picoIp}` : ''}`}
                    </span>
                  </div>
                </div>

                {/* 우측 더보기 메뉴 (점 3개 아이콘) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuRoomId(isMenuOpen ? null : room.id);
                  }}
                  className={`room-menu-trigger p-1 rounded-lg transition-colors shrink-0 ${
                    isMenuOpen
                      ? 'bg-slate-200 text-slate-900'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title={`${room.name} 공간 메뉴`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* 점 3개 클릭 시 열리는 플로팅 옵션 메뉴 드롭다운 */}
                {isMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="room-dropdown-menu absolute right-2 top-11 z-50 w-44 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 py-1.5 px-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* 0. 팀 코드 업로드 (업로드 공간 전용) */}
                    {room.source === 'uploaded' && (
                      <button
                        onClick={() => {
                          onSelectRoom(room.id);
                          onOpenCodeModal(room.id);
                          setOpenMenuRoomId(null);
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>{room.isExample ? '코드 보기 · 내려받기' : '코드 업로드 · 관리'}</span>
                      </button>
                    )}

                    {/* 0-1. 이 공간의 Pico 2 W 연결 설정 */}
                    <button
                      onClick={() => {
                        onSelectRoom(room.id);
                        onOpenConnectionModal(room.id);
                        setOpenMenuRoomId(null);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Pico 연결 설정</span>
                    </button>

                    {/* 0-2. 공간 ID 복사 (펌웨어 묶기 · mock 서버 --room 에 사용) */}
                    <button
                      onClick={() => {
                        onCopyRoomId(room.id);
                        setOpenMenuRoomId(null);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>공간 ID 복사</span>
                    </button>

                    {/* 1. 장치 구성 관리 */}
                    <button
                      onClick={() => {
                        onSelectRoom(room.id);
                        onOpenDeviceManageModal();
                        setOpenMenuRoomId(null);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                      <span>장치 구성 관리</span>
                    </button>

                    {/* 2. 알림 켜기/끄기 */}
                    <button
                      onClick={() => {
                        onToggleNotification(room.id);
                        setOpenMenuRoomId(null);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
                    >
                      {room.hasNotification ? (
                        <>
                          <BellOff className="w-3.5 h-3.5 text-slate-400" />
                          <span>알림 해제</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5 text-amber-500" />
                          <span>알림 켜기</span>
                        </>
                      )}
                    </button>

                    {/* 3. 이름 바꾸기 */}
                    <button
                      onClick={() => handleStartRename(room)}
                      disabled={room.isExample}
                      title={room.isExample ? '기본 예제 공간은 이름을 바꿀 수 없습니다. 복제해서 쓰세요.' : undefined}
                      className="disabled:opacity-40 disabled:hover:bg-transparent w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>이름 바꾸기</span>
                    </button>

                    {/* 4. 공간 복제하기 */}
                    <button
                      onClick={() => {
                        onDuplicateRoom(room.id);
                        setOpenMenuRoomId(null);
                      }}
                      disabled={room.source === 'builtin'}
                      title={room.source === 'builtin' ? '기본 예제 공간은 복제할 수 없습니다.' : undefined}
                      className="disabled:opacity-40 disabled:hover:bg-transparent w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-500" />
                      <span>공간 복제하기</span>
                    </button>

                    <div className="h-px bg-slate-100 my-0.5" />

                    {/* 5. 공간 삭제 */}
                    <button
                      onClick={() => {
                        onDeleteRoom(room.id);
                        setOpenMenuRoomId(null);
                      }}
                      disabled={room.source === 'builtin' || room.isExample}
                      title={room.source === 'builtin' || room.isExample ? '기본 예제 공간은 삭제할 수 없습니다.' : undefined}
                      className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>공간 삭제</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* 공간 이름 바꾸기 팝업 모달 */}
      {renameModalRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs select-none p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    공간 이름 바꾸기
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    프로젝트 구역 명칭을 수정합니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRenameModalRoom(null)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">새 공간 명칭</label>
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-blue-500 bg-slate-50 text-slate-900"
                  placeholder="예: 스마트 팜 온실 1호기"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRenameModalRoom(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all"
                >
                  저장 및 적용
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
