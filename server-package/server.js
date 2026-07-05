const express = require('express');
const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 9274;
const smtc = new SMTCMonitor();

// Track last state to detect changes
let lastMediaJson = '{}';
let activeClients = [];

// CSS styles for 41 themes
const THEME_STYLES = {
  glassmorphism: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:rgba(15,15,20,0.85); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; box-shadow:0 10px 40px rgba(0,0,0,0.5),inset 0 1px 1px rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.05); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; box-shadow:0 4px 15px rgba(0,0,0,0.6); background:#111; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; animation:spin 6s linear infinite; transition:opacity 0.4s ease; }
    img.paused { animation-play-state:paused; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; letter-spacing:0.3px; margin-bottom:2px; text-shadow:0 2px 4px rgba(0,0,0,0.5); }
    .artist { opacity:0.8; font-size:14px; font-weight:400; margin-bottom:10px; text-shadow:0 1px 3px rgba(0,0,0,0.5); }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.7; font-family:'Outfit',monospace; font-weight:600; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.15); border-radius:999px; overflow:hidden; box-shadow:inset 0 1px 2px rgba(0,0,0,0.2); }
    .progress { height:100%; background:linear-gradient(90deg,#1db954,#1ed760); width:0%; transition:width 0.1s linear; box-shadow:0 0 8px rgba(29,185,84,0.6); }
    @keyframes spin { 100% { transform:rotate(360deg); } }
    .typing-caret::after { content:'\\258B'; display:inline-block; margin-left:2px; animation:blink 0.6s step-end infinite; color:#1db954; }
    .typing-done::after { display:none; }
    @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
  `,
  flat_dark: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#121212; color:#fff; display:flex; padding:16px; border-radius:0px; align-items:center; gap:16px; border:2px solid #282828; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:0px; background:#111; border:1px solid #333; }
    img { width:100%; height:100%; border-radius:0px; object-fit:cover; transition:opacity 0.4s ease; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; letter-spacing:0.3px; margin-bottom:2px; }
    .artist { opacity:0.7; font-size:14px; font-weight:400; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.7; font-family:'Outfit',monospace; font-weight:600; min-width:35px; text-align:center; }
    .bar { flex:1; height:4px; background:#333; overflow:hidden; }
    .progress { height:100%; background:#1db954; width:0%; transition:width 0.1s linear; }
    .typing-caret::after { content:'\\258B'; display:inline-block; margin-left:2px; animation:blink 0.6s step-end infinite; color:#1db954; }
    .typing-done::after { display:none; }
    @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
  `,
  neon: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#050508; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; box-shadow:0 0 25px rgba(29,185,84,0.6),inset 0 0 10px rgba(29,185,84,0.3); border:2px solid #1db954; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:12px; box-shadow:0 0 8px rgba(29,185,84,0.5); background:#111; }
    img { width:100%; height:100%; border-radius:12px; object-fit:cover; transition:opacity 0.4s ease; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; color:#00ff66; text-shadow:0 0 8px rgba(0,255,102,0.8); margin-bottom:2px; }
    .artist { opacity:0.9; font-size:14px; font-weight:400; margin-bottom:10px; color:#00ffff; text-shadow:0 0 5px rgba(0,255,255,0.6); }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#00ffff; font-family:'Outfit',monospace; font-weight:600; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:rgba(0,255,255,0.1); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#00ff66,#00ffff); width:0%; transition:width 0.1s linear; box-shadow:0 0 12px #00ff66; }
    .typing-caret::after { content:'\\258B'; display:inline-block; margin-left:2px; animation:blink 0.6s step-end infinite; color:#00ff66; }
    .typing-done::after { display:none; }
    @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
  `,
  compact: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:320px; min-height:80px; background:rgba(20,20,25,0.9); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); color:#fff; display:flex; padding:10px 14px; border-radius:40px; align-items:center; gap:12px; box-shadow:0 8px 30px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.08); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:48px; height:48px; flex-shrink:0; border-radius:50%; background:#111; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; animation:spin 8s linear infinite; }
    img.paused { animation-play-state:paused; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:15px; font-weight:700; margin-bottom:1px; }
    .artist { opacity:0.8; font-size:12px; font-weight:400; margin-bottom:2px; }
    .progress-container { display:none; }
    @keyframes spin { 100% { transform:rotate(360deg); } }
  `,
  retro: `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Courier New',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000; color:#ffff00; display:flex; padding:16px; border:4px double #ffff00; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:3px solid #ff00ff; background:#111; }
    img { width:100%; height:100%; object-fit:cover; image-rendering:pixelated; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; margin-left:8px; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:18px; font-weight:900; margin-bottom:2px; text-transform:uppercase; color:#ff00ff; }
    .artist { font-size:13px; font-weight:bold; margin-bottom:10px; text-transform:uppercase; color:#00ffff; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:11px; font-weight:bold; min-width:35px; text-align:center; color:#00ffff; }
    .bar { flex:1; height:10px; background:#222; border:2px solid #ffff00; }
    .progress { height:100%; background:#ff00ff; width:0%; transition:width 0.1s linear; }
    .typing-caret::after { content:'_'; display:inline-block; margin-left:2px; animation:blink 0.6s step-end infinite; color:#ffff00; }
    .typing-done::after { display:none; }
    @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
  `,
  synthwave: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:linear-gradient(135deg,#2b0b3f,#0c0827); border:2px solid #ff007f; color:#fff; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; box-shadow:0 0 20px #ff007f,inset 0 0 5px #00ffff; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:8px; border:2px solid #00ffff; background:#111; }
    img { width:100%; height:100%; border-radius:6px; object-fit:cover; transition:opacity 0.4s ease; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; color:#00ffff; text-shadow:0 0 5px #00ffff; margin-bottom:2px; }
    .artist { font-size:14px; font-weight:400; color:#ff007f; text-shadow:0 0 3px #ff007f; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#00ffff; font-family:'Outfit',monospace; font-weight:600; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:rgba(0,255,255,0.1); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff007f,#00ffff); width:0%; transition:width 0.1s linear; box-shadow:0 0 8px #ff007f; }
  `,
  glass_light: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:rgba(255,255,255,0.75); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); color:#111; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; box-shadow:0 10px 40px rgba(0,0,0,0.1),inset 0 1px 1px rgba(255,255,255,0.6); border:1px solid rgba(0,0,0,0.05); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; box-shadow:0 4px 12px rgba(0,0,0,0.15); background:#eee; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; animation:spin 6s linear infinite; transition:opacity 0.4s ease; }
    img.paused { animation-play-state:paused; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; letter-spacing:0.3px; margin-bottom:2px; color:#111; }
    .artist { opacity:0.8; font-size:14px; font-weight:400; margin-bottom:10px; color:#444; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.7; font-family:'Outfit',monospace; font-weight:600; min-width:35px; text-align:center; color:#222; }
    .bar { flex:1; height:6px; background:rgba(0,0,0,0.1); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#1db954; width:0%; transition:width 0.1s linear; }
    @keyframes spin { 100% { transform:rotate(360deg); } }
  `,
  spotify_green: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#1db954; color:#fff; display:flex; padding:16px; border-radius:20px; align-items:center; gap:16px; box-shadow:0 8px 30px rgba(29,185,84,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#111; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; animation:spin 6s linear infinite; }
    img.paused { animation-play-state:paused; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; margin-bottom:2px; }
    .artist { color:#e0e0e0; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.9; font-family:'Outfit',monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.3); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
    @keyframes spin { 100% { transform:rotate(360deg); } }
  `,
  amoled: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000000; color:#fff; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:1px solid #1db954; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:6px; background:#111; }
    img { width:100%; height:100%; border-radius:6px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; margin-bottom:2px; }
    .artist { opacity:0.8; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.8; font-family:'Outfit',monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:4px; background:#222; overflow:hidden; }
    .progress { height:100%; background:#1db954; width:0%; transition:width 0.1s linear; }
  `,
  kawaii: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#fff0f5; color:#ff69b4; display:flex; padding:16px; border-radius:30px; align-items:center; gap:16px; border:3px solid #ffb6c1; box-shadow:0 6px 20px rgba(255,182,193,0.4); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; border:2px solid #ffb6c1; background:#111; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; animation:spin 6s linear infinite; }
    img.paused { animation-play-state:paused; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; color:#ff1493; }
    .artist { color:#db7093; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ff69b4; font-family:'Outfit',monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:#ffe4e1; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ff69b4; width:0%; transition:width 0.1s linear; }
    @keyframes spin { 100% { transform:rotate(360deg); } }
  `,
  brutalism: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#ffe600; color:#000; display:flex; padding:16px; border:4px solid #000; box-shadow:8px 8px 0px #000; border-radius:0px; align-items:center; gap:16px; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:3px solid #000; border-radius:0px; background:#111; }
    img { width:100%; height:100%; border-radius:0px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:900; color:#000; text-transform:uppercase; margin-bottom:2px; }
    .artist { color:#000; font-weight:700; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-weight:900; font-family:monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:12px; background:#fff; border:3px solid #000; overflow:hidden; }
    .progress { height:100%; background:#ff007f; width:0%; transition:width 0.1s linear; }
  `,
  monochrome: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#1c1c1c; color:#ffffff; border:1px solid #333333; border-radius:4px; display:flex; padding:16px; align-items:center; gap:16px; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:2px; background:#111; }
    img { width:100%; height:100%; border-radius:2px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:600; margin-bottom:2px; }
    .artist { color:#aaaaaa; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.8; font-family:monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:4px; background:#333; overflow:hidden; }
    .progress { height:100%; background:#ffffff; width:0%; transition:width 0.1s linear; }
  `,
  cyberpunk_yellow: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#fcee0a; color:#000; display:flex; padding:16px; border:3px solid #000; border-radius:0px; clip-path:polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%); align-items:center; gap:16px; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #000; border-radius:0px; background:#111; }
    img { width:100%; height:100%; border-radius:0px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:900; color:#000; margin-bottom:2px; }
    .artist { color:#02d7f2; background:#000; padding:2px 6px; display:inline-block; font-size:13px; font-weight:700; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-weight:900; font-family:monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:8px; background:#000; overflow:hidden; }
    .progress { height:100%; background:#02d7f2; width:0%; transition:width 0.1s linear; }
  `,
  aurora: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:linear-gradient(135deg,#0575e6,#00f260); color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; box-shadow:0 10px 30px rgba(0,242,96,0.4); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:rgba(255,255,255,0.2); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; animation:spin 6s linear infinite; }
    img.paused { animation-play-state:paused; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; margin-bottom:2px; }
    .artist { color:#e0f2f1; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.9; font-family:'Outfit',monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.2); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
    @keyframes spin { 100% { transform:rotate(360deg); } }
  `,
  futuristic: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:rgba(10,25,47,0.85); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); color:#64ffda; display:flex; padding:16px; border:1px solid #64ffda; border-radius:4px; align-items:center; gap:16px; box-shadow:0 0 20px rgba(100,255,218,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:1px solid #64ffda; background:#111; }
    img { width:100%; height:100%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; color:#ccd6f6; margin-bottom:2px; }
    .artist { color:#8892b0; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#64ffda; font-family:monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:4px; background:#233554; overflow:hidden; }
    .progress { height:100%; background:#64ffda; width:0%; transition:width 0.1s linear; }
  `,
  minimal_art: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:420px; min-height:120px; background:#1a1a1a; color:#fff; display:flex; padding:0px; border-radius:16px; align-items:stretch; gap:0px; box-shadow:0 8px 25px rgba(0,0,0,0.4); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:120px; height:120px; flex-shrink:0; border-radius:16px 0 0 16px; background:#111; }
    img { width:100%; height:100%; border-radius:16px 0 0 16px; object-fit:cover; }
    .info { flex:1; padding:16px; display:flex; flex-direction:column; justify-content:center; overflow:hidden; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:18px; font-weight:700; margin-bottom:2px; }
    .artist { opacity:0.7; font-size:13px; margin-bottom:12px; }
    .progress-container { display:flex; align-items:center; gap:8px; }
    .time { font-size:11px; opacity:0.6; min-width:30px; text-align:center; }
    .bar { flex:1; height:3px; background:rgba(255,255,255,0.1); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#1db954; width:0%; transition:width 0.1s linear; }
  `,
  woodland: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#2d4a22; color:#f5f5dc; display:flex; padding:16px; border-radius:25px; border:2px solid #8b5a2b; align-items:center; gap:16px; box-shadow:0 8px 25px rgba(45,74,34,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#111; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; color:#fff8dc; margin-bottom:2px; }
    .artist { color:#d2b48c; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.8; font-family:'Outfit',monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:#1e3514; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#deb887; width:0%; transition:width 0.1s linear; }
  `,
  crimson: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#110000; color:#ff3333; display:flex; padding:16px; border:1px solid #770000; border-radius:8px; align-items:center; gap:16px; box-shadow:0 0 20px rgba(255,51,51,0.4); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; background:#111; }
    img { width:100%; height:100%; border-radius:4px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; color:#ff3333; text-shadow:0 0 4px #ff3333; margin-bottom:2px; }
    .artist { color:#884444; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.8; font-family:monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:#330000; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ff3333; width:0%; transition:width 0.1s linear; }
  `,
  sunset: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:linear-gradient(135deg,#f12711,#f5af19); color:#fff; display:flex; padding:16px; border-radius:20px; align-items:center; gap:16px; box-shadow:0 8px 30px rgba(241,39,17,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:rgba(0,0,0,0.1); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; text-shadow:0 2px 4px rgba(0,0,0,0.2); margin-bottom:2px; }
    .artist { color:#ffeb3b; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-family:'Outfit',monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.25); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
  `,
  gold_luxury: `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,400&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Playfair Display',serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000; color:#d4af37; display:flex; padding:16px; border:2px solid #d4af37; border-radius:0px; align-items:center; gap:16px; box-shadow:0 4px 20px rgba(212,175,55,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:1px solid #d4af37; border-radius:0px; background:#111; }
    img { width:100%; height:100%; border-radius:0px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:800; color:#fff; letter-spacing:1px; margin-bottom:2px; }
    .artist { color:#d4af37; font-style:italic; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-family:serif; min-width:35px; text-align:center; }
    .bar { flex:1; height:4px; background:#222; overflow:hidden; }
    .progress { height:100%; background:#d4af37; width:0%; transition:width 0.1s linear; }
  `,
  bubblegum: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#ffc0cb; color:#000; display:flex; padding:16px; border:3px solid #87cefa; border-radius:24px; align-items:center; gap:16px; box-shadow:0 6px 20px rgba(135,206,250,0.5); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#111; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container,.artist-container { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .title { font-size:19px; font-weight:700; color:#ff69b4; margin-bottom:2px; }
    .artist { color:#4682b4; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#4682b4; font-family:'Outfit',monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:#fff; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#87cefa; width:0%; transition:width 0.1s linear; }
  `,
  vinyl: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:115px; background:#18181c; color:#fff; display:flex; padding:16px; border-radius:16px; border:2px solid #2a2a30; align-items:center; gap:20px; box-shadow:0 12px 35px rgba(0,0,0,0.6); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:82px; height:82px; flex-shrink:0; border-radius:50%; background:repeating-radial-gradient(circle, #000, #000 3px, #1c1c1c 4px, #000 6px); position:relative; box-shadow:0 4px 15px rgba(0,0,0,0.8); border:2px solid #444; }
    img { width:46px; height:46px; border-radius:50%; object-fit:cover; position:absolute; top:18px; left:18px; animation:spin 5s linear infinite; }
    img.paused { animation-play-state:paused; }
    .art-container::after { content:''; display:block; width:8px; height:8px; background:#18181c; border-radius:50%; position:absolute; top:37px; left:37px; border:1px solid #888; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:800; color:#d4af37; margin-bottom:2px; }
    .artist { opacity:0.8; font-size:13px; margin-bottom:8px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.8; font-family:monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:4px; background:#333; overflow:hidden; }
    .progress { height:100%; background:#d4af37; width:0%; transition:width 0.1s linear; }
    @keyframes spin { 100% { transform:rotate(360deg); } }
  `,
  polaroid: `
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Caveat',cursive; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:420px; min-height:130px; background:#fff; color:#000; display:flex; padding:12px 12px 24px 12px; border-radius:0px; border:1px solid #ddd; align-items:center; gap:16px; box-shadow:3px 8px 20px rgba(0,0,0,0.15); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:rotate(-1deg) scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:rotate(2deg) scale(0.9); }
    .art-container { width:86px; height:86px; flex-shrink:0; border-radius:0px; border:1px solid #eee; background:#111; }
    img { width:100%; height:100%; border-radius:0px; object-fit:cover; filter:sepia(0.2) contrast(0.9); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:24px; font-weight:700; margin-bottom:1px; line-height:1.1; }
    .artist { font-size:18px; color:#555; margin-bottom:8px; }
    .progress-container { display:flex; align-items:center; gap:8px; }
    .time { font-size:15px; color:#444; min-width:30px; text-align:center; }
    .bar { flex:1; height:3px; background:#e0e0e0; }
    .progress { height:100%; background:#ff4757; width:0%; transition:width 0.1s linear; }
  `,
  comic_strip: `
    @import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Bangers',cursive; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:115px; background:#ff4757; color:#fff; display:flex; padding:14px; border:4px solid #000; align-items:center; gap:16px; box-shadow:8px 8px 0px #000; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:skew(-3deg) scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:skew(0) scale(0.95); }
    .art-container { width:76px; height:76px; flex-shrink:0; border:3px solid #000; background:#000; transform:rotate(-4deg); }
    img { width:100%; height:100%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:24px; color:#ffff00; -webkit-text-stroke:1px #000; text-shadow:2px 2px 0px #000; letter-spacing:1px; margin-bottom:2px; }
    .artist { font-size:16px; color:#fff; -webkit-text-stroke:0.5px #000; text-shadow:1px 1px 0px #000; margin-bottom:8px; }
    .progress-container { display:flex; align-items:center; gap:10px; }
    .time { font-size:14px; color:#ffff00; -webkit-text-stroke:0.5px #000; text-shadow:1px 1px 0px #000; min-width:30px; }
    .bar { flex:1; height:10px; background:#fff; border:2px solid #000; }
    .progress { height:100%; background:#2ed573; width:0%; transition:width 0.1s linear; }
  `,
  matrix: `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Courier New',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000; color:#00ff00; display:flex; padding:16px; border:2px solid #00ff00; box-shadow:0 0 15px #00ff00; align-items:center; gap:16px; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #00ff00; background:#000; }
    img { width:100%; height:100%; object-fit:cover; filter:matrix(1,0,0,1,0,0) hue-rotate(90deg) brightness(0.7); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:bold; color:#00ff00; text-shadow:0 0 5px #00ff00; margin-bottom:2px; }
    .artist { font-size:13px; color:#00cc00; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-weight:bold; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:#003300; border:1px solid #00ff00; overflow:hidden; }
    .progress { height:100%; background:#00ff00; width:0%; transition:width 0.1s linear; box-shadow:0 0 8px #00ff00; }
  `,
  split_bleed: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:120px; color:#fff; display:flex; padding:20px; border-radius:16px; align-items:center; gap:20px; box-shadow:0 12px 30px rgba(0,0,0,0.8); border:1px solid rgba(255,255,255,0.15); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; background-size:cover; background-position:center; position:relative; }
    .card::before { content:''; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:1; }
    .card.hidden { opacity:0; transform:scale(0.95); }
    .art-container { width:80px; height:80px; flex-shrink:0; border-radius:12px; background:#111; z-index:2; box-shadow:0 4px 10px rgba(0,0,0,0.4); }
    img { width:100%; height:100%; border-radius:12px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; z-index:2; }
    .title { font-size:19px; font-weight:700; margin-bottom:2px; text-shadow:0 1px 3px rgba(0,0,0,0.8); }
    .artist { opacity:0.85; font-size:14px; margin-bottom:12px; text-shadow:0 1px 2px rgba(0,0,0,0.8); }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.8; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:4px; background:rgba(255,255,255,0.2); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
  `,
  neon_pulse: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#080912; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #ff00ff; animation:borderPulse 4s infinite alternate; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#111; border:2px solid #00ffff; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#fff; text-shadow:0 0 6px #ff00ff; margin-bottom:2px; }
    .artist { color:#00ffff; font-size:14px; text-shadow:0 0 4px #00ffff; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ff00ff; font-family:monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:6px; background:#222; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff00ff,#00ffff); width:0%; transition:width 0.1s linear; }
    @keyframes borderPulse {
      0% { border-color:#ff00ff; box-shadow:0 0 10px #ff00ff; }
      50% { border-color:#00ffff; box-shadow:0 0 25px #00ffff; }
      100% { border-color:#ff00ff; box-shadow:0 0 10px #ff00ff; }
    }
  `,
  paper_scrap: `
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Caveat',cursive; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:430px; min-height:120px; background:#fcfaf2; color:#1a1005; display:flex; padding:16px; border-radius:4px; border:1px solid #dcd3b8; align-items:center; gap:16px; box-shadow:5px 5px 15px rgba(0,0,0,0.1); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:rotate(1deg) scale(1); overflow:hidden; position:relative; }
    .card::before { content:''; position:absolute; top:-5px; left:-5px; width:45px; height:20px; background:rgba(220,220,220,0.5); transform:rotate(-35deg); border:1px dashed rgba(0,0,0,0.1); }
    .card.hidden { opacity:0; transform:rotate(-2deg) scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; background:#eee; border:1px solid #ccc; }
    img { width:100%; height:100%; border-radius:4px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:24px; font-weight:700; color:#1a305a; margin-bottom:1px; }
    .artist { font-size:18px; color:#5d4037; margin-bottom:8px; }
    .progress-container { display:flex; align-items:center; gap:8px; }
    .time { font-size:15px; color:#555; min-width:30px; }
    .bar { flex:1; height:4px; background:#e2dbc5; }
    .progress { height:100%; background:#1a305a; width:0%; transition:width 0.1s linear; }
  `,
  glitch_hud: `
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Share Tech Mono',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:115px; background:rgba(6,12,6,0.9); color:#39ff14; display:flex; padding:16px; border:1px solid #39ff14; border-radius:0; align-items:center; gap:16px; box-shadow:0 0 15px rgba(57,255,20,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; position:relative; }
    .card::after { content:''; position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06)); background-size:100% 4px, 6px 100%; pointer-events:none; }
    .card.hidden { opacity:0; transform:scale(0.95); }
    .art-container { width:76px; height:76px; flex-shrink:0; border:1px solid #39ff14; }
    img { width:100%; height:100%; object-fit:cover; filter:grayscale(1) contrast(1.2) brightness(0.9); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:bold; letter-spacing:1px; color:#39ff14; text-transform:uppercase; margin-bottom:2px; }
    .artist { color:#18990c; font-size:13px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; min-width:35px; text-align:center; }
    .bar { flex:1; height:8px; background:#081c00; border:1px solid #18990c; }
    .progress { height:100%; background:#39ff14; width:0%; transition:width 0.1s linear; }
  `,
  neumorphic: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:440px; min-height:115px; background:#e0e6ee; color:#2c3e50; display:flex; padding:18px; border-radius:24px; align-items:center; gap:16px; box-shadow:9px 9px 18px #beccd4, -9px -9px 18px #ffffff; border:1px solid rgba(255,255,255,0.7); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:16px; background:#e0e6ee; box-shadow:inset 3px 3px 6px #beccd4, inset -3px -3px 6px #ffffff; padding:4px; }
    img { width:100%; height:100%; border-radius:12px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:700; color:#34495e; margin-bottom:2px; }
    .artist { color:#7f8c8d; font-size:13px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#7f8c8d; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:#e0e6ee; border-radius:999px; box-shadow:inset 2px 2px 4px #beccd4, inset -2px -2px 4px #ffffff; overflow:hidden; }
    .progress { height:100%; background:#2980b9; width:0%; transition:width 0.1s linear; border-radius:999px; }
  `,
  vaporwave_sunset: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:115px; background:linear-gradient(to bottom,#ff71ce,#01cdfe); color:#fff; display:flex; padding:16px; border-radius:8px; border:3px solid #b967ff; align-items:center; gap:16px; box-shadow:0 10px 25px rgba(255,113,206,0.4), inset 0 0 10px rgba(1,205,254,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; position:relative; }
    .card::before { content:''; position:absolute; width:100%; height:100%; top:0; left:0; background:linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px); background-size:100% 8px; z-index:1; pointer-events:none; }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:0px; border:2px solid #fff500; background:#111; z-index:2; }
    img { width:100%; height:100%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; z-index:2; }
    .title { font-size:20px; font-weight:900; color:#fff500; text-shadow:2px 2px 0px #b967ff; letter-spacing:0.5px; margin-bottom:2px; }
    .artist { color:#fff; font-size:14px; font-weight:700; text-shadow:1px 1px 0px #b967ff; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#fff500; font-family:monospace; min-width:35px; text-align:center; }
    .bar { flex:1; height:8px; background:rgba(0,0,0,0.3); border-radius:0; overflow:hidden; }
    .progress { height:100%; background:#05ffa1; width:0%; transition:width 0.1s linear; }
  `,
  lava_lamp: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#ff4500; color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; box-shadow:0 8px 30px rgba(255,69,0,0.4); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; position:relative; }
    .card::before { content:''; position:absolute; width:150px; height:150px; background:#ff8c00; border-radius:40% 60% 60% 40%; top:-40px; left:-20px; opacity:0.6; animation:lava 10s infinite alternate; pointer-events:none; }
    .card::after { content:''; position:absolute; width:120px; height:120px; background:#ff0000; border-radius:60% 40% 40% 60%; bottom:-30px; right:-20px; opacity:0.5; animation:lava 8s infinite alternate-reverse; pointer-events:none; }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#111; z-index:2; box-shadow:0 4px 10px rgba(0,0,0,0.3); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; z-index:2; }
    .title { font-size:19px; font-weight:700; margin-bottom:2px; text-shadow:0 2px 4px rgba(0,0,0,0.3); }
    .artist { color:#ffebb3; font-size:14px; margin-bottom:10px; text-shadow:0 1px 2px rgba(0,0,0,0.3); }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:rgba(0,0,0,0.25); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
    @keyframes lava {
      0% { border-radius: 40% 60% 60% 40%; transform: translate(0,0) scale(1); }
      50% { border-radius: 50% 50% 50% 50%; transform: translate(10px, -10px) scale(1.1); }
      100% { border-radius: 60% 40% 40% 60%; transform: translate(-10px, 10px) scale(0.95); }
    }
  `,
  chalkboard: `
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Caveat',cursive; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:115px; background:#2b3e34; color:#fff; display:flex; padding:16px; border:3px solid #8e7a5c; align-items:center; gap:16px; box-shadow:inset 0 0 15px rgba(0,0,0,0.5), 0 8px 25px rgba(0,0,0,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px dashed rgba(255,255,255,0.4); background:#111; }
    img { width:100%; height:100%; object-fit:cover; filter:contrast(0.9) brightness(0.9) grayscale(0.2); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:24px; color:#fff; text-shadow:0 0 2px rgba(255,255,255,0.7); margin-bottom:1px; }
    .artist { color:#a8e6cf; font-size:18px; margin-bottom:8px; }
    .progress-container { display:flex; align-items:center; gap:10px; }
    .time { font-size:15px; color:#fff; opacity:0.8; min-width:30px; }
    .bar { flex:1; height:4px; background:rgba(255,255,255,0.15); }
    .progress { height:100%; background:rgba(255,255,255,0.9); width:0%; transition:width 0.1s linear; }
  `,
  space_odyssey: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:rgba(5,7,20,0.85); color:#fff; display:flex; padding:16px; border-radius:50px; border:1px solid #4a90e2; align-items:center; gap:16px; box-shadow:0 0 20px rgba(74,144,226,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; position:relative; }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; border:2px solid #50e3c2; background:#111; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; animation:spin 12s linear infinite; }
    img.paused { animation-play-state:paused; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:600; color:#50e3c2; text-shadow:0 0 6px rgba(80,227,194,0.3); margin-bottom:2px; }
    .artist { color:#4a90e2; font-size:13px; font-weight:300; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#50e3c2; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:4px; background:#151e3d; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#50e3c2,#4a90e2); width:0%; transition:width 0.1s linear; }
    @keyframes spin { 100% { transform:rotate(360deg); } }
  `,
  glass_glass: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:120px; background:rgba(255,255,255,0.07); backdrop-filter:blur(25px); -webkit-backdrop-filter:blur(25px); color:#fff; display:flex; padding:20px; border-radius:24px; align-items:center; gap:20px; box-shadow:0 15px 35px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.1); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:80px; height:80px; flex-shrink:0; border-radius:16px; background:rgba(255,255,255,0.05); backdrop-filter:blur(5px); box-shadow:0 8px 32px 0 rgba(31,38,135,0.2); border:1px solid rgba(255,255,255,0.25); }
    img { width:100%; height:100%; border-radius:16px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:600; margin-bottom:2px; }
    .artist { opacity:0.8; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.8; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
  `,
  liquid_metal: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:linear-gradient(135deg,#757f9a,#d7dde8); color:#111; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; box-shadow:0 8px 30px rgba(117,127,154,0.3); border:2px solid #fff; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; }
    .card.hidden { opacity:0; transform:scale(0.95); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:8px; border:2px solid #111; background:#111; }
    img { width:100%; height:100%; border-radius:6px; object-fit:cover; filter:contrast(1.1) saturate(1.1); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:900; color:#111; text-transform:uppercase; margin-bottom:2px; }
    .artist { color:#4a4a4a; font-size:13px; font-weight:700; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#111; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:rgba(0,0,0,0.15); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#111; width:0%; transition:width 0.1s linear; }
  `,
  cardboard_box: `
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Share Tech Mono',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:440px; min-height:115px; background:#c5a059; color:#2c1b18; display:flex; padding:16px; border:3px solid #2c1b18; align-items:center; gap:16px; box-shadow:inset 0 0 10px rgba(0,0,0,0.15), 5px 5px 0px rgba(0,0,0,0.15); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; position:relative; }
    .card::before { content:'FRAGILE'; position:absolute; top:4px; right:10px; font-size:10px; font-weight:bold; color:rgba(44,27,24,0.3); border:1px solid rgba(44,27,24,0.3); padding:1px 3px; }
    .card.hidden { opacity:0; transform:scale(0.95); }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #2c1b18; }
    img { width:100%; height:100%; object-fit:cover; filter:contrast(0.9) sepia(0.3); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:bold; color:#2c1b18; margin-bottom:2px; text-transform:uppercase; }
    .artist { color:#5c4033; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-weight:bold; min-width:35px; }
    .bar { flex:1; height:6px; background:#b28b4c; overflow:hidden; }
    .progress { height:100%; background:#2c1b18; width:0%; transition:width 0.1s linear; }
  `,
  pixel_drip: `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Courier New',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#2a2b3d; color:#fff; display:flex; padding:16px; border:4px solid #fff; border-radius:0px; align-items:center; gap:16px; transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; image-rendering:pixelated; }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border:4px solid #00ffff; background:#111; }
    img { width:100%; height:100%; object-fit:cover; image-rendering:pixelated; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:900; color:#ff4081; margin-bottom:2px; }
    .artist { font-size:13px; color:#00ffff; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-weight:bold; min-width:35px; color:#fff; }
    .bar { flex:1; height:8px; background:#1e1f29; border:2px solid #fff; }
    .progress { height:100%; background:#00ffff; width:0%; transition:width 0.1s linear; }
  `,
  cyber_hazard: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:115px; background:#111; color:#ffcc00; display:flex; padding:16px; border:4px solid #ffcc00; align-items:center; gap:16px; box-shadow:0 0 15px rgba(255,204,0,0.3); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; position:relative; }
    .card::before { content:''; position:absolute; top:0; left:0; width:100%; height:8px; background:repeating-linear-gradient(45deg,#ffcc00,#ffcc00 10px,#111 10px,#111 20px); }
    .card::after { content:''; position:absolute; bottom:0; left:0; width:100%; height:8px; background:repeating-linear-gradient(45deg,#ffcc00,#ffcc00 10px,#111 10px,#111 20px); }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #ffcc00; }
    img { width:100%; height:100%; object-fit:cover; filter:contrast(1.2) sepia(0.2); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:900; color:#ffcc00; margin-bottom:2px; text-transform:uppercase; }
    .artist { color:#888; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-weight:900; min-width:35px; }
    .bar { flex:1; height:8px; background:#222; border:1px solid #ffcc00; overflow:hidden; }
    .progress { height:100%; background:#ffcc00; width:0%; transition:width 0.1s linear; }
  `,
  watercolor: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:linear-gradient(135deg,rgba(255,230,240,0.9),rgba(230,240,255,0.9)); color:#3b3c4f; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; box-shadow:0 8px 30px rgba(100,150,200,0.15); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; border:2px solid rgba(255,255,255,0.7); }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.05); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:600; color:#2c3e50; margin-bottom:2px; }
    .artist { color:#7f8c8d; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#7f8c8d; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:4px; background:rgba(0,0,0,0.05); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff6b6b,#4ecdc4); width:0%; transition:width 0.1s linear; }
  `,
  stained_glass: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:115px; background:rgba(30,20,50,0.85); color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #50e3c2; box-shadow:0 0 20px rgba(80,227,194,0.4), inset 0 0 10px rgba(255,0,255,0.2); transition:opacity 0.3s ease,transform 0.3s ease; opacity:1; transform:scale(1); overflow:hidden; position:relative; }
    .card.hidden { opacity:0; transform:scale(0.9); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:8px; border:1px solid #ff00ff; background:#111; }
    img { width:100%; height:100%; border-radius:6px; object-fit:cover; filter:contrast(1.2) brightness(0.8); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:800; color:#50e3c2; text-shadow:0 0 5px #50e3c2; margin-bottom:2px; }
    .artist { color:#ff00ff; font-size:14px; text-shadow:0 0 3px #ff00ff; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#50e3c2; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:#1e1430; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff00ff,#50e3c2); width:0%; transition:width 0.1s linear; }
  `,
  prismatic_crystal: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:rgba(20,20,30,0.85); color:#fff; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:2px solid transparent; background-image:linear-gradient(rgba(20,20,30,0.85),rgba(20,20,30,0.85)), linear-gradient(135deg,#ff007f,#7f00ff,#00f260,#0575e6,#ff007f); background-origin:border-box; background-clip:content-box, border-box; background-size:300% 300%; animation:borderGrad 6s linear infinite; box-shadow:0 0 25px rgba(255,0,127,0.3); transition:opacity 0.3s ease,transform 0.3s ease; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:6px; background:#111; }
    img { width:100%; height:100%; border-radius:6px; object-fit:cover; transition:opacity 0.4s ease; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:800; color:#fff; text-shadow:0 0 5px rgba(255,255,255,0.5); }
    .artist { color:rgba(255,255,255,0.7); font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.8; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff007f,#7f00ff); width:0%; transition:width 0.1s linear; }
    @keyframes borderGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  `,
  ghostly: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:rgba(255,255,255,0.03); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); color:#fff; display:flex; padding:16px; border-radius:30px; align-items:center; gap:16px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 15px 35px rgba(0,0,0,0.2); transition:opacity 0.3s ease; animation:floatCard 4s ease-in-out infinite; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; border:1px solid rgba(255,255,255,0.2); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; opacity:0.6; filter:grayscale(0.3); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:300; letter-spacing:1px; color:#fff; }
    .artist { color:rgba(255,255,255,0.5); font-size:14px; margin-bottom:10px; font-weight:600; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.5; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:2px; background:rgba(255,255,255,0.1); }
    .progress { height:100%; background:rgba(255,255,255,0.6); width:0%; transition:width 0.1s linear; }
    @keyframes floatCard { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
  `,
  terminal_green: `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Courier New',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#020b02; color:#39ff14; display:flex; padding:16px; border:2px solid #39ff14; border-radius:0px; align-items:center; gap:16px; box-shadow:0 0 15px rgba(57,255,20,0.4); text-shadow:0 0 5px #39ff14; position:relative; overflow:hidden; }
    .card::before { content:''; position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06)); background-size:100% 4px, 6px 100%; z-index:2; pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:1px solid #39ff14; background:#000; filter:grayscale(1) contrast(1.5) brightness(1.2); }
    img { width:100%; height:100%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:bold; margin-bottom:2px; text-transform:uppercase; }
    .artist { color:#18990c; font-size:14px; margin-bottom:10px; text-transform:uppercase; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:11px; font-weight:bold; min-width:35px; }
    .bar { flex:1; height:8px; background:#001500; border:1px solid #39ff14; }
    .progress { height:100%; background:#39ff14; width:0%; transition:width 0.1s linear; }
    .typing-caret::after { content:'_'; display:inline-block; animation:blink 0.6s step-end infinite; }
    @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
  `,
  blueprint: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background-color:#004b93; background-image:linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px); background-size:15px 15px; color:#fff; display:flex; padding:16px; border:2px dashed rgba(255,255,255,0.5); align-items:center; gap:16px; transition:opacity 0.3s ease,transform 0.3s ease; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #fff; background:#003366; }
    img { width:100%; height:100%; object-fit:cover; filter:blue(0.5) brightness(1.2); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:600; color:#fff; text-transform:uppercase; letter-spacing:0.5px; }
    .artist { color:rgba(255,255,255,0.7); font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-family:monospace; min-width:35px; color:#fff; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.25); border:1px solid #fff; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
  `,
  carbon_fiber: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:radial-gradient(circle at 10% 20%, #222 0%, #151515 90%); color:#fff; display:flex; padding:16px; border-radius:6px; align-items:center; gap:16px; border:2px solid #ff0000; border-left:8px solid #ff0000; box-shadow:0 8px 30px rgba(0,0,0,0.7); transition:opacity 0.3s ease; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; border:1px solid #444; }
    img { width:100%; height:100%; border-radius:2px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:800; color:#fff; font-style:italic; }
    .artist { color:#ff0000; font-size:14px; margin-bottom:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; opacity:0.8; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:#333; overflow:hidden; border-radius:2px; }
    .progress { height:100%; background:#ff0000; width:0%; transition:width 0.1s linear; }
  `,
  retro_cassette: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:115px; background:#c5b8a5; color:#222; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:6px solid #4e4034; box-shadow:0 8px 30px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.3); position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; border:4px solid #4e4034; animation:spinCassette 8s linear infinite; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:700; color:#3e2a00; font-family:monospace; }
    .artist { color:#5c4033; font-size:14px; margin-bottom:10px; font-family:monospace; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-family:monospace; color:#222; }
    .bar { flex:1; height:8px; background:#e8dcc4; border-radius:4px; overflow:hidden; border:1px solid #4e4034; }
    .progress { height:100%; background:#ff4757; width:0%; transition:width 0.1s linear; }
    @keyframes spinCassette { 100% { transform:rotate(-360deg); } }
  `,
  autumn_leaves: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:linear-gradient(135deg,#7e2600,#3a1000); color:#ffd2a1; display:flex; padding:16px; border-radius:20px; align-items:center; gap:16px; border:2px solid #d45d00; box-shadow:0 8px 25px rgba(212,93,0,0.3); transition:opacity 0.3s ease; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:12px; background:#220a00; }
    img { width:100%; height:100%; border-radius:10px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:600; color:#ffaa66; }
    .artist { color:#ffd2a1; opacity:0.8; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ffd2a1; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:rgba(212,93,0,0.2); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ffaa66; width:0%; transition:width 0.1s linear; }
  `,
  frozen_ice: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:rgba(224,242,254,0.3); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; border:2px solid rgba(255,255,255,0.4); box-shadow:0 8px 32px 0 rgba(14,165,233,0.2), inset 0 0 15px rgba(255,255,255,0.3); transition:opacity 0.3s ease; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:14px; background:rgba(255,255,255,0.2); }
    img { width:100%; height:100%; border-radius:12px; object-fit:cover; filter:contrast(1.1) saturate(0.8) brightness(1.1); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:600; color:#e0f2fe; text-shadow:0 0 6px rgba(224,242,254,0.6); }
    .artist { color:#bae6fd; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#e0f2fe; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.2); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#bae6fd,#0ea5e9); width:0%; transition:width 0.1s linear; }
  `,
  glitch_art: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#111; color:#fff; display:flex; padding:16px; border:3px solid #ff0055; border-radius:0px; align-items:center; gap:16px; box-shadow:5px 5px 0px #00ffcc; transition:opacity 0.3s ease; animation:glitchCard 3s step-end infinite; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #00ffcc; background:#000; overflow:hidden; }
    img { width:100%; height:100%; object-fit:cover; animation:glitchImg 4s step-end infinite; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:900; color:#fff; text-transform:uppercase; letter-spacing:0.5px; animation:glitchText 2.5s step-end infinite; }
    .artist { color:#00ffcc; font-size:14px; margin-bottom:10px; font-weight:700; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ff0055; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:8px; background:#222; border:1px solid #00ffcc; }
    .progress { height:100%; background:#ff0055; width:0%; transition:width 0.1s linear; }
    @keyframes glitchCard { 0%,100%{transform:translate(0); border-color:#ff0055; box-shadow:5px 5px 0px #00ffcc;} 92%{transform:translate(-2px,2px); border-color:#00ffcc; box-shadow:5px 5px 0px #ff0055;} 95%{transform:translate(2px,-2px); border-color:#fff; box-shadow:none;} }
    @keyframes glitchImg { 0%,100%{transform:scale(1) skewX(0deg);} 85%{transform:scale(1.1) skewX(5deg); filter:hue-rotate(90deg);} 90%{transform:scale(0.95) skewX(-5deg); filter:hue-rotate(-90deg);} }
    @keyframes glitchText { 0%,100%{text-shadow:none;} 78%{text-shadow:2px 0 0 #ff0055, -2px 0 0 #00ffcc;} }
  `,
  steampunk_brass: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:115px; background:radial-gradient(circle at center, #6b4c35 0%, #3e2617 100%); color:#e8c39e; display:flex; padding:16px; border-radius:4px; align-items:center; gap:16px; border:3px solid #b8860b; box-shadow:0 8px 30px rgba(0,0,0,0.6), inset 0 0 10px rgba(0,0,0,0.5); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; border:3px solid #b8860b; background:#000; filter:sepia(0.8) contrast(1.2); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:700; color:#ffcc66; font-family:'Times New Roman',Times,serif; text-shadow:1px 1px 2px #000; }
    .artist { color:#d2b48c; font-size:14px; margin-bottom:10px; font-family:'Times New Roman',Times,serif; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-family:monospace; color:#ffcc66; }
    .bar { flex:1; height:8px; background:#221105; border-radius:0px; overflow:hidden; border:1px solid #b8860b; }
    .progress { height:100%; background:#b8860b; width:0%; transition:width 0.1s linear; }
  `,
  pop_art_bubble: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background-color:#ff00ff; background-image:radial-gradient(#00ffff 10%, transparent 11%); background-size:12px 12px; color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; border:4px solid #000; box-shadow:8px 8px 0px #000; transition:opacity 0.3s ease; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; border:3px solid #000; background:#fff; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:900; color:#ffff00; -webkit-text-stroke: 1px #000; text-shadow:2px 2px 0px #000; text-transform:uppercase; }
    .artist { color:#fff; -webkit-text-stroke: 0.5px #000; text-shadow:1.5px 1.5px 0px #000; font-size:14px; margin-bottom:10px; font-weight:800; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-weight:900; color:#ffff00; -webkit-text-stroke: 0.5px #000; text-shadow:1px 1px 0px #000; min-width:35px; }
    .bar { flex:1; height:12px; background:#fff; border:3px solid #000; border-radius:6px; overflow:hidden; }
    .progress { height:100%; background:#ffff00; width:0%; transition:width 0.1s linear; }
  `,
  golden_hour: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',system-ui,sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:linear-gradient(135deg,#ff9900,#ff5e62); color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; box-shadow:0 8px 30px rgba(255,94,98,0.4); transition:opacity 0.3s ease; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:rgba(255,255,255,0.15); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; animation:spin 12s linear infinite; }
    img.paused { animation-play-state:paused; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:600; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.1); }
    .artist { color:#ffe0d0; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ffe0d0; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.25); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
    @keyframes spin { 100% { transform:rotate(360deg); } }
  `,
  midnight_eclipse: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#070913; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:1px solid rgba(255,255,255,0.05); box-shadow:0 0 30px rgba(0,191,255,0.25); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; box-shadow:0 0 15px rgba(0,191,255,0.8); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#e0f7ff; }
    .artist { color:#00bfff; font-size:14px; margin-bottom:10px; font-weight:600; text-shadow:0 0 3px rgba(0,191,255,0.4); }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#00bfff; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:#0b132b; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#00bfff,#1dd1a1); width:0%; transition:width 0.1s linear; }
  `,
  cyber_grid: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background-color:#060814; background-image:linear-gradient(rgba(0,170,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,170,255,0.05) 1px, transparent 1px); background-size:20px 20px; color:#fff; display:flex; padding:16px; border-radius:8px; align-items:center; gap:16px; border:2px solid #00aaff; box-shadow:0 0 15px rgba(0,170,255,0.3); }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #00aaff; background:#000; }
    img { width:100%; height:100%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#fff; text-shadow:0 0 5px #00aaff; }
    .artist { color:#00aaff; font-size:14px; margin-bottom:10px; font-weight:500; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#00aaff; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:#040d21; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#00aaff; width:0%; transition:width 0.1s linear; }
  `,
  origami: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#faf5ef; color:#4a4135; display:flex; padding:16px; border-radius:0px; clip-path:polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%); align-items:center; gap:16px; border:1px solid #dcd1c4; box-shadow:5px 5px 15px rgba(0,0,0,0.15); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:0px; clip-path:polygon(0 15%, 100% 0, 100% 85%, 0 100%); background:#e0d5c1; }
    img { width:100%; height:100%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:600; color:#5c4d3c; }
    .artist { color:#8c7860; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#8c7860; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:#e5dbca; overflow:hidden; }
    .progress { height:100%; background:#8c7860; width:0%; transition:width 0.1s linear; }
  `,
  rainbow_wave: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:linear-gradient(270deg,#ff0055,#ffcc00,#00ffcc,#ff0055); background-size:800% 800%; animation:waveBg 12s ease infinite; color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; box-shadow:0 8px 30px rgba(0,0,0,0.3); transition:opacity 0.3s ease; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:rgba(255,255,255,0.2); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; animation:spin 8s linear infinite; }
    img.paused { animation-play-state:paused; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:800; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.3); }
    .artist { color:rgba(255,255,255,0.9); font-size:14px; margin-bottom:10px; text-shadow:0 1px 2px rgba(0,0,0,0.3); }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#fff; font-family:monospace; min-width:35px; text-shadow:0 1px 2px rgba(0,0,0,0.3); }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.3); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
    @keyframes waveBg { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    @keyframes spin { 100% { transform:rotate(360deg); } }
  `,
  leather: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#4a2b16; color:#e2c595; display:flex; padding:16px; border-radius:8px; align-items:center; gap:16px; border:3px solid #ffd700; box-shadow:0 10px 25px rgba(0,0,0,0.6), inset 0 0 15px rgba(0,0,0,0.5); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; border:2px solid #ffd700; background:#361f10; }
    img { width:100%; height:100%; border-radius:2px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:700; color:#ffd700; font-family:'Georgia',serif; }
    .artist { color:#e2c595; font-size:14px; margin-bottom:10px; font-family:'Georgia',serif; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-family:monospace; color:#ffd700; }
    .bar { flex:1; height:6px; background:#29180c; border-radius:999px; overflow:hidden; border:1px solid #ffd700; }
    .progress { height:100%; background:#ffd700; width:0%; transition:width 0.1s linear; }
  `,
  abyssal: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#010714; color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; border:1px solid rgba(0,242,254,0.2); box-shadow:0 0 30px rgba(0,242,254,0.3); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; box-shadow:0 0 12px rgba(0,242,254,0.6); }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:600; color:#00f2fe; }
    .artist { color:#4facfe; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#00f2fe; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:#001c3d; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#4facfe,#00f2fe); width:0%; transition:width 0.1s linear; }
  `,
  typewriter: `
    @import url('https://fonts.googleapis.com/css2?family=Special+Elite&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Special Elite',serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#ebe5d5; color:#222; display:flex; padding:16px; border:2px solid #555; box-shadow:3px 3px 0px #555; align-items:center; gap:16px; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #222; background:#aaa; filter:sepia(1) contrast(1.3); }
    img { width:100%; height:100%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:bold; color:#111; }
    .artist { color:#444; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; font-family:monospace; }
    .bar { flex:1; height:6px; background:#d4cbb8; overflow:hidden; border:1px solid #222; }
    .progress { height:100%; background:#222; width:0%; transition:width 0.1s linear; }
  `,
  techno_club: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#090014; color:#fff; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:2px solid #ff00ff; box-shadow:0 0 25px rgba(255,0,255,0.5), inset 0 0 10px rgba(0,255,255,0.3); transition:opacity 0.3s ease; animation:pulseGlow 2s infinite alternate; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:6px; background:#000; border:1px solid #00ffff; }
    img { width:100%; height:100%; border-radius:4px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:900; color:#ff00ff; text-shadow:0 0 5px #ff00ff; }
    .artist { color:#00ffff; font-size:14px; margin-bottom:10px; font-weight:700; text-shadow:0 0 3px #00ffff; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#00ffff; font-family:monospace; min-width:35px; }
    .bar { flex:1; height:6px; background:#180029; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff00ff,#00ffff); width:0%; transition:width 0.1s linear; }
    @keyframes pulseGlow { 0% { box-shadow:0 0 15px rgba(255,0,255,0.4); } 100% { box-shadow:0 0 30px rgba(255,0,255,0.8), 0 0 10px rgba(0,255,255,0.4); } }
  `,
  walking_cat: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#222; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #555; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:8px; background:#000; }
    img { width:100%; height:100%; border-radius:6px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#ffcc00; }
    .artist { color:#bbb; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#bbb; font-family:monospace; }
    .bar { flex:1; height:6px; background:#333; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ffcc00; width:0%; transition:width 0.1s linear; position:relative; overflow:visible; }
    .progress::after { content:'🐈'; position:absolute; right:-10px; top:-16px; font-size:18px; animation:catWalk 0.8s steps(2) infinite; }
    @keyframes catWalk { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-2px); } }
  `,
  running_dog: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#1b2838; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #2a475e; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#5da9ff; }
    .artist { color:#c7d5e0; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#c7d5e0; font-family:monospace; }
    .bar { flex:1; height:6px; background:#101822; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#5da9ff; width:0%; transition:width 0.1s linear; position:relative; overflow:visible; }
    .progress::after { content:'🐕'; position:absolute; right:-12px; top:-18px; font-size:18px; animation:dogRun 0.5s linear infinite; }
    @keyframes dogRun { 0%,100% { transform:translateY(0) rotate(-3deg); } 50% { transform:translateY(-3px) rotate(3deg); } }
  `,
  walking_astronaut: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#0b0c10; color:#1f2833; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:2px solid #66fcf1; box-shadow:0 0 15px rgba(102,252,241,0.2); position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:6px; background:#000; }
    img { width:100%; height:100%; border-radius:4px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#fff; }
    .artist { color:#66fcf1; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#45f3ff; font-family:monospace; }
    .bar { flex:1; height:6px; background:#1f2833; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#66fcf1; width:0%; transition:width 0.1s linear; }
    .card::after { content:'🧑‍🚀'; position:absolute; right:15px; top:12px; font-size:22px; animation:astroFloat 4s ease-in-out infinite; }
    @keyframes astroFloat { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-8px) rotate(15deg); } }
  `,
  dancing_ghost: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#1a102f; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #a29bfe; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; position:relative; overflow:visible; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .art-container::after { content:'👻'; position:absolute; top:-25px; left:25px; font-size:22px; animation:ghostDance 1.5s ease-in-out infinite; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#a29bfe; }
    .artist { color:#dfe6e9; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#dfe6e9; font-family:monospace; }
    .bar { flex:1; height:6px; background:#2d2d44; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#a29bfe; width:0%; transition:width 0.1s linear; }
    @keyframes ghostDance { 0%,100% { transform:translateY(0) scaleX(1); } 50% { transform:translateY(-6px) scaleX(-1); } }
  `,
  heart_pulse: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#2d091a; color:#fff; display:flex; padding:16px; border-radius:20px; align-items:center; gap:16px; border:2px solid #ff477e; box-shadow:0 0 15px rgba(255,71,126,0.3); position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:10px; background:#000; }
    img { width:100%; height:100%; border-radius:8px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#ff477e; display:inline-block; }
    .title::after { content:'💖'; margin-left:8px; display:inline-block; animation:pulseHeart 0.8s infinite alternate; }
    .artist { color:#ffb3c6; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ffb3c6; font-family:monospace; }
    .bar { flex:1; height:6px; background:#491129; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ff477e; width:0%; transition:width 0.1s linear; }
    @keyframes pulseHeart { 0% { transform:scale(1); } 100% { transform:scale(1.25); } }
  `,
  ufo_abduction: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#080d1a; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #00ffcc; position:relative; overflow:visible; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:6px; background:#000; position:relative; }
    img { width:100%; height:100%; border-radius:4px; object-fit:cover; }
    .art-container::before { content:'🛸'; position:absolute; top:-32px; left:22px; font-size:24px; animation:ufoHover 2s ease-in-out infinite; z-index:5; }
    .art-container::after { content:''; position:absolute; top:5px; left:18px; width:40px; height:70px; background:linear-gradient(rgba(0,255,200,0.4), transparent); clip-path:polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%); animation:ufoBeam 2s ease-in-out infinite; pointer-events:none; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#00ffcc; }
    .artist { color:#8dfbe5; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#8dfbe5; font-family:monospace; }
    .bar { flex:1; height:6px; background:#0f1d3a; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#00ffcc; width:0%; transition:width 0.1s linear; }
    @keyframes ufoHover { 0%,100%{transform:translateY(0) rotate(0deg);} 50%{transform:translateY(-4px) rotate(5deg);} }
    @keyframes ufoBeam { 0%,100%{opacity:0.3;} 50%{opacity:0.8;} }
  `,
  retro_pacman: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Courier New',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000; color:#fff; display:flex; padding:16px; border:3px solid #0022ff; align-items:center; gap:16px; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #0022ff; background:#111; }
    img { width:100%; height:100%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:bold; color:#ffff00; }
    .artist { color:#ff00ff; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#00ffff; }
    .bar { flex:1; height:10px; background:#050515; border:1px solid #0022ff; overflow:visible; position:relative; }
    .progress { height:100%; background:#ffff00; width:0%; transition:width 0.1s linear; position:relative; overflow:visible; }
    .progress::after { content:'🍒'; position:absolute; right:-14px; top:-6px; font-size:14px; }
    .bar::before { content:'👾'; position:absolute; left:10px; top:-6px; font-size:14px; animation:ghostChase 2s linear infinite; }
    @keyframes ghostChase { 0%,100%{left:10px;} 50%{left:80%;} }
  `,
  bouncing_cd: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#282c34; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #abb2bf; position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; animation:cdBounce 2.5s ease-in-out infinite alternate; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#61afef; }
    .artist { color:#abb2bf; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#abb2bf; font-family:monospace; }
    .bar { flex:1; height:6px; background:#1e2127; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#61afef; width:0%; transition:width 0.1s linear; }
    @keyframes cdBounce { 0% { transform:translateY(-8px); } 100% { transform:translateY(8px); } }
  `,
  dj_visualizer: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000; color:#fff; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:2px solid #00ff00; position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:6px; background:#111; }
    img { width:100%; height:100%; border-radius:4px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#00ff00; }
    .artist { color:#888; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#00ff00; font-family:monospace; }
    .bar { flex:1; height:6px; background:#222; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#00ff00; width:0%; transition:width 0.1s linear; }
    .card::before { content:'📊'; position:absolute; right:15px; top:15px; font-size:20px; animation:eqJump 0.5s infinite alternate; }
    @keyframes eqJump { 0% { transform: scaleY(0.7); } 100% { transform: scaleY(1.3); } }
  `,
  matrix_rain: `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Courier New',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000; color:#00ff00; display:flex; padding:16px; border:1px solid #00ff00; align-items:center; gap:16px; position:relative; }
    .card::before { content:'1 0 1 0 1 0 1 0 1 0 1 0'; position:absolute; bottom:2px; left:16px; font-size:10px; opacity:0.3; animation:matrixRain 2s linear infinite; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:1px solid #00ff00; }
    img { width:100%; height:100%; object-fit:cover; filter:matrix(1.5) grayscale(1); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:bold; }
    .artist { color:#00aa00; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; }
    .bar { flex:1; height:6px; background:#002200; overflow:hidden; }
    .progress { height:100%; background:#00ff00; width:0%; transition:width 0.1s linear; }
    @keyframes matrixRain { 0%{ transform:translateY(-10px); opacity:0.1; } 50%{ opacity:0.6; } 100%{ transform:translateY(10px); opacity:0.1; } }
  `,
  snowfall: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#1e272c; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #e2ebf0; position:relative; overflow:hidden; }
    .card::before { content:'❄  ❄  ❄  ❄'; position:absolute; top:-20px; left:0; width:100%; text-align:center; font-size:14px; opacity:0.7; animation:snowFallAnim 3s linear infinite; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#fff; }
    .artist { color:#cfd8dc; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#cfd8dc; font-family:monospace; }
    .bar { flex:1; height:6px; background:#37474f; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#cfd8dc; width:0%; transition:width 0.1s linear; }
    @keyframes snowFallAnim { 0% { transform: translateY(0) rotate(0deg); } 100% { transform: translateY(130px) rotate(360deg); } }
  `,
  rainy_day: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#2c3e50; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #34495e; position:relative; overflow:hidden; }
    .card::before { content:'💧  💧  💧  💧'; position:absolute; top:-20px; left:0; width:100%; text-align:center; font-size:12px; opacity:0.6; animation:rainDropAnim 1.5s linear infinite; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:12px; background:#000; }
    img { width:100%; height:100%; border-radius:10px; object-fit:cover; filter:blur(0.5px); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#ecf0f1; }
    .artist { color:#bdc3c7; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#bdc3c7; font-family:monospace; }
    .bar { flex:1; height:6px; background:#34495e; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ecf0f1; width:0%; transition:width 0.1s linear; }
    @keyframes rainDropAnim { 0% { transform: translateY(0); } 100% { transform: translateY(130px); } }
  `,
  shooting_star: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#0f0f1a; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #5a5a7a; position:relative; overflow:hidden; }
    .card::before { content:'☄️'; position:absolute; top:-10px; left:-10px; font-size:16px; animation:starShoot 4s linear infinite; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:14px; background:#000; }
    img { width:100%; height:100%; border-radius:12px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#e0e0ff; }
    .artist { color:#b0b0d0; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#b0b0d0; font-family:monospace; }
    .bar { flex:1; height:6px; background:#2a2a3e; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#e0e0ff; width:0%; transition:width 0.1s linear; }
    @keyframes starShoot { 0% { transform: translate(0, 0); opacity:1; } 20% { transform: translate(460px, 120px); opacity:0; } 100% { transform: translate(460px, 120px); opacity:0; } }
  `,
  fire_flame: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#1b0000; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #ff3300; box-shadow:0 0 15px rgba(255,51,0,0.3); position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:10px; background:#000; }
    img { width:100%; height:100%; border-radius:8px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#ff3300; }
    .artist { color:#ffaa66; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ffaa66; font-family:monospace; }
    .bar { flex:1; height:6px; background:#4a0000; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff3300,#ffaa66); width:0%; transition:width 0.1s linear; }
    .card::before { content:'🔥'; position:absolute; right:15px; bottom:15px; font-size:20px; animation:fireFlutter 0.4s infinite alternate; }
    @keyframes fireFlutter { 0% { transform: scale(1) rotate(-5deg); } 100% { transform: scale(1.15) rotate(5deg); } }
  `,
  neon_sinewave: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#040d12; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #183d3d; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; border:2px solid #5c8374; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#93b1a6; }
    .artist { color:#5c8374; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#5c8374; font-family:monospace; }
    .bar { flex:1; height:6px; background:#183d3d; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#93b1a6; width:0%; transition:width 0.1s linear; position:relative; }
    .progress::before { content:''; position:absolute; right:0; top:-5px; width:10px; height:16px; background:#93b1a6; border-radius:50%; box-shadow:0 0 10px #93b1a6; animation:wavePulse 1s ease-in-out infinite alternate; }
    @keyframes wavePulse { 0% { transform:scaleY(0.7); } 100% { transform:scaleY(1.4); } }
  `,
  glitch_shaker: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000; color:#fff; display:flex; padding:16px; border-radius:8px; align-items:center; gap:16px; border:2px solid #fff; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; background:#111; }
    img { width:100%; height:100%; border-radius:2px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:900; color:#fff; animation:glitchShake 0.4s infinite; }
    .artist { color:#888; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#888; font-family:monospace; }
    .bar { flex:1; height:6px; background:#222; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
    @keyframes glitchShake { 0% { transform: translate(0px, 0px); } 10% { transform: translate(-1px, -1px); } 20% { transform: translate(-2px, 0px); } 30% { transform: translate(1px, 2px); } 40% { transform: translate(1px, -1px); } 50% { transform: translate(-1px, 1px); } 60% { transform: translate(-2px, -1px); } 70% { transform: translate(2px, 1px); } 80% { transform: translate(-1px, -2px); } 90% { transform: translate(1px, 1px); } 100% { transform: translate(0px, 0px); } }
  `,
  disco_strobes: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#111; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid transparent; background-image:linear-gradient(#111,#111), linear-gradient(90deg,#ff007f,#7f00ff,#00f260,#ff007f); background-origin:border-box; background-clip:content-box, border-box; background-size:300% 300%; animation:borderGrad 3s linear infinite; box-shadow:0 0 20px rgba(127,0,255,0.4); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:800; color:#fff; text-shadow:0 0 8px #ff007f; }
    .artist { color:#00f260; font-size:14px; margin-bottom:10px; font-weight:700; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#00f260; font-family:monospace; }
    .bar { flex:1; height:6px; background:#222; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff007f,#7f00ff); width:0%; transition:width 0.1s linear; }
    @keyframes borderGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  `,
  retro_tape_spin: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#343a40; color:#fff; display:flex; padding:16px; border-radius:8px; align-items:center; gap:16px; border:4px solid #212529; position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; background:#000; border:1px solid #495057; }
    img { width:100%; height:100%; border-radius:2px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:600; color:#f8f9fa; }
    .artist { color:#adb5bd; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#adb5bd; font-family:monospace; }
    .bar { flex:1; height:6px; background:#495057; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#f8f9fa; width:0%; transition:width 0.1s linear; }
    .card::before, .card::after { content:'⚙️'; position:absolute; font-size:16px; top:12px; }
    .card::before { right:40px; animation:tapeSpin 4s linear infinite; }
    .card::after { right:15px; animation:tapeSpin 4s linear infinite; }
    @keyframes tapeSpin { 100% { transform:rotate(360deg); } }
  `,
  vinyl_scratch: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#1e1e24; color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; border:2px solid #f72585; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; position:relative; animation:spinVinyl 4s linear infinite; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .art-container::after { content:'📍'; position:absolute; top:-5px; right:-5px; font-size:16px; animation:scratchArm 1.5s ease-in-out infinite alternate; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#f72585; }
    .artist { color:#7209b7; font-size:14px; margin-bottom:10px; font-weight:700; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#7209b7; font-family:monospace; }
    .bar { flex:1; height:6px; background:#3a0ca3; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#f72585,#7209b7); width:0%; transition:width 0.1s linear; }
    @keyframes spinVinyl { 100%{transform:rotate(360deg);} }
    @keyframes scratchArm { 0%{transform:rotate(0deg);} 100%{transform:rotate(12deg);} }
  `,
  neon_runner: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#0c0f1d; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; position:relative; overflow:hidden; box-shadow:0 0 20px rgba(76,201,240,0.3); }
    .card::before { content:''; position:absolute; top:-150%; left:-150%; width:400%; height:400%; background:conic-gradient(from 0deg, transparent 70%, #4cc9f0 90%, #fff 98%, transparent 100%); animation:rotateBorder 3s linear infinite; z-index:1; }
    .card::after { content:''; position:absolute; inset:2px; background:#0c0f1d; border-radius:14px; z-index:2; }
    .art-container, .info { position:relative; z-index:3; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:12px; background:#000; border:1px solid #4cc9f0; }
    img { width:100%; height:100%; border-radius:10px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#4cc9f0; }
    .artist { color:#4895ef; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#4895ef; font-family:monospace; }
    .bar { flex:1; height:6px; background:#1e293b; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#4cc9f0; width:0%; transition:width 0.1s linear; }
    @keyframes rotateBorder { 100% { transform:rotate(360deg); } }
  `,
  scrolling_text: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#111; color:#fff; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:2px solid #ffb703; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:6px; background:#000; }
    img { width:100%; height:100%; border-radius:4px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title-container { width:100%; overflow:hidden; position:relative; height:26px; }
    .title { font-size:19px; font-weight:700; color:#ffb703; position:absolute; white-space:nowrap; animation:marqueeText 8s linear infinite; }
    .artist { color:#fb8500; font-size:14px; margin-bottom:10px; font-weight:700; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#fb8500; font-family:monospace; }
    .bar { flex:1; height:6px; background:#333; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ffb703; width:0%; transition:width 0.1s linear; }
    @keyframes marqueeText { 0% { left:100%; } 100% { left:-100%; } }
  `,
  bubbles: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:linear-gradient(135deg,#ff9a9e,#fecfef); color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; border:2px solid rgba(255,255,255,0.5); position:relative; overflow:hidden; }
    .card::before { content:'🫧  🫧  🫧'; position:absolute; bottom:-20px; left:0; width:100%; text-align:center; font-size:16px; opacity:0.8; animation:bubbleRise 3s linear infinite; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#fff; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,0.1); }
    .artist { color:#ff6b81; font-size:14px; margin-bottom:10px; font-weight:700; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ff6b81; font-family:monospace; }
    .bar { flex:1; height:6px; background:rgba(255,255,255,0.4); border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
    @keyframes bubbleRise { 0% { transform: translateY(0); opacity:1; } 100% { transform: translateY(-130px); opacity:0; } }
  `,
  cyber_target: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#061623; color:#fff; display:flex; padding:16px; border-radius:8px; align-items:center; gap:16px; border:2px solid #00f0ff; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; background:#000; position:relative; overflow:visible; }
    img { width:100%; height:100%; border-radius:2px; object-fit:cover; }
    .art-container::after { content:'🎯'; position:absolute; top:-6px; left:-6px; font-size:16px; animation:targetSpin 3s linear infinite; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#00f0ff; text-shadow:0 0 5px #00f0ff; }
    .artist { color:#58b0e3; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#58b0e3; font-family:monospace; }
    .bar { flex:1; height:6px; background:#0c2d48; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#00f0ff; width:0%; transition:width 0.1s linear; }
    @keyframes targetSpin { 100%{transform:rotate(360deg);} }
  `,
  glitch_vhs: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#151515; color:#fff; display:flex; padding:16px; border-radius:4px; align-items:center; gap:16px; border:2px solid #555; position:relative; overflow:hidden; }
    .card::before { content:''; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.05); background-image:linear-gradient(transparent 50%, rgba(0,0,0,0.4) 50%); background-size:100% 4px; pointer-events:none; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; background:#000; border:1px solid #888; }
    img { width:100%; height:100%; border-radius:2px; object-fit:cover; filter:contrast(1.2) brightness(0.9); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:900; color:#fff; animation:vhsTracking 1.5s infinite; }
    .artist { color:#aaa; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#aaa; font-family:monospace; }
    .bar { flex:1; height:6px; background:#333; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
    @keyframes vhsTracking { 0%,100%{transform:translate(0);} 90%{transform:translate(2px, 1px) skewX(2deg);} 95%{transform:translate(-2px, -1px) skewX(-2deg);} }
  `,
  spinning_earth: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#0d1b2a; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #415a77; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#1b263b; position:relative; overflow:visible; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .art-container::after { content:'🌍'; position:absolute; top:-12px; right:-12px; font-size:22px; animation:earthSpin 6s linear infinite; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#e0e1dd; }
    .artist { color:#778da9; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#778da9; font-family:monospace; }
    .bar { flex:1; height:6px; background:#1b263b; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#e0e1dd; width:0%; transition:width 0.1s linear; }
    @keyframes earthSpin { 100% { transform:rotate(360deg); } }
  `,
  flying_bird: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#edf6f9; color:#2b2d42; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; border:2px solid #8d99ae; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#e2eafc; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#2b2d42; }
    .artist { color:#8d99ae; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#8d99ae; font-family:monospace; }
    .bar { flex:1; height:6px; background:#e2eafc; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#2b2d42; width:0%; transition:width 0.1s linear; position:relative; overflow:visible; }
    .progress::after { content:'🐦'; position:absolute; right:-10px; top:-16px; font-size:16px; animation:birdFlap 0.6s ease-in-out infinite alternate; }
    @keyframes birdFlap { 0% { transform:translateY(0) scaleY(0.8); } 100% { transform:translateY(-4px) scaleY(1.1); } }
  `,
  rocket_launch: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#020205; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #e63946; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:12px; background:#1d3557; }
    img { width:100%; height:100%; border-radius:10px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#e63946; }
    .artist { color:#a8dadc; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#a8dadc; font-family:monospace; }
    .bar { flex:1; height:6px; background:#1d3557; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#e63946; width:0%; transition:width 0.1s linear; position:relative; overflow:visible; }
    .progress::after { content:'🚀'; position:absolute; right:-14px; top:-16px; font-size:16px; animation:rocketShake 0.15s infinite; }
    @keyframes rocketShake { 0%{ transform:translateY(0); } 100%{ transform:translateY(-2px); } }
  `,
  bouncing_soccer: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#2d5a27; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #57cc99; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; border:2px solid #fff; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#fff; }
    .artist { color:#c7f9cc; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#c7f9cc; font-family:monospace; }
    .bar { flex:1; height:6px; background:#133c10; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#57cc99; width:0%; transition:width 0.1s linear; position:relative; overflow:visible; }
    .progress::after { content:'⚽'; position:absolute; right:-10px; top:-16px; font-size:16px; animation:soccerBounce 0.6s infinite alternate; }
    @keyframes soccerBounce { 0% { transform:translateY(0) rotate(0deg); } 100% { transform:translateY(-8px) rotate(180deg); } }
  `,
  dancing_cat: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#ffe8d6; color:#6b705c; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #cb997e; position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#cb997e; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#a5a58d; }
    .artist { color:#cb997e; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#cb997e; font-family:monospace; }
    .bar { flex:1; height:6px; background:#ddbea9; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#cb997e; width:0%; transition:width 0.1s linear; }
    .card::before { content:'🐱'; position:absolute; right:15px; top:12px; font-size:22px; animation:catDanceHead 0.5s infinite alternate; }
    @keyframes catDanceHead { 0%{ transform:rotate(-15deg); } 100%{ transform:rotate(15deg); } }
  `,
  pixel_heart: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Courier New',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000; color:#fff; display:flex; padding:16px; border:3px solid #ff003c; align-items:center; gap:16px; position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:2px solid #ff003c; background:#111; }
    img { width:100%; height:100%; object-fit:cover; image-rendering:pixelated; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:bold; color:#ff003c; }
    .artist { color:#ff809b; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ff809b; }
    .bar { flex:1; height:8px; background:#33000b; border:1px solid #ff003c; }
    .progress { height:100%; background:#ff003c; width:0%; transition:width 0.1s linear; }
    .card::before { content:'❤️'; position:absolute; right:15px; top:12px; font-size:20px; animation:pixelPulse 0.6s infinite alternate step-end; }
    @keyframes pixelPulse { 0%{transform:scale(0.9);} 100%{transform:scale(1.25);} }
  `,
  vaporwave_sun: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#1d1a39; color:#fff; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:2px solid #ff71ce; box-shadow:0 0 15px rgba(255,113,206,0.3); }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; background:#000; border:1px solid #05ffc9; }
    img { width:100%; height:100%; border-radius:2px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; position:relative; }
    .title { font-size:19px; font-weight:800; color:#ff71ce; text-shadow:0 0 5px #ff71ce; }
    .artist { color:#01cdfe; font-size:14px; margin-bottom:10px; font-weight:700; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#01cdfe; font-family:monospace; }
    .bar { flex:1; height:6px; background:#051630; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff71ce,#01cdfe); width:0%; transition:width 0.1s linear; }
    .info::before { content:'🌅'; position:absolute; right:0; top:0; font-size:22px; animation:sunPulse 2s infinite alternate; }
    @keyframes sunPulse { 0% { opacity:0.5; transform:scale(0.9); } 100% { opacity:1; transform:scale(1.15); } }
  `,
  glitch_matrix: `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Courier New',monospace; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#000; color:#00ff66; display:flex; padding:16px; border:2px solid #00ff66; align-items:center; gap:16px; position:relative; animation:matrixGlitch 4s infinite step-end; }
    .art-container { width:76px; height:76px; flex-shrink:0; border:1px solid #00ff66; }
    img { width:100%; height:100%; object-fit:cover; filter:matrix(2) contrast(1.5) hue-rotate(90deg); }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:18px; font-weight:bold; color:#00ff66; text-shadow:0 0 5px #00ff66; }
    .artist { color:#009933; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; }
    .bar { flex:1; height:6px; background:#001a07; overflow:hidden; }
    .progress { height:100%; background:#00ff66; width:0%; transition:width 0.1s linear; }
    @keyframes matrixGlitch { 0%,100%{border-color:#00ff66;} 90%{border-color:#ff003c; transform:skewX(3deg);} 93%{border-color:#00ffff; transform:skewX(-3deg);} }
  `,
  equalizer_wave: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#121214; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #5856d6; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:12px; background:#000; border:1px solid #5856d6; }
    img { width:100%; height:100%; border-radius:10px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; position:relative; }
    .title { font-size:19px; font-weight:700; color:#5856d6; }
    .artist { color:#8e8e93; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#8e8e93; font-family:monospace; }
    .bar { flex:1; height:6px; background:#1c1c1e; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#5856d6; width:0%; transition:width 0.1s linear; }
    .info::before { content:'〰️'; position:absolute; right:0; top:0; font-size:24px; color:#5856d6; animation:waveUndulate 0.8s infinite alternate; }
    @keyframes waveUndulate { 0%{transform:scale(0.85) rotate(-5deg);} 100%{transform:scale(1.15) rotate(5deg);} }
  `,
  party_popper: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#3d0066; color:#fff; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; border:2px solid #ff00aa; position:relative; overflow:hidden; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; border:2px solid #ff00aa; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#ff00aa; }
    .artist { color:#ffaae6; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ffaae6; font-family:monospace; }
    .bar { flex:1; height:6px; background:#1c0030; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:linear-gradient(90deg,#ff00aa,#ffaae6); width:0%; transition:width 0.1s linear; }
    .card::before { content:'🎉'; position:absolute; right:12px; top:12px; font-size:22px; animation:popperPop 1.5s infinite; }
    @keyframes popperPop { 0% { transform:scale(1) rotate(0deg); opacity:1;} 50% { transform:scale(1.3) rotate(15deg); opacity:0.8;} 100% { transform:scale(1) rotate(0deg); opacity:1;} }
  `,
  hourglass: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#2b221a; color:#fff; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:2px solid #d4a373; position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:6px; background:#000; }
    img { width:100%; height:100%; border-radius:4px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#d4a373; }
    .artist { color:#e3d5ca; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#e3d5ca; font-family:monospace; }
    .bar { flex:1; height:6px; background:#1c1611; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#d4a373; width:0%; transition:width 0.1s linear; }
    .card::before { content:'⏳'; position:absolute; right:15px; top:12px; font-size:20px; animation:hourglassTick 2s steps(2) infinite; }
    @keyframes hourglassTick { 0%,100%{transform:rotate(0deg);} 50%{transform:rotate(180deg);} }
  `,
  spinning_star: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#03031c; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #ffd700; box-shadow:0 0 15px rgba(255,215,0,0.3); position:relative; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; border:2px solid #ffd700; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#ffd700; }
    .artist { color:#fffdf0; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#fffdf0; font-family:monospace; }
    .bar { flex:1; height:6px; background:#0a0a29; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ffd700; width:0%; transition:width 0.1s linear; }
    .card::before { content:'⭐'; position:absolute; right:15px; top:12px; font-size:22px; animation:starSpin 4s linear infinite; }
    @keyframes starSpin { 100% { transform:rotate(360deg); } }
  `,
  floating_balloon: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#fff5f5; color:#4a1c1c; display:flex; padding:16px; border-radius:24px; align-items:center; gap:16px; border:2px solid #ffa8a8; position:relative; overflow:visible; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:50%; background:#000; border:2px solid #ff8787; }
    img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#e03131; }
    .artist { color:#ff8787; font-size:14px; margin-bottom:10px; font-weight:700; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ff8787; font-family:monospace; }
    .bar { flex:1; height:6px; background:#ffe3e3; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ff8787; width:0%; transition:width 0.1s linear; }
    .card::before { content:'🎈'; position:absolute; right:20px; top:-25px; font-size:24px; animation:balloonFloat 2.5s ease-in-out infinite alternate; }
    @keyframes balloonFloat { 0%{transform:translateY(0) rotate(-5deg);} 100%{transform:translateY(-8px) rotate(5deg);} }
  `,
  running_ninja: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#111; color:#fff; display:flex; padding:16px; border-radius:12px; align-items:center; gap:16px; border:2px solid #555; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:4px; background:#000; border:1px solid #ff3e3e; }
    img { width:100%; height:100%; border-radius:2px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:700; color:#fff; }
    .artist { color:#ff3e3e; font-size:14px; margin-bottom:10px; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#ff3e3e; font-family:monospace; }
    .bar { flex:1; height:6px; background:#222; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ff3e3e; width:0%; transition:width 0.1s linear; position:relative; overflow:visible; }
    .progress::after { content:'🥷'; position:absolute; right:-10px; top:-16px; font-size:16px; animation:ninjaRun 0.4s linear infinite; }
    @keyframes ninjaRun { 0%{ transform:translateY(0) skewX(-10deg); } 100%{ transform:translateY(-1px) skewX(-10deg); } }
  `,
  lightning_strike: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:transparent; font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; overflow:hidden; }
    .card { width:450px; min-height:110px; background:#05001a; color:#fff; display:flex; padding:16px; border-radius:16px; align-items:center; gap:16px; border:2px solid #ffd700; box-shadow:0 0 15px rgba(255,215,0,0.3); animation:lightningFlash 5s infinite; }
    .art-container { width:76px; height:76px; flex-shrink:0; border-radius:14px; background:#000; }
    img { width:100%; height:100%; border-radius:12px; object-fit:cover; }
    .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
    .title { font-size:19px; font-weight:900; color:#ffd700; text-shadow:0 0 8px #ffd700; }
    .artist { color:#e0b0ff; font-size:14px; margin-bottom:10px; font-weight:700; }
    .progress-container { display:flex; align-items:center; gap:12px; }
    .time { font-size:12px; color:#e0b0ff; font-family:monospace; }
    .bar { flex:1; height:6px; background:#0d0033; border-radius:999px; overflow:hidden; }
    .progress { height:100%; background:#ffd700; width:0%; transition:width 0.1s linear; }
    @keyframes lightningFlash { 0%,90%,100%{background:#05001a; box-shadow:0 0 15px rgba(255,215,0,0.3);} 91%,94%{background:#fff; box-shadow:0 0 35px #fff;} 92%,95%{background:#05001a;} }
  `
};

// Base HTML
const OVERLAY_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spotify Overlay</title>
<style>
/* THEME_STYLE_PLACEHOLDER */
</style>
</head>
<body>
<div class="card hidden" id="card">
<div class="art-container"><img id="albumArt" src="" /></div>
<div class="info">
<div class="title-container"><div class="title" id="trackTitle"></div></div>
<div class="artist-container"><div class="artist" id="trackArtist"></div></div>
<div class="progress-container">
<span class="time" id="currentTime">0:00</span>
<div class="bar"><div class="progress" id="progressBar"></div></div>
<span class="time" id="totalTime">0:00</span>
</div>
</div>
</div>
<script>
(function(){
"use strict";
var songTitle="",simMs=0,totalMs=1,playing=false,lastTime=Date.now();
var typeTimers=[];

function fmt(ms){
 if(!ms||isNaN(ms))return"0:00";
 var t=Math.floor(ms/1000);
 return Math.floor(t/60)+":"+(t%60<10?"0":"")+t%60;
}

function typeIt(el,txt,spd){
 if(!el)return;
 el.classList.remove("typing-done");
 el.classList.add("typing-caret");
 el.innerHTML="";
 var i=0;
 (function w(){
  if(i<txt.length){el.innerHTML=txt.substring(0,i+1);i++;typeTimers.push(setTimeout(w,spd))}
  else{el.classList.add("typing-done");el.classList.remove("typing-caret")}
 })();
}

function killType(){typeTimers.forEach(function(t){clearTimeout(t)});typeTimers=[]}

function upd(d){
 var card=document.getElementById("card");
 if(!card)return;

 // No media session at all -> hide and clear
 if(!d||!d.title){
  if(!card.classList.contains("hidden"))card.classList.add("hidden");
  songTitle="";playing=false;return;
 }

 // Paused -> just hide, keep title for resume
 if(!d.isPlaying){
  if(!card.classList.contains("hidden"))card.classList.add("hidden");
  playing=false;return;
 }

 // Playing -> show
 if(card.classList.contains("hidden"))card.classList.remove("hidden");

 totalMs=d.duration_ms||1;
 playing=true;

 if(Math.abs(simMs-(d.progress_ms||0))>2000)simMs=d.progress_ms||0;
 lastTime=Date.now();

 var art=document.getElementById("albumArt");
 var src=d.albumArt||'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231a2a6c%22%2F%3E%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%23b21f1f%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23fdbb2d%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23g)%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2260%25%22%20font-size%3D%2245%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%3E🎵%3C%2Ftext%3E%3C%2Fsvg%3E';
 if(art){
  var old=art.getAttribute("src");
  if(src&&src!==old){
   art.style.opacity="0";
   setTimeout(function(){art.setAttribute("src",src);art.style.opacity="1"},300);
  }
  art.classList.remove("paused");
 }

 // Dynamically apply Split Bleed blurred background if selected
 if(card.style.backgroundImage !== undefined) {
   if (src && (card.style.backgroundImage.indexOf("linear-gradient") !== -1 || d.theme === "split_bleed")) {
     card.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(" + src + ")";
   }
 }

 if(songTitle!==d.title){
  songTitle=d.title;
  simMs=d.progress_ms||0;
  var app=(d.app||"Spotify").replace(".exe","");
  killType();
  typeIt(document.getElementById("trackTitle"),d.title,35);
  setTimeout(function(){typeIt(document.getElementById("trackArtist"),d.artist+" \\u2022 "+app,20)},400);
  var tl=document.getElementById("totalTime");
  if(tl)tl.innerText=fmt(d.duration_ms);
 }
}

function tick(){
 if(!songTitle||!playing)return;
 var n=Date.now();
 simMs+=n-lastTime;
 lastTime=n;
 if(simMs>totalMs)simMs=totalMs;
 var p=(simMs/totalMs)*100;
 var b=document.getElementById("progressBar");
 var c=document.getElementById("currentTime");
 if(b)b.style.width=p+"%";
 if(c)c.innerText=fmt(simMs);
}

function conn(){
 var es=new EventSource("http://"+(location.hostname||"localhost")+":9274/events");
 es.addEventListener("media",function(e){try{upd(JSON.parse(e.data))}catch(ex){}});
 es.addEventListener("reload",function(e){
  console.log("🔄 Recibido evento de recarga, recargando página...");
  location.reload();
 });
 es.onerror=function(){es.close();setTimeout(conn,1000)};
}
conn();
setInterval(tick,100);
})();
</script>
</body>
</html>`;

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// Serve overlay HTML dynamically based on config.json
app.get(['/', '/overlay', '/index.html'], (req, res) => {
  let theme = 'glassmorphism';
  
  try {
    const configPath = path.join(path.dirname(process.execPath), 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (configData.theme && THEME_STYLES[configData.theme]) {
        theme = configData.theme;
      }
    }
  } catch (err) {
    console.error("⚠️ Error al leer config.json (usando predeterminado):", err.message);
  }

  const activeCss = THEME_STYLES[theme] || THEME_STYLES['glassmorphism'];
  
  // Inject theme name into state object for client js to check
  let finalHtml = OVERLAY_HTML_TEMPLATE.replace('/* THEME_STYLE_PLACEHOLDER */', activeCss);
  // Add a small helper so client script knows the active theme
  if(theme === "split_bleed") {
    finalHtml = finalHtml.replace('d.theme === "split_bleed"', 'true');
  }
  res.type('html').send(finalHtml);
});

// Serve preview mockup page with 100% accurate rendering of selected theme
app.get('/preview', (req, res) => {
  const theme = req.query.theme || 'glassmorphism';
  const activeCss = THEME_STYLES[theme] || THEME_STYLES['glassmorphism'];
  
  let finalHtml = OVERLAY_HTML_TEMPLATE.replace('/* THEME_STYLE_PLACEHOLDER */', activeCss);
  
  const mockAlbumArt = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231a2a6c%22%2F%3E%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%23b21f1f%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23fdbb2d%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23g)%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2260%25%22%20font-size%3D%2245%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%3E🎵%3C%2Ftext%3E%3C%2Fsvg%3E';
  
  const scriptOverride = `
    setTimeout(function() {
      upd({
        title: "Give My Heart",
        artist: "KAYA!",
        app: "Spotify",
        albumArt: "${mockAlbumArt}",
        progress_ms: 38000,
        duration_ms: 110000,
        isPlaying: true,
        theme: "${theme}"
      });
    }, 100);
  `;
  
  finalHtml = finalHtml.replace('conn();', scriptOverride);
  
  if (theme === "split_bleed" || theme === "split_bleed") {
    finalHtml = finalHtml.replace('d.theme === "split_bleed"', 'true');
  }

  res.type('html').send(finalHtml);
});

// API endpoint to change the theme dynamically and force reload on connected browsers
app.get('/api/set-theme', (req, res) => {
  const newTheme = req.query.theme;
  if (newTheme && THEME_STYLES[newTheme]) {
    try {
      const configPath = path.join(path.dirname(process.execPath), 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ theme: newTheme }, null, 2), 'utf8');
      
      console.log(`✨ Tema cambiado a: ${newTheme}. Recargando ${activeClients.length} clientes...`);
      
      // Notify all connected browsers to reload immediately!
      activeClients.forEach(client => {
        client.write(`event: reload\ndata: ${newTheme}\n\n`);
      });
      
      return res.json({ success: true, theme: newTheme });
    } catch (err) {
      console.error("❌ Error al escribir config.json desde API:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }
  res.status(400).json({ error: "Invalid theme" });
});

const { exec } = require('child_process');
let lastProcessTrack = null;

function checkSpotifyProcessFallback() {
  exec('tasklist /v /fi "IMAGENAME eq Spotify.exe" /fo csv', { windowsHide: true }, (err, stdout, stderr) => {
    if (err || !stdout) return;
    const lines = stdout.split('\n');
    let trackTitle = null;
    for (let line of lines) {
      const fields = line.split('","');
      if (fields.length > 8) {
        let winTitle = fields[8].replace(/"$/, '').trim();
        if (winTitle && winTitle !== 'N/D' && winTitle !== 'OleMainThreadWndName' && winTitle !== 'Spotify' && winTitle !== 'Spotify Free' && winTitle !== 'Spotify Premium' && winTitle !== 'Spotify Unlimited') {
          trackTitle = winTitle;
          break;
        }
      }
    }
    if (trackTitle) {
      const parts = trackTitle.split(' - ');
      let artist = 'Spotify';
      let title = trackTitle;
      if (parts.length > 1) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
      lastProcessTrack = {
        title: title,
        artist: artist,
        progress_ms: 30000,
        duration_ms: 180000,
        isPlaying: true,
        app: 'Spotify'
      };
    } else {
      lastProcessTrack = null;
    }
  });
}

// Start polling process title every 2 seconds
setInterval(checkSpotifyProcessFallback, 2000);
checkSpotifyProcessFallback();

// API endpoint for current media
app.get('/api/now-playing', (req, res) => {
  const sessions = smtc.sessions;
  let trackData = null;

  if (sessions && sessions.length > 0) {
    let session = sessions.find(s => s.sourceAppId.toLowerCase().includes('spotify')) || sessions[0];
    if (session && session.media && session.media.title) {
      const isPlaying = session.playback.playbackStatus === 4;
      let forcePlay = isPlaying;
      if (!isPlaying && lastProcessTrack && session.sourceAppId.toLowerCase().includes('spotify')) {
        forcePlay = true;
      }
      trackData = {
        title: session.media.title || 'Unknown',
        artist: session.media.artist || 'Unknown',
        albumArt: session.media.thumbnail ? `data:image/png;base64,${session.media.thumbnail.toString('base64')}` : '',
        progress_ms: (session.timeline.position || 0) * 1000,
        duration_ms: (session.timeline.duration || 1) * 1000,
        isPlaying: forcePlay,
        app: session.sourceAppId
      };
    }
  }

  if (!trackData && lastProcessTrack) {
    trackData = {
      title: lastProcessTrack.title,
      artist: lastProcessTrack.artist,
      albumArt: '',
      progress_ms: lastProcessTrack.progress_ms,
      duration_ms: lastProcessTrack.duration_ms,
      isPlaying: true,
      app: 'Spotify'
    };
  }

  res.json(trackData || {});
});

// SSE endpoint
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  activeClients.push(res);

  const interval = setInterval(() => {
    let json = '{}';
    const sessions = smtc.sessions;
    let trackData = null;

    if (sessions && sessions.length > 0) {
      let session = sessions.find(s => s.sourceAppId.toLowerCase().includes('spotify')) || sessions[0];
      if (session && session.media && session.media.title) {
        const isPlaying = session.playback.playbackStatus === 4;
        let forcePlay = isPlaying;
        if (!isPlaying && lastProcessTrack && session.sourceAppId.toLowerCase().includes('spotify')) {
          forcePlay = true;
        }
        trackData = {
          title: session.media.title || 'Unknown',
          artist: session.media.artist || 'Unknown',
          albumArt: session.media.thumbnail ? `data:image/png;base64,${session.media.thumbnail.toString('base64')}` : '',
          progress_ms: (session.timeline.position || 0) * 1000,
          duration_ms: (session.timeline.duration || 1) * 1000,
          isPlaying: forcePlay,
          app: session.sourceAppId
        };
      }
    }

    if (!trackData && lastProcessTrack) {
      trackData = {
        title: lastProcessTrack.title,
        artist: lastProcessTrack.artist,
        albumArt: '',
        progress_ms: lastProcessTrack.progress_ms,
        duration_ms: lastProcessTrack.duration_ms,
        isPlaying: true,
        app: 'Spotify'
      };
    }

    if (trackData) {
      json = JSON.stringify(trackData);
    }

    // Always send an event (even empty {}) so the browser updates/hides
    if (json !== lastMediaJson) {
      lastMediaJson = json;
      res.write(`event: media\ndata: ${json}\n\n`);
    }
  }, 200);

  req.on('close', () => {
    clearInterval(interval);
    activeClients = activeClients.filter(c => c !== res);
  });
});

// Start
app.listen(PORT, () => {
  console.log(`✅ Spotify Overlay server running on http://localhost:${PORT}`);
  console.log(`📌 Add Browser source in OBS with URL: http://localhost:${PORT}/`);
});
