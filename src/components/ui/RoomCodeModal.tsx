'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  FileCode2,
  FileJson,
  Cpu,
  FlaskConical,
  Download,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ClipboardPaste,
  KeyRound,
  Wifi,
  Check,
} from 'lucide-react';
import { BASE_DEVICE_INFO, RoomFileName, RoomMeta, RoomPackage, ROOM_FILE_NAMES } from '@/core/types/iot';
import { roomsApi, getUploadKey, setUploadKey } from '@/core/rooms/roomsApi';
import {
  buildVibePrompt,
  codePyTemplate,
  mockTemplate,
  roomJsonTemplate,
  sceneTemplate,
} from '@/core/rooms/templates';
import { compileMock } from '@/core/runtime/mockRuntime';
import { useSceneStatus } from '@/core/runtime/useSceneStatus';

interface RoomCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: RoomPackage | null;
  onPackageChange: (pkg: RoomPackage) => void;
  onFeedbackMessage?: (msg: string) => void;
  onOpenConnection?: () => void;
}

const FILE_INFO: Record<RoomFileName, { label: string; desc: string; icon: React.ElementType; template: (m: RoomMeta) => string }> = {
  'room.json': { label: '공간 정보', desc: '이름 · 확장 센서 · 확장 핀', icon: FileJson, template: roomJsonTemplate },
  'Scene.tsx': { label: '3D 화면', desc: 'React Three Fiber 3D 공간', icon: FileCode2, template: sceneTemplate },
  'mock.js': { label: '시뮬레이션', desc: '하드웨어 없이 가짜 센서 값', icon: FlaskConical, template: mockTemplate },
  'code.py': { label: 'Pico 2 W 팀 모듈', desc: 'CircuitPython (우리 팀 Pico 펌웨어에 포함)', icon: Cpu, template: codePyTemplate },
};

