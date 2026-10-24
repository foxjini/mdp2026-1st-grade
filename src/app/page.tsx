'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { NavRail } from '@/components/ui/NavRail';
import { RoomsSidebar, RoomItem } from '@/components/ui/RoomsSidebar';
import { CenterHeader } from '@/components/ui/CenterHeader';
import { InspectorPanel } from '@/components/ui/InspectorPanel';
import { SensorOutputPanel } from '@/components/ui/SensorOutputPanel';
import { ControlLogPanel } from '@/components/ui/ControlLogPanel';
import { PromptBar } from '@/components/ui/PromptBar';
import { PicoIpModal } from '@/components/ui/PicoIpModal';
import { DeviceManageModal } from '@/components/ui/DeviceManageModal';
import { ScheduleModal } from '@/components/ui/ScheduleModal';
import { AddRoomModal } from '@/components/ui/AddRoomModal';
import { RoomCodeModal } from '@/components/ui/RoomCodeModal';
import { ReviewModal } from '@/components/ui/ReviewModal';
import { ExhibitionOverlay } from '@/components/ui/ExhibitionOverlay';
import { useIoTStore } from '@/core/store/useIoTStore';
import { RoomPackage } from '@/core/types/iot';
import { BUILTIN_ROOMS, metaToRoomItem, roomsApi } from '@/core/rooms/roomsApi';
import { Loader2, ArrowLeft, SlidersHorizontal, Calendar, Eye } from 'lucide-react';

// R3F 3D Canvas는 브라우저 전용이므로 SSR 완전 해제
const SceneCanvas = dynamic(
  () => import('@/components/3d/SceneCanvas').then((mod) => mod.SceneCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#EFF2F6] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-semibold tracking-wide text-slate-700">
          스마트홈 3D 가상 공간 렌더링 중...
        </span>
      </div>
    ),
  }
);


