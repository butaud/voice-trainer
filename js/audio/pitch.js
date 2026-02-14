/**
 * Pitch detection utilities
 *
 * Uses the YIN algorithm for accurate pitch detection from audio buffers.
 */

import { pitchDetection, PITCH_CONFIG } from '../state/index.js';

/**
 * YIN pitch detection algorithm
 * @param {Float32Array} buffer - Audio sample buffer
 * @param {number} sampleRate - Audio sample rate
 * @returns {number} Detected frequency in Hz, or -1 if no pitch detected
 */
export function detectPitch(buffer, sampleRate) {
    const SIZE = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);

    // Find RMS
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / SIZE);

    if (rms < 0.005) {
        return -1;
    }

    // Difference function
    const diff = new Float32Array(MAX_SAMPLES);
    for (let tau = 0; tau < MAX_SAMPLES; tau++) {
        let sum = 0;
        for (let i = 0; i < MAX_SAMPLES; i++) {
            const delta = buffer[i] - buffer[i + tau];
            sum += delta * delta;
        }
        diff[tau] = sum;
    }

    // Cumulative mean normalized difference
    const cmndf = new Float32Array(MAX_SAMPLES);
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < MAX_SAMPLES; tau++) {
        runningSum += diff[tau];
        cmndf[tau] = diff[tau] / (runningSum / tau);
    }

    // Find first minimum below threshold
    const threshold = 0.1;
    let tau = 2;

    while (tau < MAX_SAMPLES - 1 && cmndf[tau] >= threshold) {
        tau++;
    }

    while (tau < MAX_SAMPLES - 1 && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
    }

    if (tau >= MAX_SAMPLES - 1 || cmndf[tau] >= threshold) {
        return -1;
    }

    // Parabolic interpolation
    const s0 = cmndf[tau - 1];
    const s1 = cmndf[tau];
    const s2 = cmndf[tau + 1];
    const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));

    if (Math.abs(adjustment) < 1) {
        tau = tau + adjustment;
    }

    return sampleRate / tau;
}

/**
 * Median filter smoothing for pitch values
 * Uses a sliding window to reduce pitch jitter
 * @param {number} newPitch - Raw pitch value to smooth
 * @returns {number} Smoothed pitch value
 */
export function getSmoothedPitch(newPitch) {
    pitchDetection.recentPitches.push(newPitch);
    if (pitchDetection.recentPitches.length > PITCH_CONFIG.smoothingWindow) {
        pitchDetection.recentPitches.shift();
    }

    if (pitchDetection.recentPitches.length < 3) {
        return newPitch;
    }

    const sorted = [...pitchDetection.recentPitches].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
