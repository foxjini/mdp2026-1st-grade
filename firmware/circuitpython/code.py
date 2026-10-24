# ==============================================================================
# CircuitPython 9.x/10.x Firmware for Raspberry Pi Pico 2 W
# 전시용 통합 펌웨어: 기본 4종(DHT11, Cds, SG90, RGB LED) + 팀 모듈 로더(teams/*.py)
#
# [CIRCUITPY 드라이브 구성]
#   code.py            ← 이 파일 (학생은 수정하지 않습니다)
#   settings.toml      ← Wi-Fi 정보
#   teams/<공간ID>.py  ← 각 팀이 업로드한 code.py (npm run firmware:bundle 로 자동 복사)
#   lib/               ← adafruit_httpserver, adafruit_motor, adafruit_dht
# ==============================================================================
import os
import sys
import time
import board
import analogio
import pwmio
import wifi
import socketpool
from adafruit_motor import servo
import adafruit_dht
from adafruit_httpserver import Server, Request, Response, JSONResponse, POST, GET, OPTIONS

print(">>> Pico 2 W 스마트홈 CircuitPython 펌웨어 시작...")

# ------------------------------------------------------------------------------
# 1. 하드웨어 핀 및 객체 초기화
# ------------------------------------------------------------------------------
# 1.1 DHT11 온습도 센서 (GP15)
dht = adafruit_dht.DHT11(board.GP15)

# 1.2 Cds 조도 센서 (GP26 / ADC0)
cds = analogio.AnalogIn(board.GP26)

# 1.3 SG90 서보모터 (GP16 / 50Hz PWM)
servo_pwm = pwmio.PWMOut(board.GP16, duty_cycle=2 ** 15, frequency=50)
my_servo = servo.Servo(servo_pwm, min_pulse=500, max_pulse=2400)
current_servo_angle = 0
my_servo.angle = current_servo_angle

# 1.4 RGB LED (GP18-Red, GP19-Green, GP20-Blue / PWM)
red_pwm = pwmio.PWMOut(board.GP18, frequency=1000)
green_pwm = pwmio.PWMOut(board.GP19, frequency=1000)
blue_pwm = pwmio.PWMOut(board.GP20, frequency=1000)

current_rgb_color = "#3B82F6"  # 기본 블루
current_rgb_state = "ON"

def apply_rgb(hex_code, state):
    global current_rgb_color, current_rgb_state
    current_rgb_color = hex_code
    current_rgb_state = state

    if state == "OFF":
        red_pwm.duty_cycle = 0
        green_pwm.duty_cycle = 0
        blue_pwm.duty_cycle = 0
        return

    # Hex to RGB 16-bit (0 ~ 65535)
    clean_hex = hex_code.lstrip("#")
    if len(clean_hex) == 6:
        r = int(clean_hex[0:2], 16) / 255.0
        g = int(clean_hex[2:4], 16) / 255.0
        b = int(clean_hex[4:6], 16) / 255.0
        red_pwm.duty_cycle = int(r * 65535)
        green_pwm.duty_cycle = int(g * 65535)
        blue_pwm.duty_cycle = int(b * 65535)

apply_rgb(current_rgb_color, current_rgb_state)


def set_servo(angle):
    global current_servo_angle
    angle = max(0, min(180, int(angle)))
    my_servo.angle = angle
    current_servo_angle = angle
    return angle


# 1.5 팀 모듈에 전달하는 기본 장치 접근 객체 (팀 모듈은 핀을 직접 다시 초기화하지 않습니다)
class Base:
    def temperature(self):
        try:
            return dht.temperature
        except RuntimeError:
            return None

    def humidity(self):
        try:
            return dht.humidity
        except RuntimeError:
            return None

    def light(self):
        return cds.value

    def servo_angle(self):
        return current_servo_angle

    def set_servo(self, angle):
        return set_servo(angle)

    def rgb(self):
        return (current_rgb_color, current_rgb_state)

    def set_rgb(self, hex_code, state="ON"):
        apply_rgb(hex_code, state)


base = Base()

# ------------------------------------------------------------------------------
# 1.6 팀 모듈 로드: /teams/*.py → setup(base), read(base), handle(base, action, value)
#     한 팀 모듈에서 오류가 나도 다른 팀과 기본 기능은 계속 동작합니다.
# ------------------------------------------------------------------------------
teams = {}         # 공간 ID → 모듈
team_errors = {}   # 공간 ID → 마지막 오류 메시지

try:
    team_files = sorted(os.listdir("/teams"))
    sys.path.append("/teams")
except OSError:
    team_files = []

for fname in team_files:
    if not fname.endswith(".py") or fname.startswith("_"):
        continue
    mod_name = fname[:-3]
    try:
        mod = __import__(mod_name)
        room_id = getattr(mod, "ROOM_ID", mod_name)
        if hasattr(mod, "setup"):
            mod.setup(base)
        teams[room_id] = mod
        print(f"[팀 모듈] {room_id} 로드 완료")
    except Exception as err:
        team_errors[mod_name] = str(err)
        print(f"[팀 모듈] {mod_name} 로드 실패: {err}")

