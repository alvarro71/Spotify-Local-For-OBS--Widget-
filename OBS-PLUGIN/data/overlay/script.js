(function() {
  'use strict';

  let currentTitle = '';
  let simulatedProgressMs = 0;
  let actualDurationMs = 1;
  let isPlaying = false;
  let lastUpdateTime = Date.now();

  function formatTime(ms) {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  function updateCard(data) {
    const card = document.getElementById('card');
    if (!card) return;

    if (!data || !data.title) {
      if (!card.classList.contains('hidden')) card.classList.add('hidden');
      currentTitle = '';
      isPlaying = false;
      return;
    }

    actualDurationMs = data.duration_ms || 1;
    isPlaying = data.isPlaying || false;

    if (!isPlaying) {
      if (!card.classList.contains('hidden')) card.classList.add('hidden');
    } else {
      if (card.classList.contains('hidden')) card.classList.remove('hidden');
    }

    if (Math.abs(simulatedProgressMs - data.progress_ms) > 2000) {
      simulatedProgressMs = data.progress_ms;
    }
    lastUpdateTime = Date.now();

    const albumArt = document.getElementById('albumArt');
    if (albumArt) {
      const artSrc = data.albumArt || '';
      if (artSrc && albumArt.getAttribute('src') !== artSrc) {
        albumArt.setAttribute('src', artSrc);
      }
      if (isPlaying) albumArt.classList.remove('paused');
      else albumArt.classList.add('paused');
    }

    if (currentTitle !== data.title) {
      currentTitle = data.title;
      simulatedProgressMs = data.progress_ms || 0;
      const appName = (data.app || 'Spotify').replace('.exe', '');

      const titleEl = document.getElementById('trackTitle');
      if (titleEl) titleEl.innerText = data.title;

      const artistEl = document.getElementById('trackArtist');
      if (artistEl) artistEl.innerText = data.artist + ' • ' + appName;

      const totalEl = document.getElementById('totalTime');
      if (totalEl) totalEl.innerText = formatTime(data.duration_ms);

      card.classList.remove('track-change');
      void card.offsetWidth;
      card.classList.add('track-change');
    } else {
      const totalEl = document.getElementById('totalTime');
      if (totalEl) totalEl.innerText = formatTime(data.duration_ms);
    }
  }

  function smoothUIUpdate() {
    if (!currentTitle) return;
    if (isPlaying) {
      const now = Date.now();
      simulatedProgressMs += now - lastUpdateTime;
      lastUpdateTime = now;
    } else {
      lastUpdateTime = Date.now();
    }
    if (simulatedProgressMs > actualDurationMs) simulatedProgressMs = actualDurationMs;

    const percent = (simulatedProgressMs / actualDurationMs) * 100;
    const bar = document.getElementById('progressBar');
    const cTime = document.getElementById('currentTime');
    if (bar) bar.style.width = percent + '%';
    if (cTime) cTime.innerText = formatTime(simulatedProgressMs);
  }

  function connectSSE() {
    const host = window.location.hostname || 'localhost';
    const port = '9274';
    const url = 'http://' + host + ':' + port + '/events';

    const source = new EventSource(url);

    source.addEventListener('media', function(e) {
      try {
        updateCard(JSON.parse(e.data));
      } catch(err) {
        console.error('Media parse error:', err);
      }
    });

    source.onerror = function() {
      source.close();
      setTimeout(connectSSE, 2000);
    };
  }

  connectSSE();
  setInterval(smoothUIUpdate, 100);
})();
