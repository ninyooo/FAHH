(() => {
  const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;
  const CHECK_INTERVAL_MS = 1000;
  const CONFIRM_PHRASE = "i promise not to doomscroll uwu";
  const REQUIRED_CONFIRMATIONS = 3;
  const ACTIVITY_EVENTS = [
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "wheel",
    "touchstart",
  ];

  let globalLastActivity = Date.now();
  let overlayVisible = false;
  let confirmCount = 0;
  let audio = null;
  let overlayEl = null;
  let port = null;

  function connectPort() {
    try {
      port = chrome.runtime.connect({ name: "fahh" });
      port.onMessage.addListener((msg) => {
        if (msg.type === "lastActivity" && msg.value > globalLastActivity) {
          globalLastActivity = msg.value;
        }
      });
      port.onDisconnect.addListener(() => {
        port = null;
      });
    } catch (e) {
      port = null;
    }
  }

  connectPort();

  function onActivity() {
    if (overlayVisible) return;
    globalLastActivity = Date.now();
    if (port) {
      try {
        port.postMessage({ type: "activity" });
      } catch (e) {
        port = null;
      }
    }
  }

  function checkInactivity() {
    if (overlayVisible) return;
    if (!port) connectPort();
    if (Date.now() - globalLastActivity >= INACTIVITY_THRESHOLD_MS) {
      showOverlay();
    }
  }

  function promptText() {
    return `type "${CONFIRM_PHRASE}" ${REQUIRED_CONFIRMATIONS} times to continue (${confirmCount}/${REQUIRED_CONFIRMATIONS})`;
  }

  function showOverlay() {
    overlayVisible = true;
    confirmCount = 0;

    overlayEl = document.createElement("div");
    overlayEl.id = "fahh-overlay";

    const img = document.createElement("img");
    img.id = "fahh-image";
    img.src = chrome.runtime.getURL("assets/fahh.png");

    const prompt = document.createElement("p");
    prompt.id = "fahh-prompt";
    prompt.textContent = promptText();

    const input = document.createElement("input");
    input.id = "fahh-input";
    input.type = "text";
    input.autocomplete = "off";
    input.placeholder = CONFIRM_PHRASE;

    const error = document.createElement("p");
    error.id = "fahh-error";

    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        handleSubmit(input, prompt, error);
      }
    });

    overlayEl.append(img, prompt, input, error);
    document.documentElement.appendChild(overlayEl);
    document.body.style.overflow = "hidden";
    input.focus();

    audio = new Audio(chrome.runtime.getURL("assets/fahh.mp3"));
    audio.loop = true;
    audio
      .play()
      .then(() => boostVolume(audio, 2.0))
      .catch(() => {});
  }

  function boostVolume(audioEl, multiplier) {
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audioEl);
    const gain = ctx.createGain();
    gain.gain.value = multiplier;
    source.connect(gain).connect(ctx.destination);
  }

  function handleSubmit(input, prompt, error) {
    const value = input.value.trim().toLowerCase();
    input.value = "";
    if (value === CONFIRM_PHRASE) {
      confirmCount++;
      error.textContent = "";
      if (confirmCount >= REQUIRED_CONFIRMATIONS) {
        hideOverlay();
      } else {
        prompt.textContent = promptText();
      }
    } else {
      error.textContent = "NUH UH YOU IDIOT SANDWICH — try again.";
    }
  }

  function hideOverlay() {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio = null;
    }
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    document.body.style.overflow = "";
    overlayVisible = false;
    globalLastActivity = Date.now();
  }

  ACTIVITY_EVENTS.forEach((evt) =>
    document.addEventListener(evt, onActivity, { passive: true }),
  );
  setInterval(checkInactivity, CHECK_INTERVAL_MS);
})();
