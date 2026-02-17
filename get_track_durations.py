import os
from mutagen import File
import json

def get_duration(filepath):
    try:
        audio = File(filepath)
        if audio is None or not hasattr(audio, 'info'):
            return None
        seconds = int(audio.info.length)
        minutes = seconds // 60
        seconds = seconds % 60
        return f"{minutes}:{seconds:02d}"
    except Exception as e:
        return None

def scan_tracks(base_dir):
    track_durations = {}
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.lower().endswith((".wav", ".mp3", ".flac", ".ogg", ".m4a")):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_dir).replace("\\", "/")
                duration = get_duration(full_path)
                if duration:
                    track_durations[rel_path] = duration
    return track_durations

if __name__ == "__main__":
    base_dir = os.path.join(os.path.dirname(__file__), "tracks")
    durations = scan_tracks(base_dir)
    with open("track_durations.json", "w", encoding="utf-8") as f:
        json.dump(durations, f, indent=2)
    print(f"Wrote durations for {len(durations)} tracks to track_durations.json")
