#!/usr/bin/env python3
"""제작 과정 영상에 한국어 AI 음성(내레이션)을 넣습니다.

대본: public/videos/개별프로젝트_제작과정.narration.json (문장마다 시작 시각 · 화면 자막 · 읽을 문장)
원본: public/videos/bus_stop_project_guide.mp4 (화면 자막만 있는 무음 영상, 469.4초)
결과: public/videos/bus_stop_project_guide.mp4 (음성 포함, 원본을 덮어씀) + .srt (새 시각)
  · 윈도우 노트북 호환: H.264 Main@4.0 + AAC, 장(챕터) 트랙 없음, 자막은 UTF-8 BOM + CRLF
  · 이미 음성을 넣은 영상에는 다시 실행하지 않습니다 (길이로 확인). 무음 원본은 git 기록에서 되살리세요:
      git log --oneline -- public/videos/bus_stop_project_guide.mp4

음성이 자막 구간보다 길면 그 구간의 마지막 화면을 잠깐 멈춰서 길이를 맞춥니다.

사용 예
  python3 scripts/narrate-video.py --engine google            # 환경변수 GOOGLE_TTS_API_KEY 필요
  python3 scripts/narrate-video.py --engine google --voice ko-KR-Neural2-C
  python scripts/narrate-video.py --engine edge                # 학교 PC: pip install edge-tts (무료)
  python3 scripts/narrate-video.py --dry-run                   # 문장 수 · 글자 수만 확인
  python3 scripts/narrate-video.py --engine test --out /tmp/x  # 무음 가짜 음성으로 전체 과정 점검

필요: Python 3.9+, ffmpeg (PATH 에 없으면 pip install imageio-ffmpeg 로 받은 것을 씀)
윈도우 학교 PC 준비 (한 번만):
  pip install edge-tts imageio-ffmpeg
  python scripts/narrate-video.py --engine edge
"""
import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEOS = ROOT / 'public' / 'videos'
NAME = '개별프로젝트_제작과정'          # 대본 파일 이름
OUT_NAME = 'bus_stop_project_guide'  # 영상 · 자막 파일 이름 (영문: USB · 압축 해제 때 깨지지 않게)
FPS = 30
RATE = 48000
GAP = 0.35          # 문장이 끝난 뒤 다음 문장까지 최소 쉼 (초)
LEAD = 0.15         # 구간 시작 후 음성이 나오기까지 (초)
DEFAULT_VOICE = {'google': 'ko-KR-Neural2-A', 'edge': 'ko-KR-SunHiNeural', 'test': 'test'}


def find_ffmpeg():
    # PATH → pip install imageio-ffmpeg → 윈도우 흔한 설치 위치 순서로 찾기 (ffprobe 는 쓰지 않음)
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    for d in (r'C:\ffmpeg\bin', os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\WinGet\Links'), r'C:\Program Files\ffmpeg\bin'):
        f = Path(d) / 'ffmpeg.exe'
        if f.exists():
            return str(f)
    sys.exit('ffmpeg 를 찾을 수 없습니다. 아래 중 하나를 한 뒤 다시 실행하세요.\n'
             '  1) 가장 쉬움:  pip install imageio-ffmpeg\n'
             '  2) 또는:      winget install --id Gyan.FFmpeg -e   (설치 후 터미널을 닫았다 다시 열기)')


FFMPEG = None  # main() 에서 find_ffmpeg() 로 정함


def run(cmd, **kw):
    if cmd and cmd[0] == 'ffmpeg':
        cmd = [FFMPEG] + cmd[1:]
    return subprocess.run(cmd, check=True, capture_output=True, **kw)


def probe_duration(f):
    # ffmpeg -i 의 'Duration: 00:07:49.37' 줄에서 길이 (ffmpeg 는 출력 파일이 없으면 오류로 끝나므로 check 없이)
    if not Path(f).exists():
        sys.exit(f'영상 파일이 없습니다: {f}')
    err = subprocess.run([FFMPEG, '-hide_banner', '-i', str(f)], capture_output=True).stderr.decode('utf-8', 'replace')
    m = re.search(r'Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)', err)
    if not m:
        sys.exit(f'영상 길이를 읽지 못했습니다: {f}\n{err[-400:]}')
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


# ── 음성 합성 ────────────────────────────────────────────────────────────
def tts_google(text, voice, speed, out_wav):
    key = os.environ.get('GOOGLE_TTS_API_KEY')
    if not key:
        sys.exit('환경변수 GOOGLE_TTS_API_KEY 가 없습니다. (Google Cloud 콘솔 → Text-to-Speech API 사용 설정 → API 키)')
    body = {
        'input': {'text': text},
        'voice': {'languageCode': 'ko-KR', 'name': voice},
        'audioConfig': {'audioEncoding': 'LINEAR16', 'sampleRateHertz': RATE, 'speakingRate': speed},
    }
    req = urllib.request.Request(
        'https://texttospeech.googleapis.com/v1/text:synthesize',
        data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': key})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            audio = base64.b64decode(json.loads(r.read())['audioContent'])
    except urllib.error.HTTPError as e:
        sys.exit(f'Google TTS 오류 {e.code}: {e.read().decode(errors="replace")[:400]}')
    tmp = out_wav.with_suffix('.raw.wav')
    tmp.write_bytes(audio)
    to_pcm(tmp, out_wav)
    tmp.unlink()


def tts_edge(text, voice, speed, out_wav):
    tmp = out_wav.with_suffix('.mp3')
    pct = f'{round((speed - 1) * 100):+d}%'
    exe = shutil.which('edge-tts')
    cmd = [exe] if exe else [sys.executable, '-m', 'edge_tts']
    try:
        run(cmd + ['--voice', voice, f'--rate={pct}', '--text', text, '--write-media', str(tmp)])
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        sys.exit(f'edge-tts 실행 실패 (pip install edge-tts, 인터넷 연결 확인): {e}')
    to_pcm(tmp, out_wav)
    tmp.unlink()


def tts_test(text, voice, speed, out_wav):
    # 점검용: 한국어 말하기 속도(초당 약 7.5 글자)에 맞춘 길이의 무음
    secs = max(0.8, len(text) / 7.5 / speed)
    write_silence(out_wav, secs)


ENGINES = {'google': tts_google, 'edge': tts_edge, 'test': tts_test}


def to_pcm(src, dst):
    # 앞뒤 무음을 조금 다듬고 48kHz 모노 16bit 로
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(src), '-af',
         'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
         '-ac', '1', '-ar', str(RATE), '-sample_fmt', 's16', str(dst)])


