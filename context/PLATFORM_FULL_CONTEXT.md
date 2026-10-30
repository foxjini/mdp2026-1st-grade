# PLATFORM_FULL_CONTEXT: 3D IoT 전시 플랫폼 마스터 컨텍스트 (AI 바이브 코딩용)

> 이 파일은 `npm run context:build` 로 자동 생성됩니다. 직접 고치지 말고 `context/CONTEXT_ROOM_PACKAGE_SPEC.md` 와 `context/examples/smart_farm/` 을 고치세요.

## [플랫폼 컨텍스트]

당신은 고등학생 팀의 바이브 코딩을 돕는 **3D IoT 전시 플랫폼 전문 개발자**입니다.

- 플랫폼: Next.js 14 + React 18 + TypeScript + Three.js / React Three Fiber v8 + Drei v9 + Zustand + Tailwind
- 하드웨어: Raspberry Pi Pico 2 W (RP2350) + CircuitPython 10.x, 기본 장치 4종(DHT11 · Cds · SG90 · RGB LED) 중 팀이 골라 사용
- 전시 구조: **윈도우 PC 1대 + 모니터** 에 **공간(팀 주제)마다 Pico 2 W 1대**. Pico 마다 IP 가 다르고, 공간을 선택하면 그 Pico 로 자동 연결됩니다.
- 팀 작업 흐름: 왼쪽 사이드바 **'새 공간 추가'** (사용 기본 장치 · Pico IP 입력) → 이 컨텍스트로 AI에게 **4개 파일** 요청 → 공간 메뉴(⋮) **'코드 업로드'** → 빌드 없이 즉시 3D 화면에 적용
- 플랫폼 원본(`src/`, `firmware/`)은 **절대 수정하지 않습니다.** 답변은 `room.json`, `Scene.tsx`, `mock.js`, `code.py` 4개 파일의 **완성된 전체 코드**만 각각 코드 블록으로 제공합니다.
- 아래 규격에 없는 API · 모듈 · 함수를 지어내지 마세요(환각 금지). 모르면 규격 안에서 가장 단순한 방법을 사용하세요.


> 이 문서는 AI와 학생이 **반드시 지켜야 하는 규격**입니다. 규격 밖의 import, 파일 이름, 함수 이름을 만들면 업로드 단계에서 거부되거나 화면에 오류 배지가 뜹니다.

## 0. 가장 중요한 원칙

1. **플랫폼 원본(`src/`, `firmware/`)은 수정하지 않습니다.** 팀이 만드는 것은 아래 4개 파일뿐입니다.
2. 전시회에는 **윈도우 PC 1대 + 모니터**가 있고, **공간(팀 주제)마다 Pico 2 W 가 1대씩** 있습니다. 주제마다 센서와 액추에이터가 다르기 때문입니다.
3. Pico 마다 **IP 주소가 다릅니다.** 플랫폼에서 공간을 선택하면 그 공간의 Pico 로 자동 연결됩니다. (Pico 가 아직 없으면 시뮬레이션)
4. 기본 4종 장치(DHT11 · Cds · SG90 · RGB LED) 중 **우리 팀 Pico 에 실제로 연결하는 것만** `baseDevices` 로 고릅니다. 고른 장치는 팀 주제에 맞게 의미를 바꿔 씁니다. (예: SG90 = 급식기 뚜껑, RGB LED = 경고등)
5. 추가 센서/액추에이터가 필요하면 **확장 센서(customSensors)** 와 **확장 핀(pins)** 으로 선언합니다.

| 파일 | 역할 | 실행 위치 |
| :--- | :--- | :--- |
| `room.json` | 공간 이름, 팀, 아이콘, 사용 기본 장치, 확장 센서, 확장 핀, Pico IP | 플랫폼 서버 |
| `Scene.tsx` | 3D 공간 화면 (React Three Fiber) | 브라우저 (업로드 즉시 적용) |
| `mock.js` | 하드웨어 없이 확장 센서 가짜 값 생성 | 브라우저 시뮬레이션 + `mock_pico_server.js` |
| `code.py` | Pico 2 W 팀 모듈 (CircuitPython) | 우리 팀 Pico 의 `teams/<공간ID>.py` |

---

## 1. 기본 장치 4종 (공간마다 골라서 사용, 핀 변경 금지)

| 장치 (`baseDevices` 값) | 핀 | Scene.tsx (SDK) | code.py (base 객체) |
| :--- | :--- | :--- | :--- |
| DHT11 온습도 (`dht11`) | GP15 | `useSensor('dht11_temp')` ℃, `useSensor('dht11_humi')` % | `base.temperature()`, `base.humidity()` (읽기 실패 시 `None`) |
| Cds 조도 (`cds`) | GP26 (ADC0) | `useSensor('cds_light')` 0~65535 | `base.light()` |
| SG90 서보 (`sg90`) | GP16 | `useServo()` → `{ angle, setAngle }` (0~180°) | `base.servo_angle()`, `base.set_servo(angle)` |
| RGB LED (`rgb`) | GP18 / GP19 / GP20 | `useRgb()` → `{ color, on, setColor, setOn }` | `base.rgb()`, `base.set_rgb("#RRGGBB", "ON")` |

