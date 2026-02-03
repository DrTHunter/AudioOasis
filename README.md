AudioOasis

Free Studio-Quality Background Music for Work and Focus

AudioOasis is a clean, modern, browser-based music app designed for creators, students, and deep-work sessions. It streams high-quality WAV audio, organizes tracks into categories, and includes both a single-player mode and a multi-track mixer for custom ambient blends.

The entire app runs client-side and works with GitHub Pages, making it easy to host, modify, and extend.


---

Features

Core Experience

High-quality WAV audio playback

Simple, distraction-free interface

Categories for lofi, ambience, meditation, and more

Fully collapsible layout for clean navigation


Single Track Player

Play, pause, next, previous

Seek bar with live time tracking

Volume control

Loop and shuffle mode

Keyboard shortcuts (space, left/right arrows)


Playlist System

Add tracks from the library with one click

Drag to reorder playlist items

Remove individual tracks

Save and load named playlists

Edit saved playlists in place


Mixer Engine

Add multiple tracks and layer them

Individual volume sliders

Progress tracking for each layer

Looping enabled by default

Independent play/pause per layer

Visual feedback on interaction


UI/UX

Smooth animations and hover effects

Responsive design for desktop, tablet, and mobile

Custom-styled scrollbars

Clean gradients, soft shadows, and accessible color usage


Data Persistence

Saved playlists stored in localStorage

Restores user playlists across sessions

Graceful fallback when corrupted storage is detected


SEO + Metadata

Full Open Graph and Twitter card support

Google Analytics (optional)

Canonical link for GitHub Pages



---

Project Structure

AudioOasis/
│
├── index.html             # Main application file
├── trackList.js           # External track definitions loaded into the app
├── /assets                # Images, icons, thumbnails
├── /audio                 # Local or externally-hosted audio files
└── README.md              # Project documentation


---

How It Works

Track Library

Tracks are loaded from trackList.js in a structured format:

{
  "Lofi": [
    { title: "Warm Lights", src: "audio/lofi/warm-lights.wav", duration: "3:12" },
    ...
  ],
  "Ambience": [
    { title: "Rain Study Room", src: "audio/ambience/rain.wav", duration: "1:00:00" },
    ...
  ]
}

Playlists

Users create playlists dynamically

Tracks store metadata (title, src, category, duration)

Saved playlists are JSON-serialized into localStorage

Load / edit / delete playlist options included


Mixer

Each mixer track is stored as an object with:

audio element

volume

play/pause state

unique ID

duration (for display)


Mixer layers run independently but are displayed in a unified container.


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
