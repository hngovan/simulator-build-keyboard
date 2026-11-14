# Phần Python của `bun run gen:voice` (scripts/gen-voice.ts gọi): đọc danh sách câu, VieNeu-TTS đọc ra wav,
# ffmpeg cắt lặng 2 đầu + nén mp3 mono, ghi độ dài từng file (giây) ra file kết quả
import json
import os
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")
cfg = json.load(open(sys.argv[1], encoding="utf-8"))
todo = [j for j in cfg["jobs"] if not os.path.exists(os.path.join(cfg["out"], j["file"]))]


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True,
        text=True,
        check=True,
    )
    return round(float(out.stdout.strip()), 2)


if todo:
    from vieneu import Vieneu

    tts = Vieneu()
    for j in todo:
        audio = tts.infer(j["speak"], voice=j["voice"])
        wav = os.path.join(tempfile.gettempdir(), "sbk-voice.wav")
        tts.save(audio, wav)
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error", "-i", wav,
                # cắt lặng đầu / cuối (đảo 2 lần), chuẩn hoá độ to
                "-af",
                "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                "silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-1.5",
                "-ac", "1", "-ar", "44100", "-b:a", "80k",
                os.path.join(cfg["out"], j["file"]),
            ],
            check=True,
        )
        print("+", j["voice"], "|", j["speak"], flush=True)

durs = {}
for j in cfg["jobs"]:
    path = os.path.join(cfg["out"], j["file"])
    if os.path.exists(path):
        durs[j["file"]] = duration(path)
json.dump(durs, open(cfg["result"], "w", encoding="utf-8"))
