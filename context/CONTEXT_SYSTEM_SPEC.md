# CONTEXT_SYSTEM_SPEC: 플랫폼 아키텍처 및 시스템 규격 (교사 · 유지보수용)

> 학생 · AI가 지켜야 할 규격은 `CONTEXT_ROOM_PACKAGE_SPEC.md` 입니다. 이 문서는 플랫폼 내부 구조 설명입니다.

## 1. 전시 구조
- 전시 장비: **윈도우 PC 1대 + 모니터 + Pico 2 W 1세트** (기본 4종 + 팀 확장 부품)
- 각 팀은 '새 공간 추가' 로 공간을 만들고 공간 꾸러미 4개 파일을 업로드합니다.
- 업로드된 파일은 전시 PC의 `rooms-data/<공간ID>/` 폴더에 저장됩니다. (`ROOMS_DATA_DIR` 환경변수로 위치 변경 가능, git 제외)

## 2. 아키텍처
```
[UI (Next.js 14 / React 18)]
   ├── RoomsSidebar ─ AddRoomModal(1/2 공간 정보) → RoomCodeModal(2/2 코드 업로드)
   ├── SceneCanvas (R3F) ─ 기본 예제 공간: SmartHomeRoom / SmartFarmRoom / SmartFactoryRoom
   │                      └ 팀 공간: DynamicRoom → compileScene(Scene.tsx) + SceneErrorBoundary
   └── InspectorPanel / SensorOutputPanel(customSensors 자동 게이지) / DeviceManageModal
          ↕ Zustand (useIoTStore: sensors, actuators, customSensors, activeRoomPackage, lastCommand)
[Adapter]
   ├── MockIoTAdapter      ─ 기본 4종 난수 + 팀 mock.js tick()/onCommand()
   └── CircuitPythonAdapter ─ GET /api/status (rooms[공간ID] → customSensors), POST /api/servo|rgb|command
          ↕ Wi-Fi HTTP (브라우저 직접 → 실패 시 /api/pico/[...path] 프록시)
[Hardware] Pico 2 W 통합 펌웨어 code.py + teams/<공간ID>.py
           (연습용: firmware/mock_pico_server.js 가 rooms-data/*/mock.js 실행)
```

## 3. 서버 API (`src/app/api/rooms`)
| 메서드 | 경로 | 동작 |
| :--- | :--- | :--- |
| GET | `/api/rooms` | 팀 공간 목록 (room.json 메타) |
| POST | `/api/rooms` | 새 공간 생성 `{ name, team, iconType, sensorsDesc }` |
| GET | `/api/rooms/:id` | 꾸러미 전체 `{ meta, files, warnings }` |
| PUT | `/api/rooms/:id` | 파일 업로드 `{ files: { "Scene.tsx": "..." } }` |
| PATCH | `/api/rooms/:id` | 메타 수정 / `{ action: "duplicate" }` / `{ removeFile: "mock.js" }` |
| DELETE | `/api/rooms/:id` | 공간 삭제 |
| GET | `/api/rooms/:id/files/:name` | 파일 다운로드 |

- 검증: 공간 ID `^[a-z0-9_-]+$`, 파일명 4종만, 파일당 200KB, room.json 정규화(key/핀 형식), 핀 충돌 경고
- 업로드 비밀번호(선택): 서버 실행 시 `ROOM_UPLOAD_KEY=비밀번호` 환경변수 → 업로드 창에서 입력

## 4. 런타임 적용 원리
1. 업로드 전 브라우저에서 사전 검사: Scene.tsx 컴파일, mock.js 실행, room.json 파싱 → 오류면 업로드하지 않음
2. `compileScene()` 이 sucrase 로 TSX → CommonJS 변환 후 허용 모듈만 `require` 로 주입하여 실행
3. 렌더링 오류는 `SceneErrorBoundary` 가 잡아 해당 공간에만 오류 배지를 표시 (다른 공간 · 앱 전체는 정상)
4. mock.js 오류는 로그만 남기고 기본 시뮬레이션은 계속

## 5. 상태 관리 규칙
- 기본 액추에이터 2-Phase: `setServoAngle/setRgbColor/setRgbState` → `pending=true` → 어댑터 ACK → `confirm*Ack` 또는 `failCommand` 롤백
- 확장 명령: `sendCommand(action, value)` → `lastCommand` 갱신 → IoTProvider 가 감지해 `adapter.sendCommand()`
- 센서 stale: 10초 이상 미수신 시 `isStale=true` (기본 센서와 확장 센서 모두)

## 6. 유지보수 명령
| 명령 | 용도 |
| :--- | :--- |
| `npm run dev` | 개발 서버 (http://localhost:3001) |
| `npm run build && npm start` | 전시용 실행 (포트 3001) |
| `npm run mock:pico` | Pico 없이 하드웨어 모드 연습 (127.0.0.1:5050) |
| `npm run firmware:bundle -- E:\` | 팀 code.py 를 통합 펌웨어로 묶어 CIRCUITPY 드라이브에 복사 |
| `npm run context:build` | 규격 · 예제 변경 후 AI 마스터 컨텍스트 재생성 |
