(() => {
  if (window.__fahhLoaded) return;
  window.__fahhLoaded = true;

  class FahhApp {
    constructor(config) {
      this.config = config;
      this._lastActivity = Date.now();
      this._overlayVisible = false;
      this._confirmCount = 0;
      this._audio = null;
      this._overlayEl = null;
      this._checkTimer = null;
    }

    start() {
      this._bindEvents();
      this._startTimer();
    }

    destroy() {
      if (this._checkTimer) {
        clearInterval(this._checkTimer);
        this._checkTimer = null;
      }
      if (this._overlayVisible) this._hideOverlay();
    }

    _bindEvents() {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) this._onActivity();
      });
      window.addEventListener("focus", () => this._onActivity());
      this.config.activityEvents.forEach((evt) =>
        document.addEventListener(evt, () => this._onActivity(), { passive: true })
      );
    }

    _startTimer() {
      this._checkTimer = setInterval(
        () => this._checkInactivity(),
        this.config.checkInterval
      );
    }

    _onActivity() {
      if (this._overlayVisible) return;
      this._lastActivity = Date.now();
    }

    _checkInactivity() {
      if (this._overlayVisible || document.hidden) return;
      if (Date.now() - this._lastActivity >= this.config.threshold) {
        this._showOverlay();
      }
    }

    _promptText() {
      return `type "${this.config.confirmPhrase}" ${this.config.requiredConfirmations} times to continue (${this._confirmCount}/${this.config.requiredConfirmations})`;
    }

    _showOverlay() {
      this._overlayVisible = true;
      this._confirmCount = 0;

      this._overlayEl = document.createElement("div");
      this._overlayEl.id = "fahh-overlay";

      const img = document.createElement("img");
      img.id = "fahh-image";
      img.src = chrome.runtime.getURL(this.config.assets.image);

      const prompt = document.createElement("p");
      prompt.id = "fahh-prompt";
      prompt.textContent = this._promptText();

      const input = document.createElement("input");
      input.id = "fahh-input";
      input.type = "text";
      input.autocomplete = "off";
      input.placeholder = this.config.confirmPhrase;

      const error = document.createElement("p");
      error.id = "fahh-error";

      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          this._handleSubmit(input, prompt, error);
        }
      });

      this._overlayEl.append(img, prompt, input, error);
      document.documentElement.appendChild(this._overlayEl);
      document.body.style.overflow = "hidden";
      input.focus();

      this._playAudio();
    }

    _playAudio() {
      this._audio = new Audio(chrome.runtime.getURL(this.config.assets.audio));
      this._audio.loop = true;
      this._audio
        .play()
        .then(() => this._boostVolume(this._audio, this.config.audioBoost))
        .catch(() => {});
    }

    _boostVolume(audioEl, multiplier) {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioEl);
      const gain = ctx.createGain();
      gain.gain.value = multiplier;
      source.connect(gain).connect(ctx.destination);
    }

    _handleSubmit(input, prompt, error) {
      const value = input.value.trim().toLowerCase();
      input.value = "";
      if (value === this.config.confirmPhrase) {
        this._confirmCount++;
        error.textContent = "";
        if (this._confirmCount >= this.config.requiredConfirmations) {
          this._hideOverlay();
        } else {
          prompt.textContent = this._promptText();
        }
      } else {
        error.textContent = this.config.errorMessage;
      }
    }

    _hideOverlay() {
      this._stopAudio();
      if (this._overlayEl) {
        this._overlayEl.remove();
        this._overlayEl = null;
      }
      document.body.style.overflow = "";
      this._overlayVisible = false;
      this._lastActivity = Date.now();
    }

    _stopAudio() {
      if (this._audio) {
        this._audio.pause();
        this._audio.currentTime = 0;
        this._audio = null;
      }
    }
  }

  const app = new FahhApp({
    threshold: 5 * 1000,
    checkInterval: 1000,
    confirmPhrase: "i promise not to doomscroll",
    requiredConfirmations: 3,
    audioBoost: 2.0,
    errorMessage: "NUH UH YOU IDIOT SANDWICH — try again.",
    assets: {
      image: "assets/fahh.png",
      audio: "assets/fahh.mp3",
    },
    activityEvents: [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "wheel",
      "touchstart",
    ],
  });

  app.start();
})();