function currentContent(pkg: RoomPackage, name: RoomFileName): string | undefined {
  return name === 'room.json' ? JSON.stringify(pkg.meta) : pkg.files[name];
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 업로드 전 브라우저에서 미리 검사 (오류가 있으면 업로드하지 않음)
async function precheck(name: RoomFileName, content: string): Promise<string | null> {
  if (!content.trim()) return `${name} 내용이 비어 있습니다.`;
  if (name === 'room.json') {
    try {
      JSON.parse(content);
    } catch (err) {
      return `room.json JSON 형식 오류: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  if (name === 'Scene.tsx') {
    // 3D 런타임(three/R3F)은 브라우저에서만 불러옵니다.
    const { compileScene } = await import('@/core/runtime/compileRoom');
    const r = compileScene(content);
    if (!r.ok) return r.error;
  }
  if (name === 'mock.js') {
    try {
      compileMock(content);
    } catch (err) {
      return `mock.js 오류: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  return null;
}

// 파일명 대소문자/확장자 차이 보정 (예: scene.tsx, Code.py)
function matchFileName(raw: string): RoomFileName | null {
  const lower = raw.toLowerCase();
  return ROOM_FILE_NAMES.find((n) => n.toLowerCase() === lower) || null;
}

export function RoomCodeModal({
  isOpen,
  onClose,
  pkg,
  onPackageChange,
  onFeedbackMessage = () => {},
  onOpenConnection = () => {},
}: RoomCodeModalProps) {
  const [busy, setBusy] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [idea, setIdea] = useState('');
  const [pasteTarget, setPasteTarget] = useState<RoomFileName>('Scene.tsx');
  const [pasteText, setPasteText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [needKey, setNeedKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneStatus = useSceneStatus();

  if (!isOpen || !pkg) return null;
  const meta = pkg.meta;
  const bundleCommand = `npm run firmware:bundle -- ${meta.id} E:\\`;

  // 펌웨어 묶기 · mock 서버 --room · AI 대화에 쓰는 공간 ID 복사
  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(meta.id);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
      onFeedbackMessage(`공간 ID "${meta.id}" 가 복사되었습니다.`);
    } catch {
      onFeedbackMessage(`공간 ID: ${meta.id} (클립보드를 쓸 수 없어 직접 복사하세요)`);
    }
  };

  const upload = async (files: Record<string, string>) => {
    const problems: string[] = [];
    for (const [name, content] of Object.entries(files)) {
      const p = await precheck(name as RoomFileName, content);
      if (p) problems.push(p);
    }
    if (problems.length) {
      setErrors(problems);
      return false;
    }
    setBusy(true);
    setErrors([]);
    try {
      const next = await roomsApi.upload(meta.id, files);
      onPackageChange(next);
      onFeedbackMessage(`${Object.keys(files).join(', ')} 업로드 완료 → 화면에 적용되었습니다.`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '업로드 실패';
      if (msg.includes('비밀번호')) setNeedKey(true);
      setErrors([msg]);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list || !list.length) return;
    const files: Record<string, string> = {};
    const unknown: string[] = [];
    for (const f of Array.from(list)) {
      const name = matchFileName(f.name);
      if (!name) unknown.push(f.name);
      else files[name] = await f.text();
    }
    if (unknown.length) {
      setErrors([`파일 이름은 ${ROOM_FILE_NAMES.join(', ')} 중 하나여야 합니다. (받은 파일: ${unknown.join(', ')})`]);
      return;
    }
    await upload(files);
  };

  const handlePasteUpload = async () => {
    if (await upload({ [pasteTarget]: pasteText })) setPasteText('');
  };

  const handleRemove = async (name: RoomFileName) => {
    setBusy(true);
    try {
      onPackageChange(await roomsApi.removeFile(meta.id, name));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : '삭제 실패']);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPrompt = async () => {
    let context = '';
    try {
      context = await fetch('/context_master.txt', { cache: 'no-store' }).then((r) => r.text());
    } catch {
      context = '[플랫폼 컨텍스트] context/PLATFORM_FULL_CONTEXT.md 내용을 함께 붙여 넣으세요.';
    }
    const prompt = buildVibePrompt(meta, context, idea);
    try {
      await navigator.clipboard.writeText(prompt);
      onFeedbackMessage('AI 프롬프트가 복사되었습니다. ChatGPT · Claude · Gemini 에 붙여 넣으세요.');
    } catch {
      downloadText(`${meta.id}_prompt.txt`, prompt);
      onFeedbackMessage('클립보드 사용이 막혀 프롬프트를 파일로 저장했습니다.');
    }
  };

  const statusForRoom = sceneStatus.roomId === meta.id ? sceneStatus : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs select-none p-4">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                코드 업로드 <span className="text-blue-600">(2/2)</span> · {meta.name}
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate">
                팀: {meta.team || '미정'} · 공간 ID <code className="font-mono text-slate-500 select-text">{meta.id}</code>
                <button
                  onClick={copyRoomId}
                  title="공간 ID 복사"
                  aria-label="공간 ID 복사"
                  className={`ml-1 inline-flex align-middle p-1 rounded-md border transition-colors ${
                    idCopied ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300'
                  }`}
                >
                  {idCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ① 바이브 코딩 프롬프트 */}
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 flex flex-col gap-2.5">
          <div className="text-xs font-extrabold text-indigo-900">① 아이디어 작성 → AI 프롬프트 복사</div>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={3}
            placeholder="예: 반려동물 급식기. 서보모터가 사료통 뚜껑을 열고, 조도가 어두우면 RGB LED를 주황색으로 켠다. 추가 센서로 사료 무게(load_weight, g)를 표시한다."
            className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 select-text"
          />
          <p className="text-[10px] text-indigo-800">
            💡 장면(위치 · 크기 · 색) · 숫자(기준값 · 각도 · 주기) · "만약 ~이면 ~한다" 규칙 · 상태별 변화 · 클릭 동작 · mock 시나리오를 적을수록
            작품이 좋아집니다. 자세한 작성법과 예시문: 매뉴얼 STEP 06 · 07
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyPrompt}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" /> AI 프롬프트 복사 (플랫폼 컨텍스트 포함)
            </button>
            <a
              href="/manual.html"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-50"
            >
              매뉴얼 열기
            </a>
          </div>
        </section>

        {/* 우리 팀 Pico 2 W (공간마다 1대) */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
            <Wifi className="w-4 h-4" /> 우리 팀 Pico 2 W
            <span className="ml-auto font-mono text-[11px] text-emerald-700">
              {meta.mode === 'hardware' ? `하드웨어 · ${meta.picoIp}` : `시뮬레이션${meta.picoIp ? ` · ${meta.picoIp}` : ' · IP 미지정'}`}
            </span>
            <button
              onClick={onOpenConnection}
              className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              연결 설정
            </button>
          </div>
          <p className="text-[11px] text-emerald-900">
            연결하는 기본 장치:{' '}
            <b>{meta.baseDevices.length ? meta.baseDevices.map((d) => BASE_DEVICE_INFO[d].name).join(' · ') : '없음 (확장 부품만 사용)'}</b>
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono truncate select-text">
              {bundleCommand}
            </code>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(bundleCommand);
                  onFeedbackMessage('펌웨어 묶기 명령이 복사되었습니다. E: 를 우리 팀 CIRCUITPY 드라이브 문자로 바꿔 실행하세요.');
                } catch {
                  onFeedbackMessage(bundleCommand);
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> 복사
            </button>
          </div>
          <p className="text-[10px] text-emerald-800">
            위 명령은 이 공간의 code.py 만 담은 펌웨어를 우리 팀 Pico(CIRCUITPY 드라이브)에 복사합니다. (선생님과 함께 실행)
          </p>
        </section>

        {/* ② 파일 4종 상태 */}
        <section className="flex flex-col gap-2.5">
          <div className="text-xs font-extrabold text-slate-900">② 공간 꾸러미 파일 4종</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROOM_FILE_NAMES.map((name) => {
              const info = FILE_INFO[name];
              const Icon = info.icon;
              const content = currentContent(pkg, name);
              // room.json 은 '새 공간 추가' 때 기본값으로 만들어지므로, 팀이 직접 올렸을 때만 업로드됨으로 표시
              const uploaded = name === 'room.json' ? !!meta.roomJsonUploadedAt : !!content;
              const sceneError = name === 'Scene.tsx' && statusForRoom?.state === 'error';
              return (
                <div
                  key={name}
                  className={`rounded-2xl border p-3 flex flex-col gap-2 ${
                    sceneError ? 'border-rose-300 bg-rose-50/60' : uploaded ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-600" />
                    <code className="text-xs font-bold text-slate-900">{name}</code>
                    <span className="text-[10px] text-slate-400">{info.label}</span>
                    <span className="ml-auto">
                      {sceneError ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      ) : uploaded ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">미업로드</span>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{info.desc}</p>
                  {name === 'room.json' && !uploaded && (
                    <p className="text-[10px] text-amber-700">새 공간 추가에서 입력한 기본값 사용 중 (확장 센서 · 핀 정보는 room.json 을 올려야 반영)</p>
                  )}
                  {sceneError && (
                    <p className="text-[10px] font-mono text-rose-700 whitespace-pre-wrap break-words select-text">{statusForRoom?.message}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => downloadText(name, info.template(meta))}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:text-blue-600"
                    >
                      빈 템플릿
                    </button>
                    {(uploaded || name === 'room.json') && (
                      <a
                        href={name === 'room.json' ? undefined : `/api/rooms/${meta.id}/files/${name}`}
                        onClick={name === 'room.json' ? () => downloadText('room.json', roomJsonTemplate(meta)) : undefined}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> 현재 파일
                      </a>
                    )}
                    {uploaded && name !== 'room.json' && (
                      <button
                        onClick={() => handleRemove(name)}
                        disabled={busy}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ③ 업로드 (파일 드래그 또는 붙여넣기) */}
        <section className="flex flex-col gap-2.5">
          <div className="text-xs font-extrabold text-slate-900">③ 업로드 → 즉시 화면 적용</div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
            <p className="text-xs font-bold text-slate-700">파일을 끌어다 놓거나 클릭해서 선택 (여러 개 가능)</p>
            <p className="text-[10px] text-slate-400 mt-0.5">파일 이름: {ROOM_FILE_NAMES.join(' · ')}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".json,.tsx,.js,.py"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
              <ClipboardPaste className="w-3.5 h-3.5" /> AI 답변 코드 직접 붙여넣기
              <select
                value={pasteTarget}
                onChange={(e) => setPasteTarget(e.target.value as RoomFileName)}
                className="ml-auto px-2 py-1 rounded-lg border border-slate-200 text-[11px] bg-white"
              >
                {ROOM_FILE_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder={`${pasteTarget} 코드 전체를 붙여 넣으세요.`}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] focus:outline-none select-text"
            />
            <div className="flex justify-end">
              <button
                onClick={handlePasteUpload}
                disabled={busy || !pasteText.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pasteTarget} 업로드
              </button>
            </div>
          </div>
        </section>

        {/* 결과: 오류 / 핀 충돌 경고 */}
        {errors.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 flex flex-col gap-1">
            <div className="text-xs font-extrabold text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> 업로드하지 않았습니다. 아래 오류를 AI에게 그대로 알려 주고 고쳐 달라고 하세요.
            </div>
            {errors.map((e, i) => (
              <p key={i} className="text-[11px] font-mono text-rose-700 whitespace-pre-wrap break-words select-text">
                {e}
              </p>
            ))}
          </div>
        )}

        {pkg.warnings.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex flex-col gap-1">
            <div className="text-xs font-extrabold text-amber-800">경고 (room.json pins · Pico IP 를 확인하세요)</div>
            {pkg.warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-amber-800">
                · {w}
              </p>
            ))}
          </div>
        )}

        {needKey && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-500" />
            <input
              type="password"
              value={keyInput || getUploadKey()}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="선생님께 받은 업로드 비밀번호"
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
            />
            <button
              onClick={() => {
                setUploadKey(keyInput);
                setNeedKey(false);
                setErrors([]);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold"
            >
              저장
            </button>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
          >
            닫고 3D 화면 확인
          </button>
        </div>
      </div>
    </div>
  );
}