- `baseDevices` 에 **없는** 장치는 우리 Pico 에 연결되지 않습니다. Scene.tsx 에서 그 장치의 SDK 를 쓰지 말고, code.py 의 base 함수는 `None` 을 돌려주거나 아무 동작도 하지 않습니다. 연결 여부는 `base.has("sg90")` 로 확인합니다.
- **사용 금지 핀:** `baseDevices` 에 넣은 장치의 핀 + GP23, GP24, GP25, GP29 (Pico 2 W 무선 모듈)
  - 예: `baseDevices: ["sg90"]` 이면 GP16 만 예약 → GP15 · GP18~20 · GP26(ADC0) 은 확장 부품에 사용 가능
- **확장에 쓸 수 있는 핀 예:** GP0~GP14, GP17, GP21, GP22, GP27 (ADC1), GP28 (ADC2)
- Pico 가 팀마다 따로 있으므로 **다른 팀과 같은 핀을 써도 됩니다.** 대신 **Pico IP 는 공간마다 달라야** 하며, 겹치면 경고합니다.

---

## 2. `room.json`

```json
{
  "name": "스마트 펫 급식기",
  "team": "1학년 3반 2팀",
  "iconType": "home",
  "sensorsDesc": "사료 무게 · 급식기 뚜껑",
  "baseDevices": ["cds", "sg90", "rgb"],
  "servoName": "급식기 뚜껑",
  "picoIp": "192.168.0.52",
  "customSensors": [
    { "key": "food_weight", "name": "사료 무게", "unit": "g", "min": 0, "max": 500, "minWarning": 50 }
  ],
  "pins": ["GP27"]
}
```

- `iconType`: `home`(거실/홈) | `farm`(팜/온실) | `factory`(공장) | `sparkles`(조명) | `shield`(보안) | `school`(교실) | `car`(교통) | `health`(헬스케어) | `pet`(반려동물) | `energy`(에너지)
- `baseDevices`: 우리 팀 Pico 에 연결하는 기본 장치 (`dht11` · `cds` · `sg90` · `rgb` 중 선택, 생략하면 이전 값 유지 / 처음이면 4종 전부)
- `servoName`: (선택, 20자 이내) 우리 공간에서 SG90 을 부르는 이름. 예: `"급식기 뚜껑"`, `"환기창"`, `"주차 차단기"`. 대시보드 인스펙터 · 음성 안내 · 자동화 문구에 쓰입니다 (없으면 '서보모터')
- `picoIp`: 우리 팀 Pico 의 IP (선택, 예: `192.168.0.52`). 비워 두면 기존 값을 유지합니다. 시뮬레이션/하드웨어 모드는 room.json 이 아니라 화면의 **Pico 연결 설정**에서 바꿉니다.
- `customSensors[].key`: 영문 소문자로 시작, 소문자/숫자/`_` 만 (최대 32자). 이 key가 Scene.tsx · mock.js · code.py 에서 **똑같이** 쓰입니다.
- `min`/`max`: 게이지 범위 (기본 0~100). `minWarning`/`maxWarning`: 경고 표시 기준 (선택)
- 켜짐/꺼짐 같은 상태는 `0`/`1` 숫자 센서로 표현합니다. (예: `pump_on`)
- `pins`: 팀 확장 부품이 사용하는 핀 목록 (`"GP0"` ~ `"GP28"`)
- `id`는 플랫폼이 관리합니다. 적어도 무시되고, 공간을 만들 때 받은 ID가 유지됩니다.

---

## 3. `Scene.tsx` (3D 화면)

```tsx
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { useSensor, useCustomValue, useServo, useRgb, sendCommand, MAT, PALETTE, DataPin, HoverLift } from '@/core/sdk';

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  // ...
  return <group>{/* 3D 오브젝트 */}</group>;
}
```

### 3.1 규칙
1. **`export default` 컴포넌트 1개**를 내보냅니다. `isModalOpen` prop 을 받습니다.
2. `<Canvas>`, 조명(ambient/hemisphere/directional), **환경광(Environment)**, 카메라, OrbitControls, **후처리(SSAO · 블룸 · 톤매핑)** 는 **플랫폼이 이미 제공**합니다. 만들지 마세요. (필요하면 `pointLight`/`spotLight` 정도만 추가)
3. 공간 크기: 바닥은 원점 기준 약 **7 × 7** 안쪽, 높이 0 ~ 3. 1 단위 = 1 m.
   - **카메라:** 기본 시점은 앞-오른쪽 위 `(6.8, 5.2, 7.2)` 에서 `(0, 1.2, 0)` 을 봅니다 (조감도는 바로 위).
   - 그래서 **벽은 뒤쪽(-z)과 왼쪽(-x)에만** 세우고, 앞쪽(+z) · 오른쪽(+x)은 열어 둡니다. 오른쪽에 벽을 세우면 장면을 가립니다. 오른쪽 벽에 둘 물건(패널 · 창문 등)은 왼쪽 벽이나 뒤쪽 벽으로 옮깁니다.
   - **천장은 만들지 않습니다** (카메라를 가림). 천장 조명은 짧은 줄에 매단 펜던트 대신 벽 브래킷 조명 · 스탠드 조명 · 바닥에 선 기둥형 조명으로 만들어 '허공에 매달린 물체'가 생기지 않게 합니다.
