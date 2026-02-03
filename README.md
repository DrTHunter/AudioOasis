🎧 AudioOasis

Studio-quality background music for deep work, calm vibes, and flow states.
No ads. No clutter. Just sound.

AudioOasis is a sleek, client-side music web app built for creators, coders, writers, students, and anyone who wants background music that doesn’t fight for attention. It’s designed around two modes:

Single Player for simple listening

Mixer Mode for layering tracks into your own custom atmosphere


Hosted easily on GitHub Pages, runs entirely in the browser, and saves your playlists locally.


---

✨ Highlights

🎵 Single Player (Now Playing)

Play/pause, next, previous

Seek bar with current time and duration

Volume control

Loop and shuffle

Keyboard shortcuts for speed and flow


🧠 Playlist Engine

Add tracks from the library into a queue

Drag to reorder

Remove tracks instantly

Clear playlist with confirmation

Displays track category + duration


🎚️ Mixer Mode (Layer Your World)

Add multiple tracks at once and blend them

Individual play/pause toggles per layer

Per-track volume control

Per-track progress and seeking

Always-on looping for continuous atmosphere

Perfect for lofi + rain + ambience stacks


💾 Saved Playlists

Name and save playlists

Load saved playlists instantly

Edit existing playlists (and update them live)

Delete saved playlists cleanly

All saved locally using localStorage


🧼 Clean UX

Category cards that expand/collapse

Hover controls for “Playlist” and “Mixer” add buttons

Responsive layout for mobile/tablet/desktop

Modern styling with gradients, soft shadows, and smooth animations


🔍 SEO + Sharing Ready

Open Graph + Twitter cards

Canonical URL for GitHub Pages

Optional Google Analytics included



---

🧱 Tech Stack

HTML (single-file app structure)

CSS (modern variables, gradients, responsive layout)

Vanilla JavaScript (no frameworks)

Font Awesome icons

trackList.js for external track library data

localStorage for saved playlists



---

🗂️ Project Structure

AudioOasis/
├── index.html          # Main UI + app logic
├── trackList.js        # Track library data (categories + tracks)
├── UI Picture.png      # Social sharing image
└── (audio files)       # Your audio assets or hosted track sources


---

🚀 Quick Start

1) Clone the repo

git clone https://github.com/DrTHunter/AudioOasis
cd AudioOasis

2) Run it

Open index.html in a browser.

If your audio files are local, make sure paths in trackList.js are correct.

3) Optional: Host on GitHub Pages

Push to GitHub

Enable GitHub Pages (root directory)

Your site becomes instantly shareable



---

🎼 Track Library Format (trackList.js)

AudioOasis loads tracks from trackList.js into a category grid.

Example format:

const trackLibrary = {
  "Lofi": [
    { title: "Warm Lights", src: "audio/lofi/warm-lights.wav", duration: "3:12", category: "Lofi" }
  ],
  "Ambience": [
    { title: "Rain Room", src: "audio/ambience/rain-room.wav", duration: "15:00", category: "Ambience" }
  ]
};

Each track supports:

title

src

duration

category (optional but recommended)



---

🎛️ How Mixer Mode Works

Each mixer track becomes its own Audio() instance, with independent state:

play/pause

volume

progress

loop behavior


This makes it easy to stack tracks like:

Lofi beat + rainfall + soft synth pad

Meditation bowl + ambient drones

Cafe chatter + vinyl crackle + piano



---

⌨️ Keyboard Shortcuts

Space: play/pause

Ctrl + Right Arrow: next track

Ctrl + Left Arrow: previous track



---

🧠 Saved Playlists

Saved playlists persist through browser refresh using:

localStorage.setItem("audiooasis.savedPlaylists", JSON.stringify(savedPlaylists));

So when you come back later, AudioOasis remembers your sets.


---

🛡️ Notes and Limitations

Saved playlists are local to your device/browser

Mixer mode layers multiple audio streams, so very large mixes may tax weaker devices

Audio autoplay is restricted by browsers until user interaction



---

🌌 Why AudioOasis Exists

Most “background music” platforms are noisy in the wrong way: ads, algorithmic chaos, and UI clutter.

AudioOasis is the opposite: a clean workspace, where sound supports focus instead of hijacking it.


---

