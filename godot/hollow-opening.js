(() => {
  const dialog = document.querySelector('#hollow-opening');
  const video = dialog.querySelector('video');
  const skip = dialog.querySelector('[data-skip]');
  const play = dialog.querySelector('[data-play]');
  const toggle = dialog.querySelector('[data-toggle]');
  const captions = dialog.querySelector('[data-captions]');
  const progress = dialog.querySelector('#opening-progress');
  const time = dialog.querySelector('[data-time]');
  const track = video.querySelector('track').track;
  const canvas = document.querySelector('#canvas');
  let showing = false;

  const formatTime = (seconds) => {
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  };

  const updatePosition = () => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    progress.value = duration > 0 ? video.currentTime / duration : 0;
    time.textContent = duration > 0
      ? `${formatTime(video.currentTime)} / ${formatTime(duration)}`
      : formatTime(video.currentTime);
  };

  window.hollowPlayOpening = (onFinish, volume) => {
    if (showing || typeof dialog.showModal !== 'function') return false;
    try {
      dialog.showModal();
    } catch {
      return false;
    }
    showing = true;
    const events = new AbortController();
    const { signal } = events;
    let timeout;
    let pausedByPlayer = false;

    const finish = () => {
      if (signal.aborted) return;
      events.abort();
      clearTimeout(timeout);
      showing = false;
      video.pause();
      video.removeAttribute('src');
      video.load();
      dialog.close();
      canvas.focus({ preventScroll: true });
      onFinish();
    };

    const armTimeout = () => {
      clearTimeout(timeout);
      if (!pausedByPlayer) timeout = setTimeout(finish, 15000);
    };

    const offerPlay = () => {
      clearTimeout(timeout);
      toggle.hidden = true;
      play.hidden = false;
      play.focus({ preventScroll: true });
    };

    const start = () => {
      pausedByPlayer = false;
      play.hidden = true;
      armTimeout();
      video.play().catch((error) => {
        if (signal.aborted) return;
        if (error.name === 'NotAllowedError') offerPlay();
        else finish();
      });
    };

    const togglePlayback = () => {
      if (pausedByPlayer) {
        start();
        return;
      }
      pausedByPlayer = true;
      clearTimeout(timeout);
      video.pause();
      toggle.textContent = 'Resume';
    };

    skip.addEventListener('click', finish, { signal });
    play.addEventListener('click', () => {
      dialog.focus({ preventScroll: true });
      start();
    }, { signal });
    toggle.addEventListener('click', togglePlayback, { signal });
    captions.addEventListener('click', () => {
      const enabled = track.mode !== 'showing';
      track.mode = enabled ? 'showing' : 'disabled';
      captions.setAttribute('aria-pressed', String(enabled));
    }, { signal });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish();
    }, { signal });
    dialog.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (!toggle.hidden && event.code === 'Space' && (event.target === dialog || event.target === video)) {
        event.preventDefault();
        if (!event.repeat) togglePlayback();
      }
    }, { signal });
    video.addEventListener('ended', finish, { signal });
    video.addEventListener('error', finish, { signal });
    video.addEventListener('loadedmetadata', updatePosition, { signal });
    video.addEventListener('timeupdate', updatePosition, { signal });
    video.addEventListener('waiting', armTimeout, { signal });
    video.addEventListener('playing', () => {
      clearTimeout(timeout);
      play.hidden = true;
      toggle.hidden = false;
      toggle.textContent = 'Pause';
    }, { signal });
    video.addEventListener('pause', () => {
      if (!pausedByPlayer && !video.ended && video.currentTime > 0) offerPlay();
    }, { signal });

    toggle.hidden = true;
    dialog.focus({ preventScroll: true });
    progress.value = 0;
    time.textContent = '0:00';
    video.volume = Math.max(0, Math.min(1, Number(volume)));
    video.muted = video.volume === 0;
    video.src = 'hollow-opening-v1.mp4';
    start();
    return true;
  };
})();
