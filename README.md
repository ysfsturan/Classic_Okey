# 🀄 Classic Okey (Klasik Türk Okeyi)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Web Audio API](https://img.shields.io/badge/Audio-Web_Audio_API-success)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

A beautifully crafted, authentic, web-based **Classic Turkish Okey** game featuring a realistic green felt table, 28-slot wooden Istaka rack, 3 intelligent AI opponents, smart auto-sort helpers, and synthesized tactile sound effects.

---

## 🌟 Key Features / Öne Çıkan Özellikler

- **🎨 Authentic Green Felt & Wooden Istaka Aesthetic:**
  - Classic green felt tabletop with mahogany wooden borders.
  - Realistic 2-tier wooden Istaka (rack) with 28 flexible tile slots.
  - 3D engraved melamine tiles in 4 vibrant colors (Yellow, Blue, Black, Red) + Fake Okeys (Sahte Okey).
  - Clear Okey crown badges and revealed Gösterge indicator.

- **🤖 3 Smart AI Opponents (Doğu, Kuzey, Batı):**
  - Heuristic-based decision engine evaluating discards and runs.
  - Bots strategically draw from discards or the draw pile and discard dead tiles.
  - Natural turn delays to follow the flow of the game seamlessly.

- **⚡ Istaka Helper Tools (Tek Tıkla Dizme):**
  - **Seri Diz:** Automatically groups runs by color and ascending numbers.
  - **Düz Diz:** Groups sets by matching numbers with distinct colors.
  - **Çift Diz:** Groups identical pairs together.
  - Click-and-swap or double-click to discard.

- **🔊 Pure Web Audio API Sound Synthesizer:**
  - Offline procedural sound effects for tile draws, clacks, Istaka sliding, and victory chimes.

- **🛡 Complete Okey Rules Engine:**
  - 106-tile complete set (2 sets of 4 colors x 13 + 2 Fake Okeys).
  - Accurate Gösterge & Okey calculation.
  - Standard 14-tile meld & 7-pair winning validator.
  - 15th tile discard finishing mechanic.

---

## 🚀 Getting Started / Nasıl Başlatılır?

### Option 1: Direct in Browser
Double-click [`index.html`](index.html) to play immediately in any web browser.

### Option 2: Local HTTP Server
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your browser.

---

## 📁 Project Structure

```
classic-okey/
├── index.html        # Table layout, seats & Istaka DOM
├── style.css         # Green felt, 3D tiles & animations
├── js/
│   ├── audio.js      # Web Audio API sound synthesizer
│   ├── engine.js     # 106-tile deck, melds & AI rules
│   ├── ui.js         # Istaka & table renderer
│   └── app.js        # Game loop & player event handlers
├── .gitignore        # Git ignore rules
├── LICENSE           # MIT License
└── README.md         # Documentation & guide
```

---

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).