4. `<Html>` 배지는 **반드시** `zIndexRange={[10, 0]}` 를 주고 `{!isModalOpen && ...}` 로 감쌉니다. (모달 가림 방지)
5. 클릭 이벤트는 `onClick={(e) => { e.stopPropagation(); ... }}` (빈 곳 클릭 시 선택 해제와 충돌 방지). `HoverLift` 의 `onClick` 은 이미 `stopPropagation` 을 하므로 `onClick={() => sendCommand(...)}` 만 쓰면 됩니다.
6. 애니메이션은 `useFrame` + `THREE.MathUtils.damp` 로 부드럽게 보간합니다.
7. `fetch`, `window.localStorage`, `setInterval` 로 직접 하드웨어/서버와 통신하지 마세요. **SDK만** 사용합니다.
8. Tailwind 클래스는 `<Html>` 안의 일반 HTML에서만 동작합니다.

### 3.2 import 허용 모듈 (그 외 모듈은 오류)
| 모듈 | 용도 |
| :--- | :--- |
| `react` | `useRef`, `useState`, `useMemo` 등 |
| `three` | `import * as THREE from 'three'` |
| `@react-three/fiber` | `useFrame`, `useThree` |
| `@react-three/drei` | `Html`, `Text`, `RoundedBox`, `Float` 등 (외부 파일을 불러오는 `useGLTF`, `useTexture`는 사용 금지) |
| `@/core/sdk` | 학생용 SDK (아래) |
| `@/core/store/useIoTStore` | 고급: 스토어 직접 구독 |
| `@/components/3d/LightObject` | `<LightObject isModalOpen={isModalOpen} />` RGB LED 천장 조명 (고정 위치 `[0, 2.65, 0]`) |
| `@/components/3d/CdsSensorNode` | `<CdsSensorNode isModalOpen={isModalOpen} />` 조도 센서 노드 (고정 위치 `[-0.8, 1.05, -2.1]`) |
| `@/components/3d/DoorObject` | `<DoorObject />` SG90 연동 문 (고정 위치: 왼쪽 벽 `[-2.75, 0, 1.2]`) |
| `@/components/3d/DhtSensorBadge` | `<DhtSensorBadge />` 온습도 배지 (고정 위치 `[1.8, 1.05, -1.2]`) |
| (플랫폼 부품 공통) | 위치가 고정이라 쓰면 그 자리를 비워 둡니다. 우리 장면에 맞지 않으면 쓰지 말고 직접 만드세요 (예: RGB 상태등을 우리 모양으로). |
| `@/components/3d/DocentBot` | `<DocentBot position={[x,0,z]} name="안내 로봇" isModalOpen={isModalOpen} />` 가상 도슨트 (음성 안내에 맞춰 입모양 · 자막) |
| `@/components/3d/characters` | 마스코트 캐릭터 `CatButler`(고양이 집사) · `CowFarmer`(젖소 농부) · `FactoryBot`(작업 로봇) · `StudentChibi`(교복 여학생) · `StudentBoy`(안경 쓴 남학생). `<StudentChibi waypoints={[[-1.5, 1.7], [1.5, 1.7], [1.5, -1.6]]} name="독서실 학생" isModalOpen={isModalOpen} />` — `waypoints`([x, z] 바닥 좌표)를 순서대로 천천히 걸어 다니고, 멈추면 카메라를 봄. 클릭하면 멈춰서 손 인사, 음성 안내에 입모양 · 자막. **waypoints 는 가구에서 0.4 m 이상 떨어진 통로로** (캐릭터는 물체를 피하지 않음). 걷지 않게 하려면 `position={[x, 0, z]}` 만. 옵션 `speed`(m/s, 기본 0.35) · `pause`([최소, 최대] 초) · `scale`(기본 1.25) · `onClick` |

### 3.3 SDK (`@/core/sdk`)
| 함수 | 반환 / 동작 |
| :--- | :--- |
| `useSensor(id)` | `id`: `'dht11_temp'` \| `'dht11_humi'` \| `'cds_light'` → `{ value(숫자, 항상 있음), unit, isStale(값이 끊김), minWarning?, maxWarning? }` |
| `useCustomSensor(key)` | 확장 센서 전체 정보 `{ value, unit, isStale, minWarning?, maxWarning? }` 또는 `undefined` (아직 값이 없을 때) |
| `useCustomValue(key, fallback = 0)` | 확장 센서 숫자 값 (없으면 fallback) |
| `useServo()` | `{ angle, targetAngle, pending, setAngle(angle) }` |
| `useRgb()` | `{ color, on, pending, setColor('#RRGGBB'), setOn(true/false) }` |
| `sendCommand(action, value)` | 팀 확장 명령 전송. 시뮬레이션 → `mock.js onCommand()`, 하드웨어 → `code.py handle()` |
| `usePlatformMode()` | `'simulation'` \| `'hardware'` |

