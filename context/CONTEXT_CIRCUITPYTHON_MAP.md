# CONTEXT_CIRCUITPYTHON_MAP: Pico 2 W 핀맵 & 공간별 펌웨어 규격

> 팀 code.py 작성 규칙은 `CONTEXT_ROOM_PACKAGE_SPEC.md` 5장입니다. 이 문서는 하드웨어 결선, IP 설정, 펌웨어 구조입니다.

## 0. 공간마다 Pico 2 W 1대
- 주제마다 센서와 액추에이터가 다르므로 **공간(팀)마다 Pico 2 W 를 따로** 씁니다.
- 각 Pico 는 **서로 다른 IP** 를 가져야 합니다. 플랫폼에서 공간을 선택하면 그 공간에 저장된 IP 로 자동 연결됩니다.
- 기본 예제 공간(스마트 거실 · 팜 · 팩토리)도 각각 Pico 를 연결할 수 있습니다. (공간 메뉴 ⋮ → Pico 연결 설정)

## 1. 기본 장치 결선 (연결하는 장치만, 핀 변경 금지)

| 장치 (`baseDevices`) | 부품 | 핀 | 신호 | 필요한 lib |
| :--- | :--- | :--- | :--- | :--- |
| 온습도 센서 (`dht11`) | DHT11 | `board.GP15` | Digital | `adafruit_dht.mpy` |
| 조도 센서 (`cds`) | Cds + 10kΩ | `board.GP26` (ADC0) | Analog | - |
| 서보 모터 (`sg90`) | SG90 | `board.GP16` | PWM 50Hz | `adafruit_motor/` |
| RGB LED (`rgb`) | 공통 캐소드 | `GP18`(R) `GP19`(G) `GP20`(B) | PWM 1kHz | - |

- room.json `baseDevices` 에 넣은 장치만 펌웨어가 초기화합니다. 넣지 않은 장치의 핀은 팀 확장 부품에 써도 됩니다.
- **항상 사용 불가:** `GP23`, `GP24`, `GP25`, `GP29` (Pico 2 W 무선 모듈 내부 사용)
- **권장 버전:** CircuitPython **10.x** (Pico 2 W 용 UF2, 2026-10 기준 10.3.x) + Adafruit CircuitPython Bundle **10.x** 의 `lib/`. 버전이 다른 번들의 `.mpy` 는 불러오지 못합니다.

## 2. 팀 확장 핀 가이드
| 부품 종류 | 추천 핀 | CircuitPython |
| :--- | :--- | :--- |
| 아날로그 센서 (토양 수분, 수위, 가변저항) | `GP27` (ADC1), `GP28` (ADC2), (Cds 미사용 시) `GP26` (ADC0) | `analogio.AnalogIn` |
| 디지털 입력 (PIR, 불꽃, 버튼, 초음파 Echo) | `GP13`, `GP14`, `GP17`, `GP22` | `digitalio.DigitalInOut` |
| 디지털 출력 (릴레이, 버저, LED) | `GP21`, `GP0` ~ `GP12` | `digitalio.DigitalInOut` / `pwmio.PWMOut` |

- 사용하는 핀은 room.json `pins` 에 적습니다. `baseDevices` 장치의 핀과 겹치면 업로드 창과 `firmware:bundle` 이 경고합니다.
- Pico 가 팀마다 따로 있으므로 다른 팀과 같은 핀 번호를 써도 됩니다.
- **PWM 짝 핀 (RP2350):** `GP16`·`GP17`, `GP18`·`GP19` 는 같은 PWM 슬라이스입니다. 둘 다 `pwmio.PWMOut` 으로 쓰면 주파수가 같아야 합니다. (SG90 50Hz 를 쓰는 공간에서 `GP17` 은 디지털 입력 · 출력으로 쓰거나, PWM 이면 `frequency=50`) — 주파수가 다르면 `ValueError` 가 납니다.
- **내부 풀다운 주의 (RP2350 E9):** 디지털 입력은 `Pull.UP` 을 쓰고 '눌림/감지 = False' 로 판단하거나, 외부 10kΩ 풀다운 저항을 다세요. `Pull.DOWN` 은 입력이 HIGH 로 붙어 버릴 수 있습니다.

