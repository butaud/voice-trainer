/**
 * Tone generation utilities
 *
 * Play reference tones with proper gain envelope and bass compensation.
 */

import { audioState } from '../state/index.js';
import { getAudioContext, warmUpAudio } from './context.js';

/**
 * Play a reference tone with the specified frequency
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds (default 1.5)
 * @param {Object} options - Optional callbacks
 * @param {Function} options.onComplete - Called when tone finishes playing
 * @param {Function} options.onStart - Called when tone starts playing
 * @returns {void}
 */
export function playTone(frequency, duration = 1.5, options = {}) {
    const { onComplete, onStart } = options;

    // Ensure audio is warmed up, then play
    warmUpAudio().then(() => {
        const ctx = getAudioContext();

        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        // Calculate volume with bass boost for lower frequencies
        // Lower notes need more gain to sound equally loud (equal-loudness compensation)
        const baseVolume = 0.9;
        const bassBoost = frequency < 250 ? (250 - frequency) / 250 * 0.5 : 0;
        const volume = Math.min(1.5, baseVolume + bassBoost);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + duration - 0.1);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);

        if (onStart) {
            onStart();
        }

        let timeoutId = null;
        if (onComplete) {
            timeoutId = setTimeout(onComplete, duration * 1000);
            // Store reference for stopping preview
            audioState.currentPreviewAudio = {
                oscillator,
                gainNode,
                timeoutId,
                stop: function() {
                    if (this.timeoutId) clearTimeout(this.timeoutId);
                    try {
                        this.gainNode.gain.cancelScheduledValues(ctx.currentTime);
                        this.gainNode.gain.setValueAtTime(0, ctx.currentTime);
                        this.oscillator.stop(ctx.currentTime + 0.01);
                    } catch (e) {
                        // Oscillator may have already stopped
                    }
                }
            };
        }
    });
}