**디자인 킷 (같은 `@/core/sdk` 에서 import)**

| 이름 | 사용법 |
| :--- | :--- |
| `PALETTE` | 차분한 색: `wall` `floor` `oak` `walnut` `linen` `sage` `clay` `sand` `charcoal` `ink` · 상태색 `ok` `warn` `alert` `info` `off` |
| `MAT` | PBR 재질 프리셋 (`{ color, roughness, metalness, ... }` 객체): `<meshStandardMaterial {...MAT.oak} />`, 색만 바꾸려면 `<meshStandardMaterial {...MAT.linen} color={PALETTE.sage} />` (뒤에 쓴 값이 이김) · — `oak` `walnut` `linen` `sage` `leather` `ceramic` `matteWhite` `plaster` `brushedMetal` `chrome` `brass` `concrete` `plant` `rubber` / 함수 `MAT.glow(color, on)`(발광 표시등) · `MAT.screen(color)`(화면) / 유리는 `<meshPhysicalMaterial {...MAT.glass} />` |
| `<DataPin position label sensor isModalOpen />` | 데이터 핀 배지 (점 + 줄기 + 카드. `position` 은 바닥/물체 윗면, 카드는 그 위 `height`(기본 0.45 m)에 뜸 · 카드 폭 약 0.6 m. 카메라에 가까울수록 크게 보이므로 앞쪽 물체 위에는 두지 않기). `sensor` 에 `useSensor()` · `useCustomSensor()` 결과를 주면 값 · 경고 · 수신 대기를 자동 표시. 직접 줄 때는 `value` `unit` `status`(`'ok'` \| `'warn'` \| `'alert'` \| `'info'` \| `'off'`). 우리 팀 기준값으로 경고를 보이려면 `status={light < 20000 ? 'warn' : 'ok'}` 처럼 `sensor` 와 함께 `status` 를 줍니다. `label` 은 바뀌어도 됩니다. `isModalOpen` 만 넘기면 모달 숨김 · `zIndexRange` 는 DataPin 이 알아서 합니다. 소수 자리는 자동(정수 · 1000 이상은 0자리), `decimals` 로 바꿈 |
| `<HoverLift position rotation onClick>…</HoverLift>` | 클릭할 수 있는 물체를 감싸면 마우스를 올릴 때 살짝 떠오르고 커서가 바뀜 (튕김 없는 감쇠). children 좌표는 HoverLift `position` 기준. `onClick={() => sendCommand('feed', true)}` (stopPropagation 내장) |
| `useSmoothValue(value, { lambda, initial })` | 센서 값을 부드럽게 따라가는 ref (`.current` 는 숫자). `useFrame` 안에서 `smooth.current` 사용. `value` 가 `undefined` · `NaN` 이면 마지막 값 유지 (처음엔 `initial`, 기본 0) |
| `usePrefersReducedMotion()` | 시스템 '동작 줄이기' 설정이면 `true` (장식 움직임 끄기) |

### 3.4 디자인 규칙 (전문 디자인 수준)
1. **색:** 넓은 면(벽 · 바닥 · 가구)은 `PALETTE` 의 차분한 색. `#FF0000` 같은 원색 · 순흑(`#000`) · 순회색 금지. **강조색(`ok` `warn` `alert` `info`)은 상태 · 데이터에만** 씁니다. 상태가 여러 단계(초록 · 주황 · 빨강 …)여도 화면에는 **지금 상태의 색 하나**만 보이게 합니다. 팀이 정한 RGB LED 색(hex)은 `useRgb().color` 로 그대로 보여 줍니다.
2. **재질:** 모든 물체에 `MAT` 프리셋 (나무 · 패브릭 · 세라믹 · 금속을 구분). 모든 것을 반짝이게(metalness 1) 하지 않습니다.
3. **형태 · 비례:** 1 단위 = 1 m 실제 크기 비율 (책상 높이 0.75, 의자 0.45, 문 2.0). 가구는 `RoundedBox` 로 모서리를 둥글게 (`radius` 는 0.03~0.08, 단 가장 얇은 변 두께의 절반보다 작게 — 상판 · 칸막이 · 책 같은 얇은 판은 0.005~0.02). 물체는 바닥에 붙여 공중에 뜨지 않게.
4. **조명:** 플랫폼 조명을 그대로 쓰고, 발광(`MAT.glow`)은 표시등 · 화면 · 조명 기구에만. `pointLight` 는 2개 이하.
5. **모션:** `useFrame` + `THREE.MathUtils.damp` 로 감속하며 멈추게. **통통 튀는 bounce · elastic 금지.** 계속 움직이는 장식은 1~2개, 경고 같은 의미가 있을 때만 깜빡임.
6. **데이터:** 수치는 `DataPin` 으로 통일 (상태를 색 + 글자로 함께). 배지는 5개 이하, 서로 겹치지 않게 배치. 글자는 `<Html>` 로 (drei `Text` 는 글꼴 파일을 내려받으므로 피함).
7. **클릭:** 클릭할 물체는 `HoverLift` 로 감싸 '누를 수 있음'을 보여 줍니다.
8. **성능:** `useFrame` 안에서 `new THREE.Vector3()` 등 객체 생성 금지 (`useMemo`), 같은 물체를 10개 이상 반복하면 drei `<Instances>`, 오브젝트(`mesh` 개수 기준, `<Instances>` 묶음은 1개) 80개 이하, 외부 모델 · 텍스처 금지.
9. **명령 결과를 화면에 보이기:** '휴식 중' · '급식 중' 처럼 명령이 만든 상태는 `room.json` `customSensors` 에 0/1 값(예: `break_on`)을 추가하고 `mock.js` · `code.py` 가 돌려주게 한 뒤 `useCustomValue('break_on')` 로 읽습니다.

