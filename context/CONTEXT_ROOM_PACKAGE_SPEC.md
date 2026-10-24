# CONTEXT_ROOM_PACKAGE_SPEC: 공간 꾸러미(Room Package) 규격

> 이 문서는 AI와 학생이 **반드시 지켜야 하는 규격**입니다. 규격 밖의 import, 파일 이름, 함수 이름을 만들면 업로드 단계에서 거부되거나 화면에 오류 배지가 뜹니다.

## 0. 가장 중요한 원칙

1. **플랫폼 원본(`src/`, `firmware/`)은 수정하지 않습니다.** 팀이 만드는 것은 아래 4개 파일뿐입니다.
2. 전시회에는 **윈도우 PC 1대 + 모니터 + Pico 2 W 1세트**만 있습니다. 모든 팀이 같은 하드웨어를 공유합니다.
3. 기본 4종 장치(DHT11 · Cds · SG90 · RGB LED)는 **모든 팀 공용**입니다. 팀 주제에 맞게 의미를 바꿔 씁니다. (예: SG90 = 급식기 뚜껑, RGB LED = 경고등)
4. 추가 센서/액추에이터가 필요하면 **확장 센서(customSensors)** 와 **확장 핀(pins)** 으로 선언합니다.

| 파일 | 역할 | 실행 위치 |
| :--- | :--- | :--- |
| `room.json` | 공간 이름, 팀, 아이콘, 확장 센서, 확장 핀 | 플랫폼 서버 |
| `Scene.tsx` | 3D 공간 화면 (React Three Fiber) | 브라우저 (업로드 즉시 적용) |
| `mock.js` | 하드웨어 없이 확장 센서 가짜 값 생성 | 브라우저 시뮬레이션 + `mock_pico_server.js` |
| `code.py` | Pico 2 W 팀 모듈 (CircuitPython) | 통합 펌웨어 `teams/<공간ID>.py` |

---

## 1. 공용 하드웨어 (기본 4종, 핀 변경 금지)

| 장치 | 핀 | Scene.tsx (SDK) | code.py (base 객체) |
| :--- | :--- | :--- | :--- |
| DHT11 온습도 | GP15 | `useSensor('dht11_temp')` ℃, `useSensor('dht11_humi')` % | `base.temperature()`, `base.humidity()` (읽기 실패 시 `None`) |
| Cds 조도 | GP26 (ADC0) | `useSensor('cds_light')` 0~65535 | `base.light()` |
| SG90 서보 | GP16 | `useServo()` → `{ angle, setAngle }` (0~180°) | `base.servo_angle()`, `base.set_servo(angle)` |
| RGB LED | GP18 / GP19 / GP20 | `useRgb()` → `{ color, on, setColor, setOn }` | `base.rgb()`, `base.set_rgb("#RRGGBB", "ON")` |

**사용 금지 핀:** GP15, GP16, GP18, GP19, GP20, GP26 (기본 장치), GP23, GP24, GP25, GP29 (Pico 2 W 무선 모듈)
**확장에 쓸 수 있는 핀 예:** GP0~GP14, GP17, GP21, GP22, GP27 (ADC1), GP28 (ADC2)
다른 팀과 같은 핀을 쓰면 업로드 화면과 `npm run firmware:bundle` 에서 경고합니다.

---

## 2. `room.json`

```json
{
  "name": "스마트 펫 급식기",
  "team": "1학년 3반 2팀",
  "iconType": "home",
  "sensorsDesc": "사료 무게 · 급식기 뚜껑",
  "customSensors": [
    { "key": "food_weight", "name": "사료 무게", "unit": "g", "min": 0, "max": 500, "minWarning": 50 }
  ],
  "pins": ["GP27"]
}
```

