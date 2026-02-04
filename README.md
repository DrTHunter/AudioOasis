## 🎧 AudioOasis (Ongoing Project)

**Studio‑quality background music for deep work, calm vibes, and flow states.**  
No ads. No clutter. Just sound.

**AudioOasis** is a sleek, *client-side* music web app built for creators, coders, writers, students, and anyone who wants background music that doesn’t fight for attention. It’s designed around two modes:

- **Single Player** — simple listening  
- **Mixer Mode** — layer multiple tracks into your own custom atmosphere

> **Project status:** This is an **active, ongoing project**. Features, UI, track formats, and roadmap items are still evolving—expect regular iteration, cleanup, and upgrades as the app matures.

---

## ✨ Highlights

### 🎵 Single Player (Now Playing)
- Play / pause, next, previous  
- Seek bar with current time + duration  
- Volume control  
- Loop + shuffle  
- Keyboard shortcuts for speed and flow  

### 🧠 Playlist Engine
- Add tracks from the library into a queue  
- Drag to reorder  
- Remove tracks instantly  
- Clear playlist (with confirmation)  
- Displays track **category + duration**

### 🎚️ Mixer Mode (Layer Your World)
- Add multiple tracks at once and blend them  
- Individual play/pause toggles per layer  
- Per-track volume control  
- Per-track progress + seeking  
- Always-on looping for continuous atmosphere  
- Perfect for **lofi + rain + ambience** stacks  

### 💾 Saved Playlists
- Name + save playlists  
- Load saved playlists instantly  
- Edit existing playlists (updates live)  
- Delete saved playlists cleanly  
- Stored locally via **localStorage**

### 🧼 Clean UX
- Category cards expand/collapse  
- Hover controls for “Playlist” + “Mixer” add buttons  
- Responsive layout (mobile/tablet/desktop)  
- Modern styling: gradients, soft shadows, smooth animations  

### 🔍 SEO + Sharing Ready
- Open Graph + Twitter cards  
- Canonical URL for GitHub Pages  
- Optional Google Analytics included  

---

## 🧱 Tech Stack
- **HTML** (single-file app structure)
- **CSS** (modern variables, gradients, responsive layout)
- **Vanilla JavaScript** (no frameworks)
- **Font Awesome** icons
- `trackList.js` for external track library data
- **localStorage** for saved playlists

---

## 🗂️ Project Structure

```text
AudioOasis/
├── index.html          # Main UI + app logic
├── trackList.js        # Track library data (categories + tracks)
├── UI Picture.png      # Social sharing image
└── (audio files)       # Your audio assets or hosted track sources
```

---

## 🚀 Quick Start

### 1) Clone the repo
```bash
git clone https://github.com/DrTHunter/AudioOasis
cd AudioOasis
```

### 2) Run it
Open `index.html` in a browser.

If your audio files are local, make sure paths in `trackList.js` are correct.

### 3) Optional: Host on GitHub Pages
- Push to GitHub  
- Enable **GitHub Pages** (root directory)  
- Your site becomes instantly shareable  

---

## 🎼 Track Library Format (`trackList.js`)

AudioOasis loads tracks from `trackList.js` into a category grid.

**Example format:**
```js
const trackLibrary = {
  "Lofi": [
    { title: "Warm Lights", src: "audio/lofi/warm-lights.wav", duration: "3:12", category: "Lofi" }
  ],
  "Ambience": [
    { title: "Rain Room", src: "audio/ambience/rain-room.wav", duration: "15:00", category: "Ambience" }
  ]
};
```

Each track supports:
- `title`
- `src`
- `duration`
- `category` *(optional, but recommended)*

---

## 🎛️ How Mixer Mode Works

Each mixer track becomes its own `Audio()` instance, with independent state:
- play/pause  
- volume  
- progress  
- loop behavior  

This makes it easy to stack tracks like:
- Lofi beat + rainfall + soft synth pad  
- Meditation bowl + ambient drones  
- Cafe chatter + vinyl crackle + piano  

---

## ⌨️ Keyboard Shortcuts
- **Space:** play/pause  
- **Ctrl + Right Arrow:** next track  
- **Ctrl + Left Arrow:** previous track  

---

## 🧠 Saved Playlists

Playlists persist through browser refresh using:

```js
localStorage.setItem("audiooasis.savedPlaylists", JSON.stringify(savedPlaylists));
```

So when you come back later, AudioOasis remembers your sets.

---

## 🛡️ Notes and Limitations
- Saved playlists are **local to your device/browser**
- Mixer mode layers multiple audio streams — very large mixes may tax weaker devices
- Audio autoplay is restricted by browsers until user interaction

---

## 🌌 Why AudioOasis Exists

Most “background music” platforms are noisy in the wrong way: ads, algorithmic chaos, and UI clutter.

**AudioOasis is the opposite:** a clean workspace where sound supports focus instead of hijacking it.

---

## 🗺️ Roadmap (Future Upgrades)
- Waveform visualizer  
- Export/import playlists as JSON  
- Crossfade + fade-in/out  
- Sleep timer / auto-stop  
- “Focus mode” minimal fullscreen UI  
- Offline caching (service worker)

---

## 👤 Author
Built by **Trent Hunter**  
AudioOasis by **Orion AI**

---

## 📜 License
Choose your vibe:
- **MIT** (widely reusable)
- **CC BY-NC** (forks allowed, no commercial reselling)
- **Custom license** (protect branding)