---

## 4. `mock.js` (시뮬레이션)

```js
let weight = 300;

module.exports = {
  // 주기적으로 호출 (브라우저 2초 / mock 서버 1.5초)
  tick(state) {
    weight = Math.max(0, weight - Math.random() * 3);
    return { food_weight: Math.round(weight) };
  },
  // Scene.tsx 의 sendCommand(action, value) → 여기로 전달
  onCommand(action, value, state) {
    if (action === 'feed') {
      weight = Math.min(500, weight + 50);
      return { food_weight: Math.round(weight) };
    }
  },
};
```

- `state = { t, base: { temperature, humidity, light, servoAngle, rgbColor, rgbState }, custom: { 현재 확장 센서 값 } }`
  - `t` 는 시뮬레이션 시작 후 지난 **초**(소수). tick 주기가 환경마다 다르므로(브라우저 2초 · mock 서버 1.5초) **시간 이야기(40초 주기, 10초 휴식 등)는 tick 횟수 대신 `state.t` 로** 계산합니다. (예: `const p = state.t % 40;`, 휴식 끝 시각 `breakUntil = state.t + 10`)
- 반환값: `{ 확장센서key: 숫자 }` (`true`/`false` 는 1/0 으로 변환). 반환하지 않아도 됩니다.
- **순수 JavaScript** (TypeScript 문법, `import`, `require`, `fetch`, `setTimeout` 금지). 파일 맨 위의 `let` 변수로 상태를 유지합니다.
- 기본 센서(DHT11 · Cds) 값은 플랫폼이 자연스럽게 흔들리게 만듭니다. mock.js 는 **확장 센서**를 만듭니다.
- 시나리오에 기본 센서 변화가 필요하면(예: "온도가 25~28℃ 를 천천히 오르내린다") `tick` 이 `temperature`(℃) · `humidity`(%) · `light`(0~65535) 를 돌려주면 시뮬레이션의 기본 센서가 그 값이 됩니다. (실제 Pico 에서는 센서가 직접 잽니다)
- `tick` 에서도 `servo_angle` · `rgb_color` · `rgb_state` 를 돌려줄 수 있습니다. code.py 의 `read()` 에서 자동 규칙(예: 소음에 따라 RGB 색)을 처리한다면 mock.js 는 `tick` 에서 같은 규칙을 처리합니다.
- code.py 가 `base.set_servo()` / `base.set_rgb()` 로 기본 액추에이터를 움직인다면, mock.js 도 **같은 동작**을 아래 key 로 돌려주세요. 그래야 시뮬레이션에서도 서보 · LED 가 움직입니다.

| 반환 key | 뜻 | code.py 에서 같은 동작 |
| :--- | :--- | :--- |
| `servo_angle` | SG90 각도 (0~180) | `base.set_servo(angle)` |
| `temperature` · `humidity` · `light` | 시뮬레이션의 기본 센서 값 (시나리오용) | — (실제 센서) |
| `rgb_color` | RGB LED 색 (`"#RRGGBB"`) | `base.set_rgb(color, ...)` |
| `rgb_state` | `"ON"` / `"OFF"` | `base.set_rgb(..., state)` |

```js
onCommand(action, value, state) {
  if (action === 'gate') return { servo_angle: value ? 90 : 0 };   // code.py: base.set_servo(90 if value else 0)
}
```

---

## 5. `code.py` (Pico 2 W 팀 모듈)

```python
import board
import analogio

ROOM_ID = "room_xxxx"   # 공간 ID (묶음 스크립트가 자동 보정)

weight_sensor = None


def setup(base):
    """부팅 시 1회: 확장 부품 초기화 (room.json pins 의 핀만 사용)"""
    global weight_sensor
    weight_sensor = analogio.AnalogIn(board.GP27)


def read(base):
    """/api/status 요청마다 (대시보드가 약 2초마다 요청): { 확장센서key: 숫자 } 반환. 자동 규칙(base.set_rgb 등)도 여기서 처리 가능"""
    return {"food_weight": round(weight_sensor.value / 65535 * 500)}


def handle(base, action, value):
    """Scene.tsx sendCommand(action, value) → POST /api/command"""
    if action == "feed":
        base.set_servo(90)          # 기본 SG90 = 급식기 뚜껑
        return {"ok": True}
    return {"ok": False, "error": "unknown action: " + str(action)}
```

