# Raspberry Pi Pico 2 W - CircuitPython 1분 퀵 셋업 가이드

학생 여러분, Thonny나 복잡한 프로그래밍 툴을 설치할 필요가 없습니다!
CircuitPython은 일반 USB 메모리(외장하드)를 다루듯 파일만 복사하면 즉시 실행됩니다.

## 1. 초기 펌웨어 설치 (최초 1회만)
1. Pico 2 W의 하얀색 **`BOOTSEL` 버튼을 누른 채로** PC의 USB 포트에 연결합니다.
2. PC에 **`RPI-RP2`** 드라이브가 나타납니다.
3. [CircuitPython 공식 사이트](https://circuitpython.org/board/raspberry_pi_pico2_w/)에서 Pico 2 W용 **10.x 안정판** `.uf2` 파일(2026-10 기준 10.3.x)을 다운로드하여 `RPI-RP2` 드라이브로 드래그 앤 드롭합니다. (Pico 2 W 는 `RP2350` 이라는 이름으로 나타날 수도 있습니다)
4. 잠시 후 보드가 재부팅되면서 **`CIRCUITPY`** 라는 새로운 USB 드라이브가 마운트됩니다.

## 2. 우리 공간의 펌웨어 복사 (Pico 1대 = 공간 1개)
이 폴더의 `code.py` 는 **공간별 Pico 펌웨어**입니다. `config.py` 의 `BASE_DEVICES` 에 있는 기본 장치만 제어하고,
그 공간이 업로드한 `code.py` 를 `teams/<공간ID>.py` 팀 모듈로 불러옵니다. 학생은 이 파일을 수정하지 않습니다.

1. 공간 ID 확인: 플랫폼 폴더에서 `npm run firmware:bundle` (공간 ID · Pico IP · 기본 장치 목록)
2. 플랫폼에서 그 공간의 **Pico 연결 설정**에 사용할 IP(예: `192.168.0.51`)를 저장해 둡니다.
3. 아래 명령을 실행합니다. (`E:` 는 이 Pico 의 CIRCUITPY 드라이브 문자)
   ```bash
   npm run firmware:bundle -- room_xxxx E:\
   ```
   - `code.py`, `config.py`(ROOM_ID · BASE_DEVICES), `teams/room_xxxx.py` 를 복사합니다. (다른 팀 파일은 지움)
   - `settings.toml` 은 없으면 새로 만들고, 저장된 Pico IP 를 `PICO_STATIC_IP` 로 써 줍니다. (Wi-Fi 정보는 그대로 유지)
   - 핀 충돌이나 Python 문법 오류가 있으면 `[오류]` 로 알려 줍니다.
4. `settings.toml` 을 메모장으로 열어 전시장 Wi-Fi 이름과 암호를 입력합니다. (2.4GHz Wi-Fi 만 연결됩니다) 고정 IP 를 쓰지 않으려면 `PICO_STATIC_IP` 줄을 지우고 공유기에서 IP 를 예약하세요.
   - 웹 편집기(웹 워크플로)를 쓰려고 `CIRCUITPY_WEB_API_PASSWORD` 를 넣으면 반드시 `CIRCUITPY_WEB_API_PORT = 8080` 도 함께 넣으세요. (80 포트는 플랫폼 서버용)
5. `lib` 폴더에 [Adafruit Library Bundle](https://circuitpython.org/libraries)의 **10.x 번들**에서 라이브러리를 복사합니다. (스크립트가 '필요 lib' 로 알려 줌. 버전이 다른 번들의 `.mpy` 는 불러오지 못합니다)
   - `adafruit_httpserver/` (항상)
   - `adafruit_dht.mpy` (DHT11 을 쓸 때), `adafruit_motor/` (SG90 을 쓸 때)
   - (팀이 요청한 추가 라이브러리, 예: `adafruit_hcsr04.mpy`)

## 3. 실행 및 확인
- 파일을 저장하는 즉시 Pico 2 W가 자동으로 코드를 다시 실행합니다.
- 시리얼 모니터에 `펌웨어 시작 (공간: room_xxxx …)`, `[팀 모듈] room_xxxx 로드 완료`, `Pico 2 W IP: …` 가 나오는지 확인합니다.
- 브라우저에서 `http://<Pico IP>/api/teams` 를 열면 공간 · 기본 장치 · 팀 모듈 오류를 볼 수 있습니다.
- 출력된 IP 가 플랫폼 그 공간의 **Pico 연결 설정** IP 와 같은지 확인하고, 하드웨어 모드로 저장하세요. 공간을 선택하면 자동 연결됩니다.
- 고정 IP 를 쓰면 `고정 IP 적용: 192.168.0.51` 이 나와야 합니다. `[주의] 고정 IP … 적용 안 됨` 이나 `고정 IP 설정 값 오류` 가 나오면 settings.toml 의 `PICO_*` 값을 확인하세요.
- `dht_ok: false` (`/api/status`) 는 DHT11 을 읽지 못했다는 뜻입니다. GP15 배선과 전원을 확인하세요.
- 팀 모듈에 오류가 있어도 기본 장치와 웹 서버는 계속 동작합니다.

## 4. 자동 복구 (전시 중)
- 공유기가 Pico 보다 늦게 켜져도 10초마다 다시 연결을 시도합니다.
- 전시 중 Wi-Fi 가 끊기면 자동으로 다시 연결하고, 같은 고정 IP 로 서버를 다시 시작합니다. Pico 를 다시 꽂을 필요가 없습니다.
- `HTTP Server 시작 실패` 가 반복되면 80 포트를 웹 워크플로가 쓰고 있는지 확인하세요. (`CIRCUITPY_WEB_API_PORT = 8080`)
