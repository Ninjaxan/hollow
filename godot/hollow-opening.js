(() => {
  const dialog = document.querySelector('#hollow-opening');
  const video = dialog.querySelector('video');
  const skip = dialog.querySelector('[data-skip]');
  const play = dialog.querySelector('[data-play]');
  const captions = dialog.querySelector('[data-captions]');
  const track = video.querySelector('track').track;
  const canvas = document.querySelector('#canvas');
  let showing = false;

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
      timeout = setTimeout(finish, 15000);
    };

    const offerPlay = () => {
      clearTimeout(timeout);
      play.hidden = false;
      play.focus({ preventScroll: true });
    };

    const start = () => {
      play.hidden = true;
      armTimeout();
      video.play().catch((error) => {
        if (signal.aborted) return;
        if (error.name === 'NotAllowedError') offerPlay();
        else finish();
      });
    };

    skip.addEventListener('click', finish, { signal });
    play.addEventListener('click', start, { signal });
    captions.addEventListener('click', () => {
      const enabled = track.mode !== 'showing';
      track.mode = enabled ? 'showing' : 'disabled';
      captions.setAttribute('aria-pressed', String(enabled));
    }, { signal });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish();
    }, { signal });
    dialog.addEventListener('keydown', (event) => event.stopPropagation(), { signal });
    video.addEventListener('ended', finish, { signal });
    video.addEventListener('error', finish, { signal });
    video.addEventListener('waiting', armTimeout, { signal });
    video.addEventListener('playing', () => {
      clearTimeout(timeout);
      play.hidden = true;
    }, { signal });
    video.addEventListener('pause', () => {
      if (!video.ended && video.currentTime > 0) offerPlay();
    }, { signal });

    skip.focus({ preventScroll: true });
    video.volume = Math.max(0, Math.min(1, Number(volume)));
    video.muted = video.volume === 0;
    video.src = 'hollow-opening-v1.mp4';
    start();
    return true;
  };
})();