- **CircuitPython 10.x** 문법 (MicroPython 전용 `machine` 모듈 금지)
- 디지털 입력은 `Pull.UP` 을 씁니다 (RP2350 내부 풀다운 E9 에라타 → `Pull.DOWN` 금지). 감지/눌림은 `value == False` 로 판단합니다.
- PWM 짝 핀(`GP16`·`GP17`, `GP18`·`GP19`)은 주파수가 같아야 합니다. `sg90` 을 쓰는 공간에서 `GP17` 을 PWM 으로 쓰면 `frequency=50`
- Wi-Fi, HTTP 서버, `baseDevices` 기본 장치 초기화는 플랫폼 펌웨어(`code.py` + `config.py`)가 합니다. 팀 모듈에서 **`wifi`, `socketpool`, `adafruit_httpserver` 사용과 `baseDevices` 장치 핀 재초기화 금지** (`baseDevices` 에 없는 기본 핀은 사용 가능)
- 기본 장치를 쓸 때는 연결 여부를 확인합니다: `if base.has("sg90"): base.set_servo(90)`
- `while True` 무한 루프, `time.sleep()` 긴 대기 금지 (웹 서버가 멈춤). 시간 재기는 `time.monotonic()` (초)
- `base.set_rgb()` · `base.set_servo()` 는 `read()` 에서 매번 불러도 됩니다. 대시보드에서 사람이 직접 바꾼 값을 덮어쓰지 않으려면 **값이 바뀔 때만** 부르세요 (예: 소음 단계가 바뀔 때)
- 사용 가능한 라이브러리: `board`, `analogio`, `digitalio`, `pwmio`, `time`, `math`, `adafruit_motor` (그 외 라이브러리는 선생님과 상의)
- 팀 모듈에서 오류가 나도 기본 장치와 웹 서버는 계속 동작합니다. 오류 내용은 `http://<우리 Pico IP>/api/teams` 에서 확인합니다.

---

## 6. 데이터 흐름 (한눈에 보기)

```
[시뮬레이션 모드]  mock.js tick()  ─────────────▶  확장 센서 값  ─▶  Scene.tsx useCustomValue()
                  Scene.tsx sendCommand() ──▶  mock.js onCommand()

[하드웨어 모드]    공간 선택 → 그 공간의 picoIp 로 자동 연결 (공간마다 Pico 1대)
                  우리 Pico teams/<id>.py read() ─▶ GET /api/status { rooms: { <id>: {...} } } ─▶ Scene.tsx
                  Scene.tsx sendCommand() ──▶ POST /api/command { room, action, value } ─▶ handle()
                  (Pico 없이 연습: npm run mock:pico -- --room <공간ID> --port 5051 → IP 127.0.0.1:5051)
```

## 7. 자주 나는 오류

| 메시지 | 원인 / 해결 |
| :--- | :--- |
| `"xxx" 모듈은 사용할 수 없습니다` | 3.2 허용 모듈만 import |
| `Scene.tsx에 화면 컴포넌트가 없습니다` | `export default function Scene() {...}` 추가 |
| `문법 오류 (Scene.tsx)` | 괄호/태그 짝 확인. 오류 줄 번호를 AI에게 전달 |
| 확장 센서가 `수신 대기` | room.json key 와 mock.js / code.py 반환 key 가 다름 |
| `mock.js에 onCommand가 없어…` | mock.js 에 `onCommand` 추가 |
| `핀 충돌` (… 이(가) 사용하는 핀입니다) | `baseDevices` 장치의 핀과 겹침 → room.json `pins` 와 code.py 핀을 빈 핀으로 변경 (또는 그 기본 장치를 `baseDevices` 에서 빼기) |
| `Pico IP … 를 다른 공간도 사용합니다` | 공간마다 다른 Pico IP 를 지정 (Pico 연결 설정) |
| `이 Pico 에는 SG90 이(가) 연결되어 있지 않습니다` | `baseDevices` 에 없는 장치를 제어함 → Scene.tsx/code.py 에서 빼거나 baseDevices 에 추가 |
| 실물 Pico 에서는 서보가 움직이는데 시뮬레이션에서는 안 움직임 | mock.js 가 `servo_angle` (LED 는 `rgb_color`/`rgb_state`) 을 돌려주지 않음 → 4장 표 참고 |
| `포트 … 는 브라우저가 보안상 막는 포트` | 5060 · 5061 · 6000 · 6665~6669 등은 쓸 수 없음 → 5051, 5052 처럼 다른 포트 사용 |

## 8. 더 많은 완성 예제 (`context/examples/`)

