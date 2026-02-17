import json
import re

# Load the durations we extracted
with open("track_durations.json", "r", encoding="utf-8") as f:
    durations = json.load(f)

# Build a lookup: map the filename from the URL to the duration
# URLs look like: .../tracks/lofi/filename.opus?raw=true
# Our JSON keys look like: lofi/filename.opus
url_to_duration = {}
for rel_path, dur in durations.items():
    # Normalize: lowercase for matching
    url_to_duration[rel_path.lower()] = dur

# Read trackList.js
with open("trackList.js", "r", encoding="utf-8") as f:
    content = f.read()

# Pattern to match each track entry and extract the src URL and duration
# Match: src: "...tracks/RELATIVE_PATH?raw=true", ... duration: "X:XX"
pattern = re.compile(
    r'(src:\s*"https://media\.githubusercontent\.com/media/DrTHunter/AudioOasis/refs/heads/main/tracks/)([^"?]+)(\?raw=true"[^}]*?duration:\s*")([^"]*?)(")'
)

updated = 0
not_found = []

def replace_duration(match):
    global updated
    prefix = match.group(1)
    rel_path = match.group(2)
    middle = match.group(3)
    old_duration = match.group(4)
    suffix = match.group(5)
    
    # Try to find this path in our durations
    lookup = rel_path.lower()
    if lookup in url_to_duration:
        new_duration = url_to_duration[lookup]
        updated += 1
        return prefix + rel_path + middle + new_duration + suffix
    else:
        not_found.append(rel_path)
        return match.group(0)  # Leave unchanged

new_content = pattern.sub(replace_duration, content)

with open("trackList.js", "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Updated {updated} track durations.")
if not_found:
    print(f"Could not find durations for {len(not_found)} tracks:")
    for p in not_found:
        print(f"  - {p}")
