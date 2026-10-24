# Raspberry Pi Pico 2 W - CircuitPython 1분 퀵 셋업 가이드

학생 여러분, Thonny나 복잡한 프로그래밍 툴을 설치할 필요가 없습니다!
CircuitPython은 일반 USB 메모리(외장하드)를 다루듯 파일만 복사하면 즉시 실행됩니다.

## 1. 초기 펌웨어 설치 (최초 1회만)
1. Pico 2 W의 하얀색 **`BOOTSEL` 버튼을 누른 채로** PC의 USB 포트에 연결합니다.
2. PC에 **`RPI-RP2`** 드라이브가 나타납니다.
3. [CircuitPython 공식 사이트](https://circuitpython.org/board/raspberry_pi_pico2_w/)에서 Pico 2 W용 `.uf2` 파일을 다운로드하여 `RPI-RP2` 드라이브로 드래그 앤 드롭합니다.
4. 잠시 후 보드가 재부팅되면서 **`CIRCUITPY`** 라는 새로운 USB 드라이브가 마운트됩니다.

## 2. 통합 펌웨어 복사 (교사가 전시 전 1회)
이 폴더의 `code.py` 는 **전시용 통합 펌웨어**입니다. 기본 4종(DHT11 · Cds · SG90 · RGB LED)을 제어하고,
각 팀이 업로드한 `code.py` 를 `teams/<공간ID>.py` 팀 모듈로 불러옵니다. 학생은 이 파일을 수정하지 않습니다.

1. 플랫폼 폴더에서 아래 명령을 실행합니다. (`E:` 는 CIRCUITPY 드라이브 문자)
   ```bash
   npm run firmware:bundle -- E:\
   ```
   - `code.py`, `teams/*.py` 를 복사하고, `settings.toml` 은 드라이브에 없을 때만 복사합니다.
   - 핀 충돌이나 Python 문법 오류가 있으면 `[오류]` 로 알려 줍니다.
2. `settings.toml` 을 메모장으로 열어 전시장 Wi-Fi 이름과 암호를 입력합니다.
3. `lib` 폴더에 [Adafruit Library Bundle](https://circuitpython.org/libraries)에서 다음 라이브러리를 복사합니다:
   - `adafruit_dht.mpy`
   - `adafruit_motor/`
   - `adafruit_httpserver/`
   - (팀이 요청한 추가 라이브러리, 예: `adafruit_hcsr04.mpy`)

## 3. 실행 및 확인
- 파일을 저장하는 즉시 Pico 2 W가 자동으로 코드를 다시 실행합니다.
- 시리얼 모니터에 `[팀 모듈] room_xxxx 로드 완료` 가 팀 수만큼 나오는지 확인합니다.
- 브라우저에서 `http://<Pico IP>/api/teams` 를 열면 로드된 팀과 오류 목록을 볼 수 있습니다.
- IP 주소를 웹 대시보드 상단 **[Pico 2 W 연결 설정]** 에 입력하고 **[하드웨어 모드]**로 전환하세요!
- 한 팀 모듈에 오류가 있어도 그 팀 기능만 꺼지고 기본 기능과 다른 팀은 계속 동작합니다.
