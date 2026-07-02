const express = require('express');
const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor');
const path = require('path');

const app = express();
const PORT = 9274;
const smtc = new SMTCMonitor();

// Track last state to detect changes
let lastMediaJson = '{}';
let lastWasPlaying = false;

// Overlay HTML - clean, responsive, with typing effect
const OVERLAY_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spotify Overlay</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;font-family:'Outfit',system-ui,sans-serif;display:flex;justify-content:center;padding-top:40px;overflow:hidden;height:100vh}
.card{width:450px;min-height:110px;background:rgba(15,15,20,0.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#fff;display:flex;padding:16px;border-radius:24px;align-items:center;gap:16px;box-shadow:0 10px 40px rgba(0,0,0,0.5),inset 0 1px 1px rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.05);transition:opacity 0.3s ease,transform 0.3s ease;opacity:1;transform:translateY(0) scale(1);overflow:hidden}
.card.hidden{opacity:0;transform:translateY(-40px) scale(0.9);pointer-events:none}
.art-container{width:76px;height:76px;flex-shrink:0;border-radius:50%;box-shadow:0 4px 15px rgba(0,0,0,0.6);background:#111}
img{width:100%;height:100%;border-radius:50%;object-fit:cover;animation:spin 6s linear infinite;transition:opacity 0.4s ease}
img.paused{animation-play-state:paused}
.info{flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:center}
.title-container,.artist-container{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.title{font-size:19px;font-weight:700;letter-spacing:0.3px;margin-bottom:2px;text-shadow:0 2px 4px rgba(0,0,0,0.5)}
.artist{opacity:0.8;font-size:14px;font-weight:400;margin-bottom:10px;text-shadow:0 1px 3px rgba(0,0,0,0.5)}
.progress-container{display:flex;align-items:center;gap:12px}
.time{font-size:12px;opacity:0.7;font-family:'Outfit',monospace;font-weight:600;min-width:35px;text-align:center}
.bar{flex:1;height:6px;background:rgba(255,255,255,0.15);border-radius:999px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.2)}
.progress{height:100%;background:linear-gradient(90deg,#1db954,#1ed760);width:0%;transition:width 0.1s linear;box-shadow:0 0 8px rgba(29,185,84,0.6)}
@keyframes spin{100%{transform:rotate(360deg)}}
.typing-caret::after{content:'\\258B';display:inline-block;margin-left:2px;animation:blink 0.6s step-end infinite;color:#1db954}
.typing-done::after{display:none}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
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
 if(art){
  var src=d.albumArt||"";
  var old=art.getAttribute("src");
  if(src&&src!==old){
   art.style.opacity="0";
   setTimeout(function(){art.setAttribute("src",src);art.style.opacity="1"},300);
  }
  art.classList.remove("paused");
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

// Serve overlay HTML
app.get(['/', '/overlay', '/index.html'], (req, res) => {
  res.type('html').send(OVERLAY_HTML);
});

// API endpoint
app.get('/api/now-playing', (req, res) => {
  const sessions = smtc.sessions;
  if (!sessions || sessions.length === 0) return res.json({});
  let session = sessions.find(s => s.sourceAppId.toLowerCase().includes('spotify')) || sessions[0];
  if (!session || !session.media) return res.json({});
  const isPlaying = session.playback.playbackStatus === 4;
  res.json({
    title: session.media.title || 'Unknown',
    artist: session.media.artist || 'Unknown',
    albumArt: session.media.thumbnail ? `data:image/png;base64,${session.media.thumbnail.toString('base64')}` : '',
    progress_ms: (session.timeline.position || 0) * 1000,
    duration_ms: (session.timeline.duration || 1) * 1000,
    isPlaying: isPlaying,
    app: session.sourceAppId
  });
});

// SSE endpoint
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const interval = setInterval(() => {
    let json = '{}';
    const sessions = smtc.sessions;
    if (sessions && sessions.length > 0) {
      let session = sessions.find(s => s.sourceAppId.toLowerCase().includes('spotify')) || sessions[0];
      if (session && session.media) {
        const isPlaying = session.playback.playbackStatus === 4;
        json = JSON.stringify({
          title: session.media.title || 'Unknown',
          artist: session.media.artist || 'Unknown',
          albumArt: session.media.thumbnail ? `data:image/png;base64,${session.media.thumbnail.toString('base64')}` : '',
          progress_ms: (session.timeline.position || 0) * 1000,
          duration_ms: (session.timeline.duration || 1) * 1000,
          isPlaying: isPlaying,
          app: session.sourceAppId
        });
      }
    }
    // Always send an event (even empty {}) so the browser updates/hides
    if (json !== lastMediaJson) {
      lastMediaJson = json;
      res.write(`event: media\ndata: ${json}\n\n`);
    }
  }, 200);

  req.on('close', () => clearInterval(interval));
});

// Start
app.listen(PORT, () => {
  console.log(`✅ Spotify Overlay server running on http://localhost:${PORT}`);
  console.log(`📌 Add Browser source in OBS with URL: http://localhost:${PORT}/`);
});
