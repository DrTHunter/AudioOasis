import os
import subprocess
import json

VIDEO_DIR = os.path.join(os.path.dirname(__file__), "Video Files")
THUMB_DIR = os.path.join(os.path.dirname(__file__), "video_thumbs")
os.makedirs(THUMB_DIR, exist_ok=True)

generated = 0
skipped = 0
failed = 0

for filename in sorted(os.listdir(VIDEO_DIR)):
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ('.mp4', '.mov', '.avi', '.mkv', '.webm'):
        continue
    
    # Output filename: same name but .jpg
    thumb_name = os.path.splitext(filename)[0] + ".jpg"
    thumb_path = os.path.join(THUMB_DIR, thumb_name)
    
    if os.path.exists(thumb_path):
        skipped += 1
        continue
    
    video_path = os.path.join(VIDEO_DIR, filename)
    
    # Extract frame at 1 second, resize to max 320px wide, quality 85
    try:
        result = subprocess.run([
            "ffmpeg", "-y", "-ss", "1", "-i", video_path,
            "-vframes", "1", "-vf", "scale=320:-1",
            "-q:v", "5", thumb_path
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and os.path.exists(thumb_path):
            generated += 1
            print(f"  OK: {filename}")
        else:
            # Try at 0 seconds if 1s failed (very short videos)
            result2 = subprocess.run([
                "ffmpeg", "-y", "-ss", "0", "-i", video_path,
                "-vframes", "1", "-vf", "scale=320:-1",
                "-q:v", "5", thumb_path
            ], capture_output=True, text=True, timeout=30)
            if result2.returncode == 0 and os.path.exists(thumb_path):
                generated += 1
                print(f"  OK (0s): {filename}")
            else:
                failed += 1
                print(f"  FAIL: {filename} - {result.stderr[-200:]}")
    except Exception as e:
        failed += 1
        print(f"  ERROR: {filename} - {e}")

print(f"\nDone! Generated: {generated}, Skipped (exists): {skipped}, Failed: {failed}")
print(f"Thumbnails saved to: {THUMB_DIR}")