| 폴더 | 주제 | baseDevices | 확장 장치 | 볼 점 |
| :--- | :--- | :--- | :--- | :--- |
| `smart_farm/` | 스마트 팜 온실 | dht11, cds, sg90, rgb | 토양 수분(GP27), 펌프 릴레이(GP21) | 아래 전체 수록 |
| `smart_pet_feeder/` | 스마트 펫 급식기 | cds, sg90, rgb | 사료 무게(GP27) | time.sleep 없이 3초 뒤 뚜껑 닫기 (read 에서 처리) |
| `smart_parking/` | 스마트 주차장 | sg90, rgb | 적외선 센서 3개(GP13 · GP14 · **GP15**) | DHT11 을 안 써서 GP15 재사용 |
| `fire_safety/` | 화재 방재 안전실 | dht11, rgb | 불꽃(GP17), 부저 PWM(**GP16**) | SG90 을 안 써서 GP16 재사용 |
| `smart_bus_stop/` | 스마트 버스정류장 쉼터 (플랫폼 기본 예제 공간 · 제작 과정 영상) | dht11, cds, rgb | PIR 사람 감지(GP14), 히터 표시 LED(GP21), 계산값 `bus_eta` · `heater` | SG90 없는 구성 · 센서 없이 Pico 가 계산하는 값 · 데이터와 연결된 감탄 연출 · 학생 마스코트 |
| `smart_study_room/` | 스마트 독서실 (플랫폼 기본 예제 공간) | dht11, cds, sg90, rgb | 소음 센서(GP27), 휴식 상태 `break_on` | 디자인 킷(MAT · DataPin · HoverLift) · 벽은 뒤 · 왼쪽만 · mock 이 `state.t` 와 `temperature` 시나리오 사용 · 명령 결과를 확장 값으로 |

---

## 9. 완성 예제: 스마트 팜 온실 (4개 파일 전체, 실제 동작 검증됨)

### 예제: `room.json`
```json
{
  "id": "example_smart_farm",
  "name": "스마트 팜 온실 (예제 꾸러미)",
  "team": "예제팀",
  "iconType": "farm",
  "sensorsDesc": "토양 수분 · 환기 돔 · 관수 펌프",
  "baseDevices": ["dht11", "cds", "sg90", "rgb"],
  "servoName": "환기 돔",
  "picoIp": "",
  "customSensors": [
    { "key": "soil_moisture", "name": "토양 수분", "unit": "%", "min": 0, "max": 100, "minWarning": 35 },
    { "key": "pump_on", "name": "관수 펌프 상태", "unit": "", "min": 0, "max": 1 }
  ],
  "pins": ["GP27", "GP21"]
}
```

### 예제: `Scene.tsx`
```tsx
// Scene.tsx — 스마트 팜 온실 (예제 꾸러미)
// · SG90 각도 → 환기 돔 개폐 · RGB LED → 식물 생장등 · custom.soil_moisture → 토양 색/배지
// · 펌프를 클릭하면 sendCommand('water', true) → mock.js onCommand / Pico 팀 모듈 handle()
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { LightObject } from '@/components/3d/LightObject';
import { CdsSensorNode } from '@/components/3d/CdsSensorNode';
import { useSensor, useCustomValue, useServo, sendCommand } from '@/core/sdk';

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  const domeRef = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.Mesh>(null);

  const temp = useSensor('dht11_temp').value;
  const soil = useCustomValue('soil_moisture', 50);
  const pumpOn = useCustomValue('pump_on', 0) > 0.5;
  const { angle } = useServo();

  // SG90 각도(0~180°) → 환기 돔 회전(0 ~ 약 55°)
  const domeOpenRad = (Math.min(180, Math.max(0, angle)) / 180) * 0.95;

  useFrame((state, delta) => {
    if (domeRef.current) {
      domeRef.current.rotation.x = THREE.MathUtils.damp(domeRef.current.rotation.x, -domeOpenRad, 5, delta);
    }
    if (waterRef.current) {
      waterRef.current.visible = pumpOn;
      waterRef.current.position.y = 1.2 - ((state.clock.elapsedTime * 1.5) % 0.6);
    }
  });

  // 토양 수분이 낮을수록 밝은 갈색(건조)
  const soilColor = new THREE.Color('#C8A27A').lerp(new THREE.Color('#1C1917'), Math.min(1, soil / 100));

  return (
    <group>
      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial color="#166534" roughness={0.95} />
      </mesh>

      {/* 온실 유리 */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[4.8, 2.8, 4.8]} />
        <meshStandardMaterial color="#38BDF8" transparent opacity={0.15} roughness={0.1} />
      </mesh>

      {/* 환기 돔 (SG90) */}
      <group ref={domeRef} position={[0, 2.8, -2.2]}>
        <mesh position={[0, 0.4, 2.2]}>
          <boxGeometry args={[4.6, 0.1, 4.2]} />
          <meshStandardMaterial color="#67E8F9" transparent opacity={0.35} />
        </mesh>
      </group>

      {/* 화분 + 토양 + 식물 */}
      <group position={[0, 0.35, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.7, 1.6]} />
          <meshStandardMaterial color="#78350F" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <boxGeometry args={[2.6, 0.05, 1.4]} />
          <meshStandardMaterial color={soilColor} roughness={1} />
        </mesh>
        {[-0.9, -0.45, 0, 0.45, 0.9].map((x, i) => (
          <group key={i} position={[x, 0.4, i % 2 === 0 ? 0.25 : -0.25]}>
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.03, 0.04, 0.5]} />
              <meshStandardMaterial color="#15803D" />
            </mesh>
            <mesh position={[0, 0.55, 0]} scale={0.6 + soil / 200}>
              <sphereGeometry args={[0.2, 12, 12]} />
              <meshStandardMaterial color={soil < 35 ? '#A3A33A' : '#22C55E'} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 관수 펌프 (클릭 → 확장 명령) */}
      <group position={[1.9, 0, 1.6]}>
        <mesh
          position={[0, 0.35, 0]}
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            sendCommand('water', !pumpOn);
          }}
        >
          <cylinderGeometry args={[0.25, 0.25, 0.7, 20]} />
          <meshStandardMaterial color={pumpOn ? '#0EA5E9' : '#64748B'} emissive={pumpOn ? '#0EA5E9' : '#000000'} emissiveIntensity={0.4} />
        </mesh>
        <mesh ref={waterRef} position={[-0.9, 1.2, -0.8]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#38BDF8" />
        </mesh>
      </group>

      {/* 센서 배지 */}
      {!isModalOpen && (
        <Html position={[0, 1.9, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div className="flex gap-3 px-3 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/60 text-white text-xs whitespace-nowrap pointer-events-none">
            <span>
              토양 수분 <b className={soil < 35 ? 'text-rose-400' : 'text-emerald-400'}>{soil.toFixed(1)}%</b>
            </span>
            <span>
              온도 <b className="text-blue-400">{temp.toFixed(1)}℃</b>
            </span>
            <span>
              환기 돔 <b className="text-amber-400">{angle}°</b>
            </span>
            <span>
              펌프 <b className={pumpOn ? 'text-sky-400' : 'text-slate-400'}>{pumpOn ? 'ON' : 'OFF'}</b>
            </span>
          </div>
        </Html>
      )}

      {/* 플랫폼 기본 부품: RGB 생장등 · Cds 노드 */}
      <LightObject isModalOpen={isModalOpen} />
      <CdsSensorNode isModalOpen={isModalOpen} />
    </group>
  );
}
```