def write_silence(path, secs):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b'\x00\x00' * int(secs * RATE))


def wav_seconds(path):
    with wave.open(str(path), 'rb') as w:
        return w.getnframes() / w.getframerate()


# ── 메인 ────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--engine', choices=ENGINES, default='google')
    ap.add_argument('--voice', help='목소리 이름 (google: ko-KR-Neural2-A · B · C, ko-KR-Wavenet-A~D, ko-KR-Chirp3-HD-… / edge: ko-KR-SunHiNeural · InJoonNeural)')
    ap.add_argument('--speed', type=float, default=1.0, help='말하기 속도 (기본 1.0)')
    ap.add_argument('--source', default=str(VIDEOS / f'{OUT_NAME}.mp4'))
    ap.add_argument('--script', default=str(VIDEOS / f'{NAME}.narration.json'))
    ap.add_argument('--out', default=str(VIDEOS), help='결과 폴더 (기본: public/videos)')
    ap.add_argument('--cache', default=str(Path(tempfile.gettempdir()) / 'mdp-narration-cache'))
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    voice = a.voice or DEFAULT_VOICE[a.engine]
    global FFMPEG
    FFMPEG = find_ffmpeg()
    if a.engine == 'edge' and not a.dry_run and not shutil.which('edge-tts'):
        try:
            import edge_tts  # noqa: F401
        except ImportError:
            sys.exit('edge-tts 가 없습니다. pip install edge-tts 를 한 뒤 다시 실행하세요.')

    doc = json.loads(Path(a.script).read_text(encoding='utf-8'))
    lines = sorted(doc['lines'], key=lambda x: x['t'])
    src = Path(a.source)
    D = probe_duration(src)
    want = doc.get('source_duration')
    if want and abs(D - want) > 0.5:
        sys.exit(f'{src.name} 길이가 {D:.1f}초로, 대본이 만든 무음 원본({want:.1f}초)과 다릅니다. 이미 음성을 넣은 영상 같습니다.\n'
                 '무음 원본을 git 에서 되살린 뒤 다시 실행하세요: git log --oneline -- public/videos/bus_stop_project_guide.mp4')
    chars = sum(len(x['say']) for x in lines)
    print(f'ffmpeg: {FFMPEG}')
    print(f'원본 {src.name}: {D:.1f}초 · 문장 {len(lines)}개 · {chars}자 · {a.engine}/{voice} · 속도 {a.speed}')
    if a.dry_run:
        for x in lines:
            print(f"  {x['t']:7.2f}s  {x['say']}")
        return

    # 1) 문장마다 음성 (캐시)
    cache = Path(a.cache) / f'{a.engine}-{voice}-{a.speed}'
    cache.mkdir(parents=True, exist_ok=True)
    for i, x in enumerate(lines):
        h = hashlib.sha1(x['say'].encode()).hexdigest()[:16]
        f = cache / f'{h}.wav'
        if not f.exists():
            ENGINES[a.engine](x['say'], voice, a.speed, f)
        x['wav'] = f
        x['adur'] = wav_seconds(f)
        print(f'  음성 {i + 1}/{len(lines)} {x["adur"]:.1f}초  {x["say"][:30]}', flush=True)

    # 2) 구간 나누기 (프레임 단위) + 늘릴 길이
    fr = lambda t: int(round(t * FPS))
    total_frames = fr(D)
    bounds = [0] + [min(fr(x['t']), total_frames) for x in lines] + [total_frames]
    segs = []  # (시작 프레임, 프레임 수, 늘릴 프레임 수, 문장 또는 None)
    for k in range(len(bounds) - 1):
        s, e = bounds[k], bounds[k + 1]
        x = lines[k - 1] if k > 0 else None
        if e <= s:
            continue
        extra = 0
        if x is not None:
            need = LEAD + x['adur'] + GAP
            extra = max(0, fr(need) - (e - s))
        segs.append((s, e - s, extra, x))

    work = Path(tempfile.mkdtemp(prefix='narrate-'))
    try:
        # 3) 영상 구간 만들기 (모자라면 마지막 화면 멈춤)
        parts, new_start, t_new = [], {}, 0
        for i, (s, n, extra, x) in enumerate(segs):
            p = work / f'seg{i:03d}.mp4'
            # 프레임 n 개만 자른 뒤(trim) 모자란 만큼 마지막 화면을 복제(tpad)
            vf = f'fps={FPS},trim=end_frame={n},setpts=PTS-STARTPTS'
            if extra:
                vf += f',tpad=stop_mode=clone:stop={extra}'
            run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{s / FPS:.4f}', '-i', str(src),
                 '-vf', vf + ',format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', str(p)])
            parts.append(p)
            new_start[s] = t_new
            if x is not None:
                x['new_t'] = t_new / FPS
            t_new += n + extra
        total_new = t_new / FPS
        (work / 'list.txt').write_text(''.join(f"file '{p.as_posix()}'\n" for p in parts), encoding='utf-8')
        print(f'영상 길이 {D:.1f}초 → {total_new:.1f}초 (멈춘 화면 합계 {total_new - D:.1f}초)')

        def remap(t):
            f = fr(t)
            for s, n, extra, _ in segs:
                if s <= f < s + n:
                    return (new_start[s] + (f - s)) / FPS
            return total_new

        # 4) 음성 트랙 (모노 48kHz)
        track = work / 'voice.wav'
        with wave.open(str(track), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
            pos = 0
            for x in lines:
                start = int((x['new_t'] + LEAD) * RATE)
                if start > pos:
                    w.writeframes(b'\x00\x00' * (start - pos)); pos = start
                with wave.open(str(x['wav']), 'rb') as r:
                    data = r.readframes(r.getnframes())
                w.writeframes(data); pos += len(data) // 2
            end = int(total_new * RATE)
            if end > pos:
                w.writeframes(b'\x00\x00' * (end - pos))

        # 5) 합치기 — 윈도우 노트북 호환: H.264 Main@4.0 + AAC, 장(챕터) 트랙 없음
        out = Path(a.out)
        out.mkdir(parents=True, exist_ok=True)
        mp4 = out / f'{OUT_NAME}.mp4'
        tmp_mp4 = work / 'out.mp4'
        run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-i', str(track),
             '-map', '0:v', '-map', '1:a', '-map_chapters', '-1', '-map_metadata', '-1',
             '-c:v', 'libx264', '-profile:v', 'main', '-level:v', '4.0', '-refs', '3', '-maxrate', '3M', '-bufsize', '6M',
             '-preset', 'slow', '-crf', '26', '-g', '60', '-pix_fmt', 'yuv420p',
             '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '128k', '-ar', str(RATE),
             '-movflags', '+faststart', str(tmp_mp4)])
        shutil.move(str(tmp_mp4), mp4)

        # 6) 자막 (화면 자막 문장, 새 시각)
        ts = lambda t: f'{int(t // 3600):02d}:{int(t // 60 % 60):02d}:{int(t % 60):02d},{int(round(t * 1000)) % 1000:03d}'
        caps = [x for x in lines if 'end' in x]
        srt = []
        for n, x in enumerate(caps, 1):
            st = x['new_t']
            en = max(remap(x['end']), st + LEAD + x['adur'] + 0.2)
            if n < len(caps):
                en = min(en, caps[n]['new_t'] - 0.05)
            srt.append(f'{n}\n{ts(st)} --> {ts(en)}\n{x["cap"]}\n')
        # 한국어 윈도우 플레이어가 CP949 로 잘못 읽지 않게 UTF-8 BOM + CRLF
        (out / f'{OUT_NAME}.srt').write_text('\n'.join(srt) + '\n', encoding='utf-8-sig', newline='\r\n')
        size = mp4.stat().st_size / 1e6
        print(f'완료: {mp4} ({int(total_new // 60)}분 {total_new % 60:.0f}초, {size:.1f}MB) + {OUT_NAME}.srt')
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