- `iconType`: `home` | `farm` | `factory` | `sparkles` | `shield`
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
import { Html } from '@react-three/drei';
import { useSensor, useCustomValue, useServo, useRgb, sendCommand } from '@/core/sdk';

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  // ...
  return <group>{/* 3D 오브젝트 */}</group>;
}
```

### 3.1 규칙
1. **`export default` 컴포넌트 1개**를 내보냅니다. `isModalOpen` prop 을 받습니다.
2. `<Canvas>`, 조명(ambient/hemisphere/directional), 카메라, OrbitControls 는 **플랫폼이 이미 제공**합니다. 만들지 마세요. (필요하면 `pointLight`/`spotLight` 정도만 추가)
3. 공간 크기: 바닥은 원점 기준 약 **7 × 7** 안쪽, 높이 0 ~ 3.
4. `<Html>` 배지는 **반드시** `zIndexRange={[10, 0]}` 를 주고 `{!isModalOpen && ...}` 로 감쌉니다. (모달 가림 방지)
5. 클릭 이벤트는 `onClick={(e) => { e.stopPropagation(); ... }}` (빈 곳 클릭 시 선택 해제와 충돌 방지)
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
| `@/components/3d/LightObject` | `<LightObject isModalOpen={isModalOpen} />` RGB LED 천장 조명 |
| `@/components/3d/CdsSensorNode` | `<CdsSensorNode isModalOpen={isModalOpen} />` 조도 센서 노드 |
| `@/components/3d/DoorObject` | `<DoorObject />` SG90 연동 문 |
| `@/components/3d/DhtSensorBadge` | `<DhtSensorBadge />` 온습도 배지 |

### 3.3 SDK (`@/core/sdk`)
| 함수 | 반환 / 동작 |
| :--- | :--- |
| `useSensor(id)` | `id`: `'dht11_temp'` \| `'dht11_humi'` \| `'cds_light'` → `{ value, unit, isStale, ... }` |
| `useCustomSensor(key)` | 확장 센서 전체 정보 또는 `undefined` (아직 값이 없을 때) |
| `useCustomValue(key, fallback = 0)` | 확장 센서 숫자 값 (없으면 fallback) |
| `useServo()` | `{ angle, targetAngle, pending, setAngle(angle) }` |
| `useRgb()` | `{ color, on, pending, setColor('#RRGGBB'), setOn(true/false) }` |
| `sendCommand(action, value)` | 팀 확장 명령 전송. 시뮬레이션 → `mock.js onCommand()`, 하드웨어 → `code.py handle()` |
| `usePlatformMode()` | `'simulation'` \| `'hardware'` |

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
- 반환값: `{ 확장센서key: 숫자 }` (`true`/`false` 는 1/0 으로 변환). 반환하지 않아도 됩니다.
- **순수 JavaScript** (TypeScript 문법, `import`, `require`, `fetch`, `setTimeout` 금지). 파일 맨 위의 `let` 변수로 상태를 유지합니다.
- 기본 4종 장치 값은 플랫폼이 만듭니다. mock.js 는 **확장 센서만** 만듭니다.

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
    """/api/status 요청마다: { 확장센서key: 숫자 } 반환"""
    return {"food_weight": round(weight_sensor.value / 65535 * 500)}


def handle(base, action, value):
    """Scene.tsx sendCommand(action, value) → POST /api/command"""
    if action == "feed":
        base.set_servo(90)          # 기본 SG90 = 급식기 뚜껑
        return {"ok": True}
    return {"ok": False, "error": "unknown action: " + str(action)}
```

- **CircuitPython 9.x** 문법 (MicroPython 전용 `machine` 모듈 금지)
- Wi-Fi, HTTP 서버, 기본 4종 장치 초기화는 통합 펌웨어가 합니다. 팀 모듈에서 **`wifi`, `socketpool`, `adafruit_httpserver` 사용과 기본 핀(GP15/16/18/19/20/26) 재초기화 금지**
- `while True` 무한 루프, `time.sleep()` 긴 대기 금지 (전체 서버가 멈춤)
- 사용 가능한 라이브러리: `board`, `analogio`, `digitalio`, `pwmio`, `time`, `math`, `adafruit_motor` (그 외 라이브러리는 선생님과 상의)
- 오류가 나도 해당 팀 모듈만 꺼지고 다른 팀은 계속 동작합니다. 오류 내용은 `http://<Pico IP>/api/teams` 에서 확인합니다.

---

## 6. 데이터 흐름 (한눈에 보기)

```
[시뮬레이션 모드]  mock.js tick()  ─────────────▶  확장 센서 값  ─▶  Scene.tsx useCustomValue()
                  Scene.tsx sendCommand() ──▶  mock.js onCommand()

[하드웨어 모드]    Pico teams/<id>.py read()  ─▶ GET /api/status { rooms: { <id>: {...} } } ─▶ Scene.tsx
                  Scene.tsx sendCommand() ──▶ POST /api/command { room, action, value } ─▶ handle()
                  (Pico 없이 연습: node firmware/mock_pico_server.js → IP 127.0.0.1:5050)
```

## 7. 자주 나는 오류

| 메시지 | 원인 / 해결 |
| :--- | :--- |
| `"xxx" 모듈은 사용할 수 없습니다` | 3.2 허용 모듈만 import |
| `Scene.tsx에 화면 컴포넌트가 없습니다` | `export default function Scene() {...}` 추가 |
| `문법 오류 (Scene.tsx)` | 괄호/태그 짝 확인. 오류 줄 번호를 AI에게 전달 |
| 확장 센서가 `수신 대기` | room.json key 와 mock.js / code.py 반환 key 가 다름 |
| `mock.js에 onCommand가 없어…` | mock.js 에 `onCommand` 추가 |
| `핀 충돌` | room.json `pins` 를 다른 빈 핀으로 변경하고 code.py 도 같이 수정 |