export default function HomePage() {
  const [activeRoomId, setActiveRoomId] = useState('builtin_home');
  const [roomList, setRoomList] = useState<RoomItem[]>(BUILTIN_ROOMS);
  const [activeNavTab, setActiveNavTab] = useState('space');
  const [activeCenterTab, setActiveCenterTab] = useState<'inspector' | 'output' | 'thread'>('inspector');

  // 3D 카메라 뷰 프리셋 상태 (default: 입체 투시각도, overview: 상공 전체 조감도)
  const [cameraPreset, setCameraPreset] = useState<'default' | 'overview'>('default');
  const [cameraTrigger, setCameraTrigger] = useState(0);

  // 모달 상태 관리
  const [showIpModal, setShowIpModal] = useState(false);
  const [showDeviceManageModal, setShowDeviceManageModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved'>('pending');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const setServoAngle = useIoTStore((s) => s.setServoAngle);
  const addLog = useIoTStore((s) => s.addLog);
  const activeRoomPackage = useIoTStore((s) => s.activeRoomPackage);
  const setActiveRoomPackage = useIoTStore((s) => s.setActiveRoomPackage);

  const currentRoom = roomList.find((r) => r.id === activeRoomId) || roomList[0];

  const handleApproveProposal = () => {
    setApprovalStatus('approved');
    setServoAngle(90);
    addLog('success', '스마트 환기 제어 요청 승인: 스마트 도어가 90°로 개방되었습니다.', 'USER');
    showToast('승인 완료: 스마트 도어가 90°로 개방되었습니다.');
  };

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // 전시 PC(rooms-data/)에 저장된 팀 공간 목록 불러오기
  const refreshRooms = useCallback(async () => {
    try {
      const metas = await roomsApi.list();
      setRoomList([...BUILTIN_ROOMS, ...metas.map(metaToRoomItem)]);
    } catch (err) {
      addLog('warn', `팀 공간 목록을 불러오지 못했습니다: ${err instanceof Error ? err.message : err}`, 'SYSTEM');
    }
  }, [addLog]);

  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

  // 업로드 공간을 선택하면 꾸러미(Scene.tsx · mock.js 등)를 불러와 스토어에 적용
  useEffect(() => {
    if (activeRoomId.startsWith('builtin_')) {
      setActiveRoomPackage(null);
      return;
    }
    let cancelled = false;
    roomsApi
      .get(activeRoomId)
      .then((pkg) => !cancelled && setActiveRoomPackage(pkg))
      .catch((err) => {
        if (cancelled) return;
        setActiveRoomPackage(null);
        addLog('error', `공간 코드를 불러오지 못했습니다: ${err instanceof Error ? err.message : err}`, 'SYSTEM');
      });
    return () => {
      cancelled = true;
    };
  }, [activeRoomId, setActiveRoomPackage, addLog]);

  const applyPackage = (pkg: RoomPackage) => {
    setRoomList((prev) => {
      const item = metaToRoomItem(pkg.meta);
      return prev.some((r) => r.id === item.id) ? prev.map((r) => (r.id === item.id ? item : r)) : [...prev, item];
    });
    if (pkg.meta.id === activeRoomId) setActiveRoomPackage(pkg);
  };

  const handleRoomCreated = (pkg: RoomPackage) => {
    applyPackage(pkg);
    setActiveRoomId(pkg.meta.id);
    setActiveRoomPackage(pkg);
    setShowAddRoomModal(false);
    setShowCodeModal(true);
    showToast(`새 공간 "${pkg.meta.name}"이(가) 만들어졌습니다. 이제 코드를 업로드하세요.`);
    addLog('info', `새 팀 공간 등록: ${pkg.meta.name} (${pkg.meta.team || '팀 미정'})`, 'USER');
  };

  const findRoom = (roomId: string) => roomList.find((r) => r.id === roomId);

  // 좌측 NavRail 탭 전환 및 3D 가상 공간 뷰 포커스 핸들러
  const handleNavTabChange = (tab: string) => {
    setActiveNavTab(tab);
    if (tab === 'telemetry') {
      setActiveCenterTab('output');
      showToast('실시간 센서 텔레메트리 출력 모드로 전환되었습니다.');
    } else if (tab === 'control') {
      setActiveCenterTab('inspector');
      showToast('하드웨어 액추에이터 제어 인스펙터로 전환되었습니다.');
    } else if (tab === 'space') {
      // 3D 가상 공간 뷰 버튼: 3D 기본 투시 시점으로 카메라 부드럽게 리셋
      setCameraPreset('default');
      setCameraTrigger((prev) => prev + 1);
      showToast(`${currentRoom.name} 3D 가상 공간 기본 투시 뷰로 시점이 복귀되었습니다.`);
    }
  };

  // 중앙 하단 전체 조감도 토글 핸들러
  const handleToggleOverview = () => {
    if (cameraPreset === 'overview') {
      setCameraPreset('default');
      setCameraTrigger((prev) => prev + 1);
      showToast(`${currentRoom.name} 기본 입체 투시 시점으로 복귀했습니다.`);
    } else {
      setCameraPreset('overview');
      setCameraTrigger((prev) => prev + 1);
      showToast(`${currentRoom.name} 상공 전체 조감도(Top-down) 시점으로 전환되었습니다.`);
    }
  };

  // 공간 3-dot 더보기 메뉴 액션 핸들러들
  const handleToggleNotification = (roomId: string) => {
    const target = findRoom(roomId);
    if (target?.source === 'uploaded') {
      roomsApi.patch(roomId, { hasNotification: !target.hasNotification }).then(applyPackage).catch(() => {});
    }
    setRoomList((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          const next = !r.hasNotification;
          showToast(`"${r.name}" 알림이 ${next ? '활성화' : '해제'}되었습니다.`);
          return { ...r, hasNotification: next };
        }
        return r;
      })
    );
  };

  const handleRenameRoom = (roomId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (findRoom(roomId)?.source === 'uploaded') {
      roomsApi
        .patch(roomId, { name: trimmed })
        .then(applyPackage)
        .catch((err) => showToast(`이름 변경 실패: ${err.message}`));
    }
    setRoomList((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, name: trimmed } : r))
    );
    showToast(`공간 이름이 "${trimmed}"(으)로 변경되었습니다.`);
    addLog('info', `공간 이름 변경: ${trimmed}`, 'USER');
  };

  const handleDuplicateRoom = async (roomId: string) => {
    const target = findRoom(roomId);
    if (!target || target.source !== 'uploaded') {
      showToast('기본 예제 공간은 복제할 수 없습니다. "새 공간 추가"를 사용하세요.');
      return;
    }
    try {
      const pkg = await roomsApi.duplicate(roomId);
      applyPackage(pkg);
      setActiveRoomId(pkg.meta.id);
      showToast(`"${target.name}" 공간이 복제되었습니다.`);
      addLog('info', `팀 공간 복제: ${pkg.meta.name}`, 'USER');
    } catch (err) {
      showToast(`복제 실패: ${err instanceof Error ? err.message : err}`);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    const target = findRoom(roomId);
    if (!target || target.source !== 'uploaded') {
      showToast('기본 예제 공간은 삭제할 수 없습니다.');
      return;
    }
    if (!window.confirm(`"${target.name}" 공간과 업로드된 코드를 모두 삭제할까요?`)) return;
    try {
      await roomsApi.remove(roomId);
      setRoomList((prev) => prev.filter((r) => r.id !== roomId));
      if (activeRoomId === roomId) setActiveRoomId(BUILTIN_ROOMS[0].id);
      showToast(`"${target.name}"이(가) 삭제되었습니다.`);
      addLog('info', `공간 삭제: ${target.name}`, 'USER');
    } catch (err) {
      showToast(`삭제 실패: ${err instanceof Error ? err.message : err}`);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#EFF2F6] text-slate-800 flex select-none">
      {/* 1. 최좌측 슬림 세로 내비게이션 레일 (NavRail) */}
      <NavRail
        activeNavTab={activeNavTab}
        setActiveNavTab={handleNavTabChange}
        onOpenIpModal={() => setShowIpModal(true)}
      />

      {/* 2. 좌측 모니터링 공간 목록 사이드바 (스마트 공간) */}
      <RoomsSidebar
        activeRoomId={activeRoomId}
        roomList={roomList}
        onSelectRoom={(id) => {
          setActiveRoomId(id);
          setCameraPreset('default');
          setCameraTrigger((prev) => prev + 1);
          const found = roomList.find((r) => r.id === id);
          if (found) showToast(`"${found.name}" 구역으로 모니터링이 전환되었습니다.`);
        }}
        onOpenAddRoomModal={() => setShowAddRoomModal(true)}
        onOpenScheduleModal={() => setShowScheduleModal(true)}
        onOpenDeviceManageModal={() => setShowDeviceManageModal(true)}
        onToggleNotification={handleToggleNotification}
        onRenameRoom={handleRenameRoom}
        onDuplicateRoom={handleDuplicateRoom}
        onDeleteRoom={handleDeleteRoom}
        onOpenCodeModal={() => setShowCodeModal(true)}
      />

      {/* 3. 중앙 3D 가상 공간 워크스페이스 */}
      <section className="flex-1 flex flex-col relative h-full overflow-hidden bg-gradient-to-b from-[#F2F4F8] via-[#EDF1F7] to-[#E6EBF2]">
        {/* 상단 헤더 (공간명, 실시간 인디케이터, 세그먼트 탭 필) */}
        <CenterHeader
          roomName={currentRoom.name}
          activeTab={activeCenterTab}
          onTabChange={setActiveCenterTab}
          onOpenIpModal={() => setShowIpModal(true)}
        />

        {/* 메인 3D 가상 공간 캔버스 */}
        <div className="flex-1 relative w-full h-full overflow-hidden">
          <SceneCanvas
            roomId={activeRoomId}
            roomPackage={activeRoomPackage}
            approvalStatus={approvalStatus}
            onApprove={handleApproveProposal}
            onReview={() => setShowReviewModal(true)}
            cameraPreset={cameraPreset}
            cameraTrigger={cameraTrigger}
            isModalOpen={
              showIpModal ||
              showDeviceManageModal ||
              showScheduleModal ||
              showAddRoomModal ||
              showReviewModal ||
              showCodeModal
            }
          />

          {/* 3D 뷰 캔버스 하단 오버레이 버튼들 */}
          {/* 좌하단: 전체 조감도 토글 버튼 (입체 투시 ↔ 상공 탑다운 조감도) */}
          <div className="absolute left-6 bottom-6 z-10 pointer-events-auto">
            <button
              onClick={handleToggleOverview}
              className={`px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_14px_rgba(0,0,0,0.08)] border transition-all flex items-center gap-1.5 ${
                cameraPreset === 'overview'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/25 ring-2 ring-blue-400/30'
                  : 'bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 border-slate-200/80'
              }`}
              title={cameraPreset === 'overview' ? '기본 입체 투시 뷰로 복귀' : `${currentRoom.name} 상공 전체 조감도 시점`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{cameraPreset === 'overview' ? '기본 입체 뷰' : '전체 조감도'}</span>
            </button>
          </div>

          {/* 우하단: 장치 관리 & 스케줄 캘린더 */}
          <div className="absolute right-6 bottom-6 z-10 pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setShowDeviceManageModal(true)}
              className="px-4 py-2 rounded-full bg-white/90 hover:bg-white text-xs font-bold text-slate-700 shadow-[0_4px_14px_rgba(0,0,0,0.06)] border border-slate-200/80 transition-all flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>장치 관리</span>
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 shadow-[0_4px_14px_rgba(0,0,0,0.06)] border border-slate-200/80 transition-all flex items-center justify-center"
              title="자동화 스케줄"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          {/* 하단 중앙 플로팅 프롬프트 바 (@Pico — 무엇이든 명령하세요) */}
          <PromptBar onFeedbackMessage={showToast} />
        </div>
      </section>

      {/* 4. 우측 탭 연동 패널: 장치 인스펙터 vs 센서 출력 vs 제어 로그 */}
      {activeCenterTab === 'inspector' && (
        <InspectorPanel
          approvalStatus={approvalStatus}
          onApproveProposal={handleApproveProposal}
          onOpenReviewModal={() => setShowReviewModal(true)}
        />
      )}

      {activeCenterTab === 'output' && <SensorOutputPanel />}

      {activeCenterTab === 'thread' && <ControlLogPanel />}

      {/* 5. 피드백 토스트 알림 */}
      {feedbackToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-2.5 rounded-full shadow-2xl text-xs font-bold tracking-tight flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* 6. 모달 4종 (Pico IP, 장치 관리, 자동화 스케줄, 새 공간 추가, 상태 검토) */}
      <PicoIpModal
        isOpen={showIpModal}
        onClose={() => setShowIpModal(false)}
      />

      <DeviceManageModal
        isOpen={showDeviceManageModal}
        onClose={() => setShowDeviceManageModal(false)}
        onFeedbackMessage={showToast}
        onOpenCodeModal={() => setShowCodeModal(true)}
        onOpenAddRoomModal={() => setShowAddRoomModal(true)}
      />

      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      />

      <AddRoomModal
        isOpen={showAddRoomModal}
        onClose={() => setShowAddRoomModal(false)}
        onCreated={handleRoomCreated}
      />

      <RoomCodeModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        pkg={activeRoomPackage}
        onPackageChange={applyPackage}
        onFeedbackMessage={showToast}
      />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onApprove={handleApproveProposal}
      />

      {/* 7. 부스 전시 모드 오버레이 */}
      <ExhibitionOverlay />
    </main>
  );
}
