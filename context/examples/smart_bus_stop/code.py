# code.py (팀 모듈) — 스마트 버스정류장 쉼터
# 확장 장치: PIR 사람 감지 센서(GP14), 벤치 히터 표시용 빨간 LED(GP21)
# 기본 장치(DHT11 기온, Cds 조도, RGB LED 조명)는 base 객체로만 사용합니다.
# bus_eta 는 센서 없이 Pico 가 계산합니다 (6초마다 1분씩 감소, 0 이 되면 5초 정차 후 10 으로)
import board
import digitalio
import time

ROOM_ID = "example_bus_stop"

COLD_C = 22            # 이 온도 미만이면 '추움'
NIGHT_LIGHT = 25000    # 조도가 이 값 미만이면 '밤'
HEATER_HOLD = 30       # 사람이 30초 동안 없으면 히터 끔 / 벤치 클릭 시 30초 켬
ETA_MAX = 10           # 버스 도착까지 (분)
ETA_STEP = 6           # 6초마다 1씩 감소
BUS_STOP_SEC = 5       # 0 이 된 뒤 정차 시간
WARM_WHITE = "#FFE4B5"
GREEN = "#22C55E"

# HC-SR501 같은 일반 PIR 은 사람을 감지하면 출력이 HIGH(True) 입니다.
# 우리 모듈이 감지할 때 LOW 를 내보내는 종류라면 False 로 바꾸세요.
PIR_DETECT_VALUE = True

pir = None
heater_led = None
auto_heater = False
manual_until = 0
last_person_time = 0
eta_start = 0
last_rgb = None


def setup(base):
    global pir, heater_led, last_person_time, eta_start
    pir = digitalio.DigitalInOut(board.GP14)
    pir.direction = digitalio.Direction.INPUT
    pir.pull = digitalio.Pull.UP          # RP2350 에라타: Pull.DOWN 금지
    heater_led = digitalio.DigitalInOut(board.GP21)
    heater_led.direction = digitalio.Direction.OUTPUT
    heater_led.value = False
    now = time.monotonic()
    last_person_time = now
    eta_start = now


def _bus_eta(now):
    global eta_start
    elapsed = now - eta_start
    if elapsed >= ETA_MAX * ETA_STEP + BUS_STOP_SEC:
        eta_start = now                   # 버스 출발 → 다시 10분부터
        elapsed = 0
    return max(0, ETA_MAX - int(elapsed // ETA_STEP))


def _update_rgb(base, eta):
    global last_rgb
    if not base.has("rgb"):
        return
    light = base.light() if base.has("cds") else None
    if eta <= 1:
        want = (GREEN, "ON")              # 규칙 4: 버스 1분 전 초록
    elif light is not None and light < NIGHT_LIGHT:
        want = (WARM_WHITE, "ON")         # 규칙 3: 밤에는 따뜻한 흰색
    else:
        want = ("#000000", "OFF")         # 밝은 낮에는 끔
    if want != last_rgb:                  # 바뀔 때만 보내기 (대시보드 조작 존중)
        base.set_rgb(want[0], want[1])
        last_rgb = want


def read(base):
    global auto_heater, last_person_time
    now = time.monotonic()

    person = 1 if pir.value == PIR_DETECT_VALUE else 0
    if person:
        last_person_time = now

    temp = base.temperature() if base.has("dht11") else None
    cold = temp is not None and temp < COLD_C

    # 규칙 1: 춥고 사람이 있으면 히터 ON
    if cold and person:
        auto_heater = True
    # 규칙 2: 사람이 30초 동안 없으면 히터 OFF
    if auto_heater and now - last_person_time >= HEATER_HOLD:
        auto_heater = False

    heater_on = auto_heater or now < manual_until
    heater_led.value = heater_on

    eta = _bus_eta(now)
    _update_rgb(base, eta)

    return {
        "person": person,
        "bus_eta": eta,
        "heater": 1 if heater_on else 0,
    }


def handle(base, action, value):
    global manual_until
    if action == "heater":
        if value:
            manual_until = time.monotonic() + HEATER_HOLD   # 기온과 관계없이 30초
            heater_led.value = True
        else:
            manual_until = 0
        return {"ok": True, "heater": 1 if heater_led.value else 0}
    return {"ok": False, "error": "unknown action: " + str(action)}
