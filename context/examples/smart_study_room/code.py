# code.py (팀 모듈) — 스마트 독서실 (집중 학습 도우미) · 기본 예제 (학생 역할 바이브 코딩 3차 결과)
# 이 공간의 Pico 2 W 펌웨어가 teams/<공간ID>.py 로 불러옵니다. (npm run firmware:bundle)
# 확장 장치: 아날로그 소음 센서 모듈 (GP27 / ADC1)
# 기본 장치(DHT11 · Cds · SG90 환기창 · RGB 집중 상태등)는 base 객체로만 사용합니다.
import board
import analogio
import time

ROOM_ID = "example_study_room"

GREEN = "#2F9E6E"   # 집중하기 좋음 (50dB 미만)
ORANGE = "#D9922E"  # 소음 주의 (50~60dB)
RED = "#D64545"     # 너무 시끄러움 (60dB 이상)
SKY = "#3A7BD5"     # 휴식 시간

BREAK_SECONDS = 10

# ── 소음 센서 보정값 (실제 모듈에 맞게 조절하세요) ──
# 짧은 시간 동안 여러 번 읽어 '가장 큰 값 - 가장 작은 값'(흔들림 폭)을 소리 크기로 봅니다.
NOISE_SAMPLES = 64      # 한 번 읽을 때 샘플 수 (짧아서 웹 서버를 멈추지 않음)
QUIET_SPAN = 500        # 아주 조용할 때의 흔들림 폭 → 30 dB
LOUD_SPAN = 30000       # 아주 시끄러울 때의 흔들림 폭 → 90 dB

mic = None
noise_avg = 40.0
break_until = 0.0
last_color = None
temp_zone = None        # "hot" (27℃ 이상) / "cool" (24℃ 이하) / None (아직 모름)


def setup(base):
    """부팅 시 1회: 확장 부품 초기화 (room.json pins 의 GP27 만 사용)"""
    global mic
    mic = analogio.AnalogIn(board.GP27)


def read_noise_db():
    lo = 65535
    hi = 0
    for _ in range(NOISE_SAMPLES):
        v = mic.value
        if v < lo:
            lo = v
        if v > hi:
            hi = v
    span = hi - lo
    ratio = (span - QUIET_SPAN) / (LOUD_SPAN - QUIET_SPAN)
    ratio = max(0.0, min(1.0, ratio))
    return 30 + ratio * 60


def noise_color(db):
    if db >= 60:
        return RED
    if db >= 50:
        return ORANGE
    return GREEN


def read(base):
    """/api/status 요청마다 (약 2초마다): 확장 센서 값 반환 + 자동 규칙 처리"""
    global noise_avg, last_color, temp_zone
    now = time.monotonic()

    # 소음 (값이 튀지 않게 이전 값과 섞어 부드럽게)
    noise_avg = noise_avg * 0.6 + read_noise_db() * 0.4
    noise = round(noise_avg, 1)
    on_break = now < break_until

    # 규칙 1 + 휴식: RGB 색은 바뀔 때만 설정
    if base.has("rgb"):
        color = SKY if on_break else noise_color(noise)
        if color != last_color:
            base.set_rgb(color, "ON")
            last_color = color

    # 규칙 2: 27℃ 이상이 되면 창 열기(90°), 24℃ 이하가 되면 닫기(0°) — 바뀌는 순간에만
    if base.has("dht11") and base.has("sg90"):
        t = base.temperature()
        if t is not None:
            zone = temp_zone
            if t >= 27:
                zone = "hot"
            elif t <= 24:
                zone = "cool"
            if zone != temp_zone:
                temp_zone = zone
                base.set_servo(90 if zone == "hot" else 0)

    return {"noise": noise, "break_on": 1 if on_break else 0}


def handle(base, action, value):
    """Scene.tsx sendCommand(action, value) → POST /api/command"""
    global break_until, last_color

    if action == "break":
        if value:
            break_until = time.monotonic() + BREAK_SECONDS
            if base.has("rgb"):
                base.set_rgb(SKY, "ON")
            last_color = SKY
            return {"ok": True, "break_on": 1}
        # 휴식 취소 → 다음 read() 에서 소음 규칙 색으로 돌아감
        break_until = 0.0
        last_color = None
        return {"ok": True, "break_on": 0}

    if action == "window":
        if not base.has("sg90"):
            return {"ok": False, "error": "SG90 not connected"}
        base.set_servo(90 if value else 0)
        return {"ok": True}

    return {"ok": False, "error": "unknown action: " + str(action)}
