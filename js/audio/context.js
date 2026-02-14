/**
 * Audio context management
 *
 * Handles AudioContext creation and warmup for low-latency playback.
 */

import { audioState } from '../state/index.js';

// Module-local click buffer for warmup
let warmupClickBuffer = null;

/**
 * Get or create the shared AudioContext
 * @returns {AudioContext} The application's AudioContext
 */
export function getAudioContext() {
    if (!audioState.context) {
        audioState.context = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioState.context;
}

/**
 * Warm up audio context to avoid first-play lag
 * Must be called from a user gesture (click, touch, keypress)
 * @returns {Promise<void>}
 */
export function warmUpAudio() {
    if (audioState.warmedUp) return Promise.resolve();

    const ctx = getAudioContext();

    // Resume if suspended (required by Chrome autoplay policy)
    const resumePromise = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();

    return resumePromise.then(() => {
        // Play a very short silent tone to prime the oscillator path
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, ctx.currentTime); // Silent
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.01);

        // Also prime the noise buffer path (used for click sounds)
        // Pre-create the click buffer
        const bufferSize = Math.floor(ctx.sampleRate * 0.02);
        warmupClickBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = warmupClickBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // Play a silent click to prime the buffer source path
        const noise = ctx.createBufferSource();
        noise.buffer = warmupClickBuffer;
        const silentGain = ctx.createGain();
        silentGain.gain.setValueAtTime(0, ctx.currentTime);
        noise.connect(silentGain);
        silentGain.connect(ctx.destination);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.01);

        audioState.warmedUp = true;
    });
}

/**
 * Set up first interaction listeners for audio warmup
 * Automatically warms up audio on first user click/touch/key
 */
export function setupAudioWarmupListeners() {
    function onFirstInteraction() {
        warmUpAudio();
        document.removeEventListener('click', onFirstInteraction);
        document.removeEventListener('touchstart', onFirstInteraction);
        document.removeEventListener('keydown', onFirstInteraction);
    }
    document.addEventListener('click', onFirstInteraction);
    document.addEventListener('touchstart', onFirstInteraction);
    document.addEventListener('keydown', onFirstInteraction);
}
