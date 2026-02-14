/**
 * Click sound utilities for metronome and countdown
 */

// Cached click buffer (created on first use)
let clickBuffer = null;

/**
 * Create or get the click sound buffer
 * @param {AudioContext} ctx - Audio context
 * @returns {AudioBuffer} Click sound buffer
 */
export function getClickBuffer(ctx) {
    if (clickBuffer && clickBuffer.sampleRate === ctx.sampleRate) {
        return clickBuffer;
    }

    // Create a short noise burst for a woodblock-like sound
    const bufferSize = Math.floor(ctx.sampleRate * 0.02); // 20ms of noise
    clickBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = clickBuffer.getChannelData(0);

    // Generate noise
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return clickBuffer;
}

/**
 * Create a single buffer containing 3 countdown clicks with silence between
 * @param {AudioContext} ctx - Audio context
 * @param {number} beatIntervalSec - Time between beats in seconds
 * @param {number} leadInSec - Lead-in silence before first click (default 0)
 * @returns {AudioBuffer} Buffer containing the countdown clicks
 */
export function createCountdownBuffer(ctx, beatIntervalSec, leadInSec = 0) {
    const sampleRate = ctx.sampleRate;
    const clickDuration = 0.02; // 20ms per click
    const clickSamples = Math.floor(sampleRate * clickDuration);
    const leadInSamples = Math.floor(sampleRate * leadInSec);

    // Total buffer length: lead-in + 3 beats (last click at beat 2, ends at ~beat 2 + click duration)
    const totalDuration = leadInSec + (2 * beatIntervalSec) + clickDuration;
    const totalSamples = Math.floor(sampleRate * totalDuration);

    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // Fill with silence first
    data.fill(0);

    // Add 3 clicks at the appropriate positions (after lead-in)
    for (let beat = 0; beat < 3; beat++) {
        const startSample = leadInSamples + Math.floor(beat * beatIntervalSec * sampleRate);

        // Generate noise for this click with decay envelope
        for (let i = 0; i < clickSamples && (startSample + i) < totalSamples; i++) {
            const noise = Math.random() * 2 - 1;
            // Apply decay envelope (starts at 0.6, decays to near 0)
            const envelope = 0.6 * Math.exp(-i / (sampleRate * 0.005)); // 5ms decay
            data[startSample + i] = noise * envelope;
        }
    }

    return buffer;
}