# ------------------------------------------------------------------------------
# 2. Wi-Fi 연결 (settings.toml 참조)
# ------------------------------------------------------------------------------
ssid = os.getenv("CIRCUITPY_WIFI_SSID")
password = os.getenv("CIRCUITPY_WIFI_PASSWORD")

print(f"Wi-Fi 연결 시도 중: {ssid}...")
try:
    wifi.radio.connect(ssid, password)
    ip_addr = str(wifi.radio.ipv4_address)
    print(f"Wi-Fi 연결 성공! Pico 2 W IP: {ip_addr}")
except Exception as e:
    print(f"Wi-Fi 연결 실패: {e}. Standalone 모드로 대기합니다.")
    ip_addr = "0.0.0.0"

# ------------------------------------------------------------------------------
# 3. HTTP Server 및 REST API 라우트 (CORS 지원)
# ------------------------------------------------------------------------------
pool = socketpool.SocketPool(wifi.radio)
server = Server(pool, "/static", debug=True)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

@server.route("/api/status", [GET, OPTIONS])
def handle_status(request: Request):
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)

    temp_val = 24.0
    humi_val = 50.0
    try:
        temp_val = dht.temperature or 24.0
        humi_val = dht.humidity or 50.0
    except RuntimeError:
        pass  # DHT11 간헐적 읽기 지연 무시

    data = {
        "status": "online",
        "temperature": temp_val,
        "humidity": humi_val,
        "light_adc": cds.value,
        "servo_angle": current_servo_angle,
        "rgb_color": current_rgb_color,
        "rgb_state": current_rgb_state,
        "ip": ip_addr,
    }

    # 팀 확장 센서 값: rooms = {공간ID: {...}}, custom = 전체 병합
    rooms = {}
    custom = {}
    for room_id, mod in teams.items():
        if not hasattr(mod, "read"):
            continue
        try:
            values = mod.read(base)
            if isinstance(values, dict):
                rooms[room_id] = values
                custom.update(values)
        except Exception as err:
            team_errors[room_id] = str(err)
    data["rooms"] = rooms
    data["custom"] = custom
    data["team_errors"] = team_errors
    return JSONResponse(request, data, headers=CORS_HEADERS)

@server.route("/api/servo", [POST, OPTIONS])
def handle_servo(request: Request):
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)

    try:
        body = request.json()
        angle = set_servo(body.get("angle", 0))
        return JSONResponse(request, {"success": True, "servo_angle": angle}, headers=CORS_HEADERS)
    except Exception as err:
        return JSONResponse(request, {"success": False, "error": str(err)}, headers=CORS_HEADERS)

@server.route("/api/rgb", [POST, OPTIONS])
def handle_rgb(request: Request):
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)

    try:
        body = request.json()
        color = body.get("color", current_rgb_color)
        state = body.get("state", current_rgb_state)
        apply_rgb(color, state)
        return JSONResponse(request, {"success": True, "color": color, "state": state}, headers=CORS_HEADERS)
    except Exception as err:
        return JSONResponse(request, {"success": False, "error": str(err)}, headers=CORS_HEADERS)

@server.route("/api/command", [POST, OPTIONS])
def handle_command(request: Request):
    """3D 화면 sendCommand(action, value) → 해당 팀 모듈 handle(base, action, value)"""
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)

    try:
        body = request.json()
        room_id = body.get("room", "")
        mod = teams.get(room_id)
        if mod is None or not hasattr(mod, "handle"):
            return JSONResponse(request, {"success": False, "error": "팀 모듈 없음: " + str(room_id)}, headers=CORS_HEADERS)
        result = mod.handle(base, body.get("action", ""), body.get("value"))
        ok = not (isinstance(result, dict) and result.get("ok") is False)
        return JSONResponse(request, {"success": ok, "result": result}, headers=CORS_HEADERS)
    except Exception as err:
        return JSONResponse(request, {"success": False, "error": str(err)}, headers=CORS_HEADERS)

@server.route("/api/teams", [GET, OPTIONS])
def handle_teams(request: Request):
    """로드된 팀 모듈 목록과 오류 (전시 전 점검용)"""
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)
    return JSONResponse(request, {"loaded": list(teams.keys()), "errors": team_errors}, headers=CORS_HEADERS)

# ------------------------------------------------------------------------------
# 4. 서버 시작 및 메인 루프
# ------------------------------------------------------------------------------
server.start(str(wifi.radio.ipv4_address), port=80)
print(f"HTTP Server 실행 중: http://{wifi.radio.ipv4_address}")

while True:
    try:
        server.poll()
    except Exception as err:
        print(f"Server poll error: {err}")
    time.sleep(0.01)
