# CONTEXT_CIRCUITPYTHON_MAP: Pico 2 W 핀맵 & 통합 펌웨어 규격

> 팀 code.py 작성 규칙은 `CONTEXT_ROOM_PACKAGE_SPEC.md` 5장입니다. 이 문서는 하드웨어 결선과 통합 펌웨어 구조입니다.

## 1. 공용 기본 장치 결선 (전시용 1세트, 변경 금지)

| 장치 | 부품 | 핀 | 신호 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| 온습도 센서 | DHT11 | `board.GP15` | Digital | `adafruit_dht.DHT11` |
| 조도 센서 | Cds + 10kΩ | `board.GP26` (ADC0) | Analog | 0 ~ 65535 |
| 서보 모터 | SG90 | `board.GP16` | PWM 50Hz | `adafruit_motor.servo`, 0 ~ 180° |
| RGB LED | 공통 캐소드 | `GP18`(R) `GP19`(G) `GP20`(B) | PWM 1kHz | Hex 색상 → 듀티 |

**사용 불가:** 위 핀 + `GP23`, `GP24`, `GP25`, `GP29` (Pico 2 W 무선 모듈 내부 사용)

## 2. 팀 확장 핀 배정 가이드
| 부품 종류 | 추천 핀 | CircuitPython |
| :--- | :--- | :--- |
| 아날로그 센서 (토양 수분, 수위, 가변저항) | `GP27` (ADC1), `GP28` (ADC2) | `analogio.AnalogIn` |
| 디지털 입력 (PIR, 불꽃, 버튼, 초음파 Echo) | `GP13`, `GP14`, `GP17`, `GP22` | `digitalio.DigitalInOut` |
| 디지털 출력 (릴레이, 버저, LED) | `GP21`, `GP0` ~ `GP12` | `digitalio.DigitalInOut` / `pwmio.PWMOut` |

- 여러 팀이 하나의 Pico 를 공유하므로 **팀별로 핀을 미리 나눠 주는 것**을 권장합니다. (예: 1팀 GP27·GP21, 2팀 GP28·GP22 …)
- 각 팀은 사용하는 핀을 room.json `pins` 에 적습니다. 업로드 창과 `npm run firmware:bundle` 이 겹침을 검사합니다.
- ADC 입력이 2개(GP27, GP28)뿐이므로 아날로그 센서가 필요한 팀이 많으면 선생님이 조정합니다.

## 3. CIRCUITPY 드라이브 구성
```
CIRCUITPY/
├── code.py           ← firmware/circuitpython/code.py (통합 펌웨어, 학생 수정 금지)
├── settings.toml     ← Wi-Fi 정보
├── teams/
│   ├── room_xxxx.py  ← 팀 A 의 code.py
│   └── room_yyyy.py  ← 팀 B 의 code.py
└── lib/              ← adafruit_httpserver/, adafruit_motor/, adafruit_dht.mpy (+ 팀이 요청한 라이브러리)
```
`npm run firmware:bundle -- E:\` (E: = CIRCUITPY) 한 번으로 code.py 와 teams/ 가 채워집니다.

## 4. 통합 펌웨어 REST API

### `GET /api/status`
```json
{
  "status": "online",
  "temperature": 24.5, "humidity": 45.0, "light_adc": 48200,
  "servo_angle": 90, "rgb_color": "#FF5500", "rgb_state": "ON",
  "rooms": { "room_xxxx": { "soil_moisture": 41.2, "pump_on": 0 } },
  "custom": { "soil_moisture": 41.2, "pump_on": 0 },
  "team_errors": {}
}
```
대시보드는 현재 공간의 `rooms[공간ID]` 값을 확장 센서로 사용합니다.

### `POST /api/servo` `{ "angle": 90 }` · `POST /api/rgb` `{ "color": "#00FF88", "state": "ON" }`
기본 장치 제어 (기존과 동일)

### `POST /api/command` `{ "room": "room_xxxx", "action": "water", "value": true }`
해당 팀 모듈의 `handle(base, action, value)` 실행 → `{ "success": true, "result": {...} }`

### `GET /api/teams`
로드된 팀 모듈과 오류 목록 `{ "loaded": [...], "errors": { "room_xxxx": "..." } }` (전시 전 점검용)

모든 응답에는 CORS 헤더(`Access-Control-Allow-Origin: *`)가 포함됩니다.