🗺️ Roadmap (Optional Future Upgrades)

If you ever want to level this up:

waveform visualizer

export/import playlists as JSON

crossfade + fade-in/out

sleep timer / auto-stop

“focus mode” minimal fullscreen UI

offline caching (service worker)



---

👤 Author

Built by Trent Hunter
AudioOasis by Orion AI


---

📜 License

Choose your vibe:

MIT if you want it widely reusable

CC BY-NC if you want forks but no commercial reselling

Custom license if you want to protect branding


If you tell me what you want (open-source vs protected), I’ll generate the exact license file.


---

If you want, I can also format this into a perfect GitHub README layout with badges, a screenshot section, and a “Live Demo” block using your GitHub Pages URL.


---

🎼 Track Library Format (trackList.js)

AudioOasis loads tracks from trackList.js into a category grid.

Example format:

const trackLibrary = {
  "Lofi": [
    { title: "Warm Lights", src: "audio/lofi/warm-lights.wav", duration: "3:12", category: "Lofi" }
  ],
  "Ambience": [
    { title: "Rain Room", src: "audio/ambience/rain-room.wav", duration: "15:00", category: "Ambience" }
  ]
};

Each track supports:

title

src

duration

category (optional but recommended)



---

🎛️ How Mixer Mode Works

Each mixer track becomes its own Audio() instance, with independent state:

play/pause

volume

progress

loop behavior


This makes it easy to stack tracks like:

Lofi beat + rainfall + soft synth pad

Meditation bowl + ambient drones

Cafe chatter + vinyl crackle + piano



---

⌨️ Keyboard Shortcuts

Space: play/pause

Ctrl + Right Arrow: next track

Ctrl + Left Arrow: previous track



---

🧠 Saved Playlists

Saved playlists persist through browser refresh using:

localStorage.setItem("audiooasis.savedPlaylists", JSON.stringify(savedPlaylists));

So when you come back later, AudioOasis remembers your sets.


---

🛡️ Notes and Limitations

Saved playlists are local to your device/browser

Mixer mode layers multiple audio streams, so very large mixes may tax weaker devices

Audio autoplay is restricted by browsers until user interaction



---

🌌 Why AudioOasis Exists

Most “background music” platforms are noisy in the wrong way: ads, algorithmic chaos, and UI clutter.

AudioOasis is the opposite: a clean workspace, where sound supports focus instead of hijacking it.


---

🗺️ Roadmap (Optional Future Upgrades)

If you ever want to level this up:

waveform visualizer

export/import playlists as JSON

crossfade + fade-in/out

sleep timer / auto-stop

“focus mode” minimal fullscreen UI

offline caching (service worker)



---

👤 Author

Built by Trent Hunter
AudioOasis by Orion AI


---

📜 License

Choose your vibe:

MIT if you want it widely reusable

CC BY-NC if you want forks but no commercial reselling

Custom license if you want to protect branding


If you tell me what you want (open-source vs protected), I’ll generate the exact license file.


---

If you want, I can also format this into a perfect GitHub README layout with badges, a screenshot section, and a “Live Demo” block using your GitHub Pages URL.

---

Installation

1. Clone or download the repository

git clone https://github.com/DrTHunter/AudioOasis

2. Open in browser

Since it is a static site, simply open index.html.

3. (Optional) Host on GitHub Pages

Push to a GitHub repo and enable Pages with the root folder.
This project is already optimized for Pages.


---

Configuration

You can adjust color themes, gradients, shadows, and UI transitions in the :root CSS variables inside index.html.

Key modifiable variables include:

--primary
--primary-dark
--accent
--mixer-accent
--border-radius
--shadow

Audio categories and metadata are controlled entirely through trackList.js.


---

Why This App Exists

AudioOasis was built to create a clean, ad-free alternative to YouTube and Spotify background music.

No clutter. No algorithm. Just clean sound for deep work.


---

Roadmap Ideas

These are optional directions you might take the project next:

Add waveform visualization

Export/import playlists as JSON files

Add timer-based auto-stop

Add fade-in / fade-out transitions

Add local audio upload for users

Add “focus mode” with full-screen minimal UI



---

Credits

Created by Trent Hunter — Orion Forge
Free for personal use.

If you fork it, improve it, or remix it, credit is appreciated.