## 3. Pico IP 정하기 (공간마다 다르게)
**방법 ① 고정 IP (권장)** — `settings.toml` 에 적으면 펌웨어가 **Wi-Fi 연결 직후** `wifi.radio.set_ipv4_address()` 로 설정합니다. (`connect()` 가 DHCP 를 다시 시작하므로 재연결할 때마다 다시 적용)
```toml
CIRCUITPY_WIFI_SSID = "전시장 Wi-Fi"
CIRCUITPY_WIFI_PASSWORD = "비밀번호"
PICO_STATIC_IP = "192.168.0.51"   # 공간마다 다른 값 (플랫폼의 Pico IP 와 같게)
PICO_NETMASK   = "255.255.255.0"  # 생략 가능
PICO_GATEWAY   = "192.168.0.1"    # 생략 시 x.x.x.1
# PICO_DNS     = "8.8.8.8"        # 선택
```
- 플랫폼 공간에 Pico IP 를 먼저 입력해 두면 `npm run firmware:bundle -- <공간ID> E:\` 가 `PICO_STATIC_IP` 를 자동으로 써 줍니다.
- 고정 IP 는 공유기의 DHCP 범위 밖이면서 같은 대역(예: 192.168.0.x)이어야 합니다. 공유기 정보는 선생님께 확인하세요.
- 시리얼 창에 `고정 IP 적용: 192.168.0.51` 이 나오면 성공입니다. 값이 잘못되면 `고정 IP 설정 값 오류` 와 함께 DHCP 주소로 동작합니다.
- **웹 워크플로(브라우저 코드 편집기)** 를 쓰려고 `CIRCUITPY_WEB_API_PASSWORD` 를 넣으면 80 포트를 차지해 플랫폼 서버가 시작되지 않습니다. 함께 `CIRCUITPY_WEB_API_PORT = 8080` 을 넣으세요.

**방법 ② 공유기 DHCP 예약** — `PICO_STATIC_IP` 를 비우고, 공유기 관리 화면에서 Pico 의 MAC 주소에 IP 를 예약합니다. 부팅 시 시리얼 창의 `Pico 2 W IP: …` 를 플랫폼 Pico 연결 설정에 입력합니다.

## 4. CIRCUITPY 드라이브 구성 (공간 1개)
```
CIRCUITPY/
├── code.py           ← firmware/circuitpython/code.py (플랫폼 펌웨어, 학생 수정 금지)
├── config.py         ← ROOM_ID, BASE_DEVICES (firmware:bundle 이 room.json 으로 생성)
├── settings.toml     ← Wi-Fi + PICO_STATIC_IP
├── teams/
│   └── room_xxxx.py  ← 우리 팀 code.py (이 Pico 에는 이 공간 하나만)
└── lib/              ← adafruit_httpserver/ (+ dht11 쓰면 adafruit_dht.mpy, sg90 쓰면 adafruit_motor/)
```
```bash
npm run firmware:bundle                       # 공간 목록 (공간 ID · IP · 기본 장치)
npm run firmware:bundle -- room_xxxx E:\      # E: = 이 공간 Pico 의 CIRCUITPY 드라이브
```

## 5. 펌웨어 동작 (자동 복구)
- Wi-Fi 연결은 최대 3번 시도하고, 실패하면 **10초마다 다시 시도**합니다. (공유기가 늦게 켜져도 괜찮음)
- 전시 중 Wi-Fi 가 끊기면 5초 안에 알아채고 **재연결 → 고정 IP 재적용 → 서버 재시작**을 자동으로 합니다.
- DHT11 은 2초에 한 번만 읽고 마지막 정상 값을 보관합니다. 한 번도 못 읽었으면 `temperature`/`humidity` 를 보내지 않습니다(화면 '수신 대기'). `dht_ok: false` 면 배선을 확인하세요.
- 팀 모듈의 `base.temperature()` · `base.humidity()` 도 이 보관 값을 돌려줍니다. (팀 모듈이 `adafruit_dht` 를 따로 만들면 GP15 충돌)

## 6. 펌웨어 REST API (모든 Pico 공통)

### `GET /api/status`
```json
{
  "status": "online", "room": "room_xxxx", "base_devices": ["dht11", "sg90", "rgb"], "ip": "192.168.0.51",
  "temperature": 23.0, "humidity": 41, "dht_ok": true,
  "servo_angle": 90, "rgb_color": "#FF5500", "rgb_state": "ON",
  "rooms": { "room_xxxx": { "soil_moisture": 41.2, "pump_on": 0 } },
  "custom": { "soil_moisture": 41.2, "pump_on": 0 },
  "team_errors": {}
}
```
연결한 기본 장치의 값만 포함합니다. (`temperature`/`humidity`/`dht_ok` ← dht11, `light_adc` ← cds, `servo_angle` ← sg90, `rgb_color`/`rgb_state` ← rgb)

### `POST /api/servo` `{ "angle": 90 }` · `POST /api/rgb` `{ "color": "#00FF88", "state": "ON" }`
기본 장치 제어. 연결하지 않은 장치면 `{ "success": false, "error": "이 Pico 에는 … 연결되어 있지 않습니다" }`

### `POST /api/command` `{ "room": "room_xxxx", "action": "water", "value": true }`
팀 모듈의 `handle(base, action, value)` 실행 → `{ "success": true, "result": {...} }`

### `GET /api/teams`
`{ "room": "room_xxxx", "base_devices": [...], "loaded": [...], "errors": {...} }` (전시 전 점검용)

모든 응답에는 CORS 헤더(`Access-Control-Allow-Origin: *`)가 포함됩니다.

## 7. Pico 없이 연습 (mock 서버)
```bash
npm run mock:pico -- --room room_aaaa --port 5051   # 공간 A 의 Pico → 플랫폼 IP 127.0.0.1:5051
npm run mock:pico -- --room room_bbbb --port 5052   # 공간 B 의 Pico → 플랫폼 IP 127.0.0.1:5052
```
`--room` 을 주면 그 공간의 `baseDevices` 와 `mock.js` 로 실제 Pico 와 같은 형식으로 응답합니다.

> ⚠ 포트 5060 · 5061 · 6000 · 6665~6669 · 10080 등은 브라우저가 보안상 막는 포트라 쓸 수 없습니다. (mock 서버와 Pico 연결 설정 모두 거부) 5051, 5052, 5053 … 을 쓰세요.
