# code.py (팀 모듈) — 화재 방재 안전실 (예제 꾸러미)
# 이 팀 전용 Pico 2 W 의 펌웨어가 teams/<공간ID>.py 로 불러옵니다. (npm run firmware:bundle)
# 기본 장치: DHT11(실내 온도), RGB LED(경보등) — SG90 · Cds 는 연결하지 않음
# 확장 장치: 불꽃 감지 센서(감지 시 LOW) → GP17
#            능동 부저 (PWM) → GP16  (SG90 을 쓰지 않으므로 확장에 사용 가능)
import board
import digitalio
import pwmio

ROOM_ID = "example_fire_safety"
ALARM_TEMP = 35

flame_sensor = None
buzzer = None
alarm = False


def setup(base):
    global flame_sensor, buzzer
    flame_sensor = digitalio.DigitalInOut(board.GP17)
    flame_sensor.direction = digitalio.Direction.INPUT
    flame_sensor.pull = digitalio.Pull.UP
    buzzer = pwmio.PWMOut(board.GP16, frequency=2000, duty_cycle=0)


def set_alarm(base, on):
    global alarm
    alarm = on
    buzzer.duty_cycle = 32768 if on else 0
    base.set_rgb("#EF4444" if on else "#FFFFFF", "ON")


def read(base):
    flame = 0 if flame_sensor.value else 1  # LOW = 불꽃 감지
    temp = base.temperature()
    if flame or (temp is not None and temp >= ALARM_TEMP):
        if not alarm:
            set_alarm(base, True)
    return {"flame": flame, "alarm_on": 1 if alarm else 0}


def handle(base, action, value):
    if action == "reset":
        set_alarm(base, False)
        return {"ok": True}
    return {"ok": False, "error": "unknown action: " + str(action)}