### 예제: `mock.js`
```js
// mock.js — 스마트 팜 온실 (예제 꾸러미)
// 토양 수분은 천천히 마르고, 펌프가 켜져 있으면 빠르게 올라갑니다. 온도가 높을수록 빨리 마릅니다.
let soil = 55;
let pump = false;

function round1(v) {
  return Math.round(v * 10) / 10;
}

module.exports = {
  tick(state) {
    const dry = 0.4 + Math.max(0, state.base.temperature - 24) * 0.08;
    soil += pump ? 4 : -dry + (Math.random() - 0.5) * 0.3;
    soil = Math.max(5, Math.min(95, soil));
    if (soil >= 80) pump = false; // 충분히 젖으면 자동 정지
    return { soil_moisture: round1(soil), pump_on: pump ? 1 : 0 };
  },

  onCommand(action, value) {
    if (action === 'water') {
      pump = !!value;
      const out = { pump_on: pump ? 1 : 0, soil_moisture: round1(soil) };
      // code.py 와 같이 관수 중에는 생장등을 초록으로 (기본 장치 값)
      if (pump) out.rgb_color = '#10B981';
      return out;
    }
  },
};
```

### 예제: `code.py`
```python
# code.py (팀 모듈) — 스마트 팜 온실 (예제 꾸러미)
# 이 팀 전용 Pico 2 W 의 펌웨어가 teams/<공간ID>.py 로 불러옵니다. (npm run firmware:bundle)
# 확장 장치: 토양 수분 센서(GP27/ADC1), 관수 펌프 릴레이(GP21)
# 기본 장치(SG90 환기 돔, RGB 생장등)는 base 객체로만 제어합니다.
import board
import analogio
import digitalio

ROOM_ID = "example_smart_farm"

soil = None
pump = None


def setup(base):
    global soil, pump
    soil = analogio.AnalogIn(board.GP27)
    pump = digitalio.DigitalInOut(board.GP21)
    pump.direction = digitalio.Direction.OUTPUT
    pump.value = False


def read(base):
    # 정전용량식 센서: 값이 클수록 건조 → 퍼센트로 뒤집어 환산
    moisture = round(100 - soil.value / 65535 * 100, 1)
    if moisture >= 80 and pump.value:
        pump.value = False  # 충분히 젖으면 자동 정지
    return {"soil_moisture": moisture, "pump_on": 1 if pump.value else 0}


def handle(base, action, value):
    if action == "water":
        pump.value = bool(value)
        if pump.value:
            base.set_rgb("#10B981", "ON")  # 관수 중 생장등 초록
        return {"ok": True, "pump_on": 1 if pump.value else 0}
    return {"ok": False, "error": "unknown action: " + str(action)}
```
