// LUMEN — sound. One job: every noise the game makes, synthesized
// with WebAudio so the game ships no audio files at all.
//
// Nothing here runs until the player first interacts with the page
// (browsers block audio before that), and every call is safe when
// audio is muted or unavailable.

import { SOUND_KEY } from './config.js';

const NOTES = {
  click: 660,
  rotate: 520,
  lit: 880,
  undo: 420,
  win: [523.25, 659.25, 783.99, 1046.5],
  star: 1174.66,
};

export function createAudio() {
  let context = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem(SOUND_KEY) === 'off';
  } catch {
    muted = false;
  }

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  // A short tone with a fast decay: `when` delays it in seconds.
  function tone(frequency, seconds, type, gainValue, when = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime + when;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  return {
    get muted() {
      return muted;
    },
    toggleMuted() {
      muted = !muted;
      try {
        window.localStorage.setItem(SOUND_KEY, muted ? 'off' : 'on');
      } catch {
        // Storage can be off: the mute then lasts this visit only.
      }
      return muted;
    },
    /** Unlock audio on the first gesture; call from any pointer/key handler. */
    unlock() {
      ensure();
    },
    click() {
      tone(NOTES.click, 0.07, 'sine', 0.12);
    },
    rotate() {
      tone(NOTES.rotate, 0.09, 'triangle', 0.14);
      tone(NOTES.rotate * 1.5, 0.06, 'sine', 0.06, 0.02);
    },
    undo() {
      tone(NOTES.undo, 0.1, 'triangle', 0.1);
    },
    lit() {
      tone(NOTES.lit, 0.35, 'sine', 0.12);
      tone(NOTES.lit * 1.5, 0.3, 'sine', 0.07, 0.05);
    },
    win() {
      NOTES.win.forEach((frequency, index) => {
        tone(frequency, 0.5, 'triangle', 0.14, index * 0.09);
      });
    },
    star() {
      tone(NOTES.star, 0.4, 'sine', 0.1);
    },
  };
}
