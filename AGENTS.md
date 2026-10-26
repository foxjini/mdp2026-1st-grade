# AI Agent Guide - 3D IoT 전시 플랫폼

## 1. 프로젝트 개요
본 플랫폼은 고등학교 학생 팀 프로젝트를 위한 **3D IoT 공용 전시 플랫폼**입니다.
전시회에는 **윈도우 PC 1대 + 모니터**를 두고, **공간(팀 주제)마다 Raspberry Pi Pico 2 W 1대**를 씁니다.
Pico 마다 IP 가 다르며, 플랫폼에서 공간을 선택하면 그 공간의 Pico 로 자동 연결됩니다.
기본 장치 4종 (공간마다 room.json `baseDevices` 로 골라 사용, 핀 변경 금지):
- **DHT11**: 디지털 온습도 센서 (Pin: GP15)
- **Cds**: 아날로그 조도 센서 (Pin: GP26 / ADC0)
- **SG90**: 서보모터 (Pin: GP16 / PWM)
- **RGB LED**: 공통 캐소드 3색 LED (Pins: GP18, GP19, GP20 / PWM)

## 2. 학생 팀 작업 흐름 (공간 꾸러미 방식)
1. 플랫폼 왼쪽 사이드바 **'새 공간 추가'** 로 팀 공간을 만든다. (사용할 기본 장치, 우리 팀 Pico IP)
2. 공간 메뉴(⋮) → **'코드 업로드 · 관리'** → **[AI 프롬프트 복사]** 로 플랫폼 컨텍스트가 담긴 프롬프트를 받는다.
3. 생성형 AI로 **4개 파일**을 만든다: `room.json`, `Scene.tsx`, `mock.js`, `code.py`
4. 업로드하면 빌드 없이 즉시 3D 화면에 적용된다. (`mock.js` 는 시뮬레이션에서 바로 동작)
5. `npm run firmware:bundle -- <공간ID> <CIRCUITPY 드라이브>` 로 그 공간의 Pico 에 펌웨어를 설치하고, 공간 메뉴(⋮) → **'Pico 연결 설정'** 에 그 Pico 의 IP 를 저장한다.

## 3. AI 에이전트 규칙
- **학생 팀 코드 요청**: 반드시 `context/CONTEXT_ROOM_PACKAGE_SPEC.md` 규격의 4개 파일만 작성한다. `src/`, `firmware/` 원본을 수정하라고 안내하지 않는다.
  - 참고 예제: `context/examples/smart_farm/` (실제 동작 검증된 4개 파일), 디자인 킷 모범 사례는 `context/examples/smart_study_room/` (플랫폼 기본 예제 공간 '스마트 독서실'로 자동 등록)
  - 기본 예제 꾸러미 공간은 `src/core/server/roomStore.ts` 의 `EXAMPLE_ROOMS` · `scripts/bundle-firmware.mjs` 에 같이 등록한다 (수정 · 삭제 불가, 복제 가능)
  - 3D 요령: `context/CONTEXT_3D_SCENE_GUIDE.md` / 핀 · 펌웨어: `context/CONTEXT_CIRCUITPYTHON_MAP.md`
- **플랫폼 자체 유지보수** (교사 요청 시): 구조는 `context/CONTEXT_SYSTEM_SPEC.md` 참고.
  - 규격이 바뀌면 `src/core/sdk/index.ts`, `src/core/runtime/compileRoom.ts`(허용 모듈), `src/core/rooms/templates.ts`, `firmware/circuitpython/code.py`(Base 객체), `firmware/mock_pico_server.js`, `context/CONTEXT_ROOM_PACKAGE_SPEC.md` 를 함께 맞춘다.
  - 규격 · 예제 수정 후 `npm run context:build` 로 `context/PLATFORM_FULL_CONTEXT.md` 와 `public/context_master.txt` 를 다시 생성한다. (두 파일은 직접 수정하지 않는다)
  - 기본 장치 핀 목록은 `src/core/types/iot.ts` 의 `BASE_DEVICE_INFO`, `src/core/server/roomStore.ts` 의 `reservedPins()`, `scripts/bundle-firmware.mjs` 에 같이 있다.
  - 공간별 Pico 연결(`picoIp`, `mode`)은 room.json / `rooms-data/_builtin.json` 에 저장되고, `page.tsx` 가 공간 선택 시 `applyRoomConnection()` 으로 전환한다.

모든 AI 에이전트는 환각(Hallucination) 없이 규격에 있는 API · 모듈 · 함수만 사용해야 합니다.
