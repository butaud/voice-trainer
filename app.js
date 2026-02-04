// Audio context and nodes
let audioContext = null;
let analyser = null;
let micStream = null;

// State
let isRunning = false;
let animationId = null;

// Note frequencies
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Note types: whole, half, quarter, eighth (and dotted variants)
const NOTE_TYPES = {
    WHOLE: 'whole',
    HALF: 'half',
    QUARTER: 'quarter',
    EIGHTH: 'eighth'
};

// Predefined sequences (durations in ms at 100% tempo)
const sequences = {
    'simple-scale': {
        name: 'Simple Scale (C-E)',
        notes: [
            { note: 'C', octave: 3, duration: 1050, noteType: NOTE_TYPES.QUARTER },
            { note: 'D', octave: 3, duration: 1050, noteType: NOTE_TYPES.QUARTER },
            { note: 'E', octave: 3, duration: 1050, noteType: NOTE_TYPES.QUARTER }
        ]
    },
    'octave-jump': {
        name: 'Octave Jump',
        notes: [
            { note: 'C', octave: 3, duration: 860, noteType: NOTE_TYPES.QUARTER },
            { note: 'C', octave: 4, duration: 860, noteType: NOTE_TYPES.QUARTER },
            { note: 'C', octave: 3, duration: 860, noteType: NOTE_TYPES.QUARTER }
        ]
    },
    'major-arpeggio': {
        name: 'Major Arpeggio',
        notes: [
            { note: 'C', octave: 3, duration: 690, noteType: NOTE_TYPES.QUARTER },
            { note: 'E', octave: 3, duration: 690, noteType: NOTE_TYPES.QUARTER },
            { note: 'G', octave: 3, duration: 690, noteType: NOTE_TYPES.QUARTER },
            { note: 'C', octave: 4, duration: 690, noteType: NOTE_TYPES.QUARTER }
        ]
    },
    'full-scale': {
        name: 'Full Scale Up',
        notes: [
            { note: 'C', octave: 3, duration: 575, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 575, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 575, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 575, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 575, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 575, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 575, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 4, duration: 575, noteType: NOTE_TYPES.EIGHTH }
        ]
    },
    'full-scale-up-down': {
        name: 'Full Scale Up & Down',
        notes: [
            { note: 'C', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 4, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 3, duration: 500, noteType: NOTE_TYPES.EIGHTH }
        ]
    },
    'double-scale': {
        name: 'Double Scale (Up & Down x2)',
        notes: [
            { note: 'C', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 4, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 4, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 3, duration: 400, noteType: NOTE_TYPES.EIGHTH }
        ]
    },
    'custom': {
        name: 'Custom',
        notes: []
    }
};

// MusicXML Parser - Get list of parts from a MusicXML document
function getMusicXMLParts(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid MusicXML file');
    }

    // Get part list with names
    const parts = [];
    const partListEl = doc.querySelector('part-list');
    if (partListEl) {
        const scoreParts = partListEl.querySelectorAll('score-part');
        scoreParts.forEach(sp => {
            const id = sp.getAttribute('id');
            const nameEl = sp.querySelector('part-name');
            const name = nameEl ? nameEl.textContent.trim() : id;
            parts.push({ id, name });
        });
    }

    // Fallback: get parts directly if no part-list
    if (parts.length === 0) {
        const partEls = doc.querySelectorAll('part');
        partEls.forEach((p, i) => {
            const id = p.getAttribute('id') || `part-${i + 1}`;
            parts.push({ id, name: `Part ${i + 1}` });
        });
    }

    if (parts.length === 0) {
        throw new Error('No parts found in MusicXML');
    }

    return { doc, parts };
}

// MusicXML Parser - Parse notes from a specific part
function parseMusicXMLPart(doc, partId) {
    // Get the specified part
    const part = doc.querySelector(`part[id="${partId}"]`);
    if (!part) {
        throw new Error(`Part "${partId}" not found`);
    }

    // Get tempo (default to 120 BPM if not specified)
    let tempo = 120;
    const soundEl = doc.querySelector('sound[tempo]');
    if (soundEl) {
        tempo = parseFloat(soundEl.getAttribute('tempo'));
    }

    // Get divisions (how many divisions per quarter note)
    const divisionsEl = doc.querySelector('divisions');
    const divisions = divisionsEl ? parseInt(divisionsEl.textContent) : 1;

    // Calculate ms per division
    const msPerBeat = 60000 / tempo; // ms per quarter note
    const msPerDivision = msPerBeat / divisions;

    const notes = [];

    // Process all measures
    const measures = part.querySelectorAll('measure');
    measures.forEach(measure => {
        const noteEls = measure.querySelectorAll('note');
        noteEls.forEach(noteEl => {
            // Skip rests
            if (noteEl.querySelector('rest')) return;

            // Skip chord notes (only take the first note of a chord)
            if (noteEl.querySelector('chord')) return;

            // Get pitch
            const pitchEl = noteEl.querySelector('pitch');
            if (!pitchEl) return;

            const step = pitchEl.querySelector('step')?.textContent || 'C';
            const octave = parseInt(pitchEl.querySelector('octave')?.textContent || '4');
            const alter = parseInt(pitchEl.querySelector('alter')?.textContent || '0');

            // Convert alter to sharp/flat
            let noteName = step;
            if (alter === 1) noteName += '#';
            else if (alter === -1) {
                // Convert flat to equivalent sharp
                const flatToSharp = { 'D': 'C#', 'E': 'D#', 'G': 'F#', 'A': 'G#', 'B': 'A#' };
                if (flatToSharp[step]) {
                    noteName = flatToSharp[step];
                }
            }

            // Get duration
            const durationEl = noteEl.querySelector('duration');
            const duration = durationEl ? parseInt(durationEl.textContent) : divisions;
            const durationMs = duration * msPerDivision;

            // Get note type
            const typeEl = noteEl.querySelector('type');
            const typeText = typeEl?.textContent || 'quarter';

            // Check for dotted
            const dotted = noteEl.querySelector('dot') !== null;

            // Map MusicXML type to our note types
            let noteType;
            switch (typeText) {
                case 'whole': noteType = NOTE_TYPES.WHOLE; break;
                case 'half': noteType = NOTE_TYPES.HALF; break;
                case 'quarter': noteType = NOTE_TYPES.QUARTER; break;
                case 'eighth': noteType = NOTE_TYPES.EIGHTH; break;
                case '16th': noteType = NOTE_TYPES.EIGHTH; break; // Treat 16th as eighth for now
                default: noteType = NOTE_TYPES.QUARTER;
            }

            notes.push({
                note: noteName,
                octave: octave,
                duration: durationMs,
                noteType: noteType,
                dotted: dotted
            });
        });
    });

    if (notes.length === 0) {
        throw new Error('No notes found in selected part');
    }

    return notes;
}

// Sequence state
const sequenceState = {
    isSequenceMode: true,
    isPlaying: false,
    isPreviewing: false,
    previewIndex: -1,
    isCountingDown: false,
    countdownStartTime: 0,
    countdownBeatInterval: 1000,
    countdownLastBeat: -1,
    currentSequence: [],
    currentNoteIndex: 0,
    noteStartTime: 0,
    noteScores: [],
    pitchSamplesForNote: [],
    pitchHistory: [],          // Timeline history for visualization
    timeOnPitch: 0,
    // For integrated sheet music visualization
    sequenceStartTime: 0,      // When the sequence started (after countdown)
    globalPitchTrace: []       // Array of {time, frequency, noteIndex} for entire sequence
};

// Preview scroll animation state - syncs to audio callbacks
const previewScrollState = {
    animationId: null,
    noteSpacing: 0,
    notesStartX: 0,
    maxScrollNeeded: 0,
    currentNoteIndex: 0,
    noteStartTime: 0,
    noteDuration: 0,
    notePositions: [] // Array of {x}
};

function updatePreviewScroll() {
    if (!sequenceState.isPreviewing) {
        if (previewScrollState.animationId) {
            cancelAnimationFrame(previewScrollState.animationId);
            previewScrollState.animationId = null;
        }
        return;
    }

    const i = previewScrollState.currentNoteIndex;
    const pos = previewScrollState.notePositions[i];
    if (!pos) {
        previewScrollState.animationId = requestAnimationFrame(updatePreviewScroll);
        return;
    }

    // Calculate progress within current note based on time since note started
    const elapsed = performance.now() - previewScrollState.noteStartTime;
    const progress = Math.min(1, elapsed / previewScrollState.noteDuration);

    // Interpolate X position within current note
    const nextX = (i < previewScrollState.notePositions.length - 1)
        ? previewScrollState.notePositions[i + 1].x
        : pos.x + previewScrollState.noteSpacing;
    const currentX = pos.x + progress * (nextX - pos.x);

    sequenceState.previewIndex = i;

    // Calculate scroll offset based on current position
    // Add padding so the current note isn't right at the edge
    const previewPadding = previewScrollState.noteSpacing * 2;
    const scrollOffset = Math.min(
        Math.max(0, currentX - previewScrollState.notesStartX - previewPadding),
        previewScrollState.maxScrollNeeded
    );

    drawSheetMusic(sequenceState.previewIndex, sequenceState.previewIndex, null, -1, false, 0, scrollOffset);
    previewScrollState.animationId = requestAnimationFrame(updatePreviewScroll);
}

// Called when a new note starts playing
function onPreviewNoteStart(noteIndex, noteDuration) {
    previewScrollState.currentNoteIndex = noteIndex;
    previewScrollState.noteStartTime = performance.now();
    previewScrollState.noteDuration = noteDuration;
}

function startPreviewScrollAnimation(notePositions, noteSpacing, notesStartX, maxScrollNeeded) {
    previewScrollState.notePositions = notePositions;
    previewScrollState.noteSpacing = noteSpacing;
    previewScrollState.notesStartX = notesStartX;
    previewScrollState.maxScrollNeeded = maxScrollNeeded;
    previewScrollState.currentNoteIndex = 0;
    previewScrollState.noteStartTime = performance.now();
    previewScrollState.noteDuration = 1000; // Will be updated by first note

    if (!previewScrollState.animationId) {
        previewScrollState.animationId = requestAnimationFrame(updatePreviewScroll);
    }
}

function stopPreviewScrollAnimation() {
    if (previewScrollState.animationId) {
        cancelAnimationFrame(previewScrollState.animationId);
        previewScrollState.animationId = null;
    }
}

function getFrequency(note, octave) {
    const noteIndex = noteNames.indexOf(note);
    const midiNote = (octave + 1) * 12 + noteIndex;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Current target note
const currentNote = {
    name: 'A4',
    frequency: 440
};

// DOM elements
const playNoteBtn = document.getElementById('play-note');
const startBtn = document.getElementById('start-btn');
const statusEl = document.getElementById('status');
const pitchCanvas = document.getElementById('pitch-canvas');
const detectedPitchEl = document.getElementById('detected-pitch');
const detectedNoteEl = document.getElementById('detected-note');
const centsOffEl = document.getElementById('cents-off');
const canvasCtx = pitchCanvas.getContext('2d');
const noteSelect = document.getElementById('note-select');
const octaveSelect = document.getElementById('octave-select');
const noteNameEl = document.getElementById('note-name');
const noteFreqEl = document.getElementById('note-freq');
const targetNoteLabelEl = document.getElementById('target-note-label');

// Sliding window for pitch history (time-based)
const windowDuration = 3; // seconds
const samplesPerSecond = 30;
const maxSamples = windowDuration * samplesPerSecond;
const pitchHistory = [];

// Smoothing for pitch detection
const recentPitches = [];
const smoothingWindow = 5;

// Initialize audio context
let audioWarmedUp = false;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Warm up audio context to avoid first-play lag - must be called from user gesture
function warmUpAudio() {
    if (audioWarmedUp) return Promise.resolve();

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
        clickBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = clickBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // Play a silent click to prime the buffer source path
        const noise = ctx.createBufferSource();
        noise.buffer = clickBuffer;
        const silentGain = ctx.createGain();
        silentGain.gain.setValueAtTime(0, ctx.currentTime);
        noise.connect(silentGain);
        silentGain.connect(ctx.destination);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.01);

        audioWarmedUp = true;
    });
}

// Warm up audio on first user click/touch/key (these are valid user gestures)
function onFirstInteraction() {
    warmUpAudio();
    document.removeEventListener('click', onFirstInteraction);
    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
}
document.addEventListener('click', onFirstInteraction);
document.addEventListener('touchstart', onFirstInteraction);
document.addEventListener('keydown', onFirstInteraction);

// Current preview audio state (for stopping)
let currentPreviewAudio = null;

// Play reference tone - returns a stop function
function playTone(frequency, duration = 1.5, callback = null) {
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

        let timeoutId = null;
        if (callback) {
            timeoutId = setTimeout(callback, duration * 1000);
            // Store reference for stopping preview
            currentPreviewAudio = {
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
        } else {
            playNoteBtn.disabled = true;
            setTimeout(() => {
                playNoteBtn.disabled = false;
            }, duration * 1000);
        }
    });
}

// YIN pitch detection algorithm
function detectPitch(buffer, sampleRate) {
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

// Median filter smoothing
function getSmoothedPitch(newPitch) {
    recentPitches.push(newPitch);
    if (recentPitches.length > smoothingWindow) {
        recentPitches.shift();
    }

    if (recentPitches.length < 3) {
        return newPitch;
    }

    const sorted = [...recentPitches].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Convert frequency to cents difference
function getCentsDifference(detected, target) {
    return 1200 * Math.log2(detected / target);
}

// Get note name from frequency
function getNoteFromFrequency(frequency) {
    const noteNum = 12 * (Math.log2(frequency / 440)) + 69;
    const note = Math.round(noteNum);
    const noteName = noteNames[note % 12];
    const octave = Math.floor(note / 12) - 1;
    return `${noteName}${octave}`;
}

// Draw visualization
function drawVisualization() {
    const width = pitchCanvas.width;
    const height = pitchCanvas.height;
    const rightPadding = 30;
    const drawWidth = width - rightPadding;

    // Clear
    canvasCtx.fillStyle = 'rgba(30, 30, 40, 1)';
    canvasCtx.fillRect(0, 0, width, height);

    const centerY = height / 2;

    // On-pitch zone
    canvasCtx.fillStyle = 'rgba(107, 203, 119, 0.15)';
    const onPitchHeight = (10 / 100) * (height / 2 - 10) * 2;
    canvasCtx.fillRect(0, centerY - onPitchHeight / 2, width, onPitchHeight);

    // Target line
    canvasCtx.strokeStyle = '#6bcb77';
    canvasCtx.lineWidth = 2;
    canvasCtx.setLineDash([5, 5]);
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, centerY);
    canvasCtx.lineTo(width, centerY);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);

    // Threshold lines
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    canvasCtx.lineWidth = 1;
    const thresholdOffset = height / 4;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, centerY - thresholdOffset);
    canvasCtx.lineTo(width, centerY - thresholdOffset);
    canvasCtx.moveTo(0, centerY + thresholdOffset);
    canvasCtx.lineTo(width, centerY + thresholdOffset);
    canvasCtx.stroke();

    // Draw pitch history
    canvasCtx.lineWidth = 3;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';

    let lastValidPoint = null;

    for (let i = 0; i < pitchHistory.length; i++) {
        const cents = pitchHistory[i];
        if (cents === null) {
            lastValidPoint = null;
            continue;
        }

        const x = (i / maxSamples) * drawWidth;
        const clampedCents = Math.max(-100, Math.min(100, cents));
        const y = centerY - (clampedCents / 100) * (height / 2 - 10);

        if (Math.abs(cents) <= 10) {
            canvasCtx.strokeStyle = '#6bcb77';
        } else if (Math.abs(cents) <= 25) {
            canvasCtx.strokeStyle = '#ffd93d';
        } else {
            canvasCtx.strokeStyle = '#ff6b6b';
        }

        if (lastValidPoint) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(lastValidPoint.x, lastValidPoint.y);
            canvasCtx.lineTo(x, y);
            canvasCtx.stroke();
        }

        lastValidPoint = { x, y, cents };
    }

    // Current position indicator
    if (lastValidPoint && isRunning) {
        canvasCtx.beginPath();
        canvasCtx.arc(lastValidPoint.x, lastValidPoint.y, 8, 0, Math.PI * 2);

        if (Math.abs(lastValidPoint.cents) <= 10) {
            canvasCtx.fillStyle = '#6bcb77';
        } else if (Math.abs(lastValidPoint.cents) <= 25) {
            canvasCtx.fillStyle = '#ffd93d';
        } else {
            canvasCtx.fillStyle = '#ff6b6b';
        }
        canvasCtx.fill();
        canvasCtx.strokeStyle = 'white';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
    }
}

// Main analysis loop
let lastSampleTime = 0;
const sampleInterval = 1000 / samplesPerSecond;

function analyze(timestamp) {
    if (!isRunning) return;

    // Sample at fixed rate
    if (timestamp - lastSampleTime >= sampleInterval) {
        lastSampleTime = timestamp;

        const buffer = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buffer);

        const rawPitch = detectPitch(buffer, audioContext.sampleRate);

        if (rawPitch !== -1 && rawPitch > 80 && rawPitch < 1000) {
            const pitch = getSmoothedPitch(rawPitch);
            const cents = getCentsDifference(pitch, currentNote.frequency);
            const noteName = getNoteFromFrequency(pitch);

            detectedPitchEl.textContent = Math.round(pitch);
            detectedNoteEl.textContent = `Hz (${noteName})`;

            const centsRounded = Math.round(cents);
            if (centsRounded > 0) {
                centsOffEl.textContent = `+${centsRounded}`;
                centsOffEl.className = Math.abs(centsRounded) <= 10 ? 'on-pitch' : 'sharp';
            } else {
                centsOffEl.textContent = centsRounded.toString();
                centsOffEl.className = Math.abs(centsRounded) <= 10 ? 'on-pitch' : 'flat';
            }

            pitchHistory.push(cents);
        } else {
            pitchHistory.push(null);
        }

        // Keep sliding window
        while (pitchHistory.length > maxSamples) {
            pitchHistory.shift();
        }
    }

    drawVisualization();
    animationId = requestAnimationFrame(analyze);
}

// Start live analysis
async function start() {
    try {
        // Ensure audio context is warmed up and resumed
        await warmUpAudio();
        const ctx = getAudioContext();

        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = ctx.createMediaStreamSource(micStream);

        analyser = ctx.createAnalyser();
        analyser.fftSize = 4096;
        source.connect(analyser);

        pitchHistory.length = 0;
        recentPitches.length = 0;
        lastSampleTime = 0;

        isRunning = true;
        startBtn.textContent = 'Stop';
        startBtn.classList.add('recording');
        statusEl.textContent = 'Listening...';

        animationId = requestAnimationFrame(analyze);

    } catch (err) {
        console.error('Microphone error:', err);
        statusEl.textContent = 'Error: Could not access microphone.';
    }
}

// Stop live analysis
function stop() {
    isRunning = false;

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }

    startBtn.textContent = 'Start';
    startBtn.classList.remove('recording');
    statusEl.textContent = '';
}

// Update current note
function updateCurrentNote() {
    const note = noteSelect.value;
    const octave = parseInt(octaveSelect.value);
    const frequency = getFrequency(note, octave);

    currentNote.name = `${note}${octave}`;
    currentNote.frequency = frequency;

    noteNameEl.textContent = currentNote.name;
    noteFreqEl.textContent = `${Math.round(frequency)} Hz`;
    targetNoteLabelEl.textContent = currentNote.name;
}

// Event listeners
noteSelect.addEventListener('change', updateCurrentNote);
octaveSelect.addEventListener('change', updateCurrentNote);

playNoteBtn.addEventListener('click', () => {
    playTone(currentNote.frequency);
});

startBtn.addEventListener('click', () => {
    if (isRunning) {
        stop();
    } else {
        start();
    }
});

// Initial draw
drawVisualization();

// Sequence Mode DOM elements
const modeFreeBtn = document.getElementById('mode-free');
const modeSequenceBtn = document.getElementById('mode-sequence');
const freePracticeSections = document.querySelectorAll('.free-practice-section');
const sequenceSection = document.querySelector('.sequence-section');
const sequenceSelect = document.getElementById('sequence-select');
const startNoteSelect = document.getElementById('start-note-select');
const startOctaveSelect = document.getElementById('start-octave-select');
const sheetMusicCanvas = document.getElementById('sheet-music-canvas');
const sheetMusicCtx = sheetMusicCanvas.getContext('2d');
const previewBtn = document.getElementById('preview-btn');
const goBtn = document.getElementById('go-btn');
const sequenceCanvas = document.getElementById('sequence-canvas');
const sequenceCanvasContainer = document.querySelector('.sequence-canvas-container');
const sequenceCtx = sequenceCanvas.getContext('2d');
const sequenceResults = document.getElementById('sequence-results');
const resultsGrade = document.getElementById('results-grade');
const resultsPercent = document.getElementById('results-percent');
const resultsBreakdown = document.getElementById('results-breakdown');
const retryBtn = document.getElementById('retry-btn');
const sequenceStatus = document.getElementById('sequence-status');
const musicxmlImport = document.getElementById('musicxml-import');
const musicxmlFile = document.getElementById('musicxml-file');
const musicxmlFilename = document.getElementById('musicxml-filename');
const musicxmlPartSelector = document.getElementById('musicxml-part-selector');
const musicxmlPartSelect = document.getElementById('musicxml-part-select');
const startingNoteContainer = document.getElementById('starting-note-container');
const tempoSlider = document.getElementById('tempo-slider');
const tempoDisplay = document.getElementById('tempo-display');

// Sequence configuration state
let tempoPercent = 100;

// Mode toggle
function setMode(mode) {
    if (mode === 'free') {
        sequenceState.isSequenceMode = false;
        modeFreeBtn.classList.add('active');
        modeSequenceBtn.classList.remove('active');
        freePracticeSections.forEach(el => el.style.display = '');
        sequenceSection.style.display = 'none';
        if (sequenceState.isPlaying) {
            stopSequence();
        }
    } else {
        sequenceState.isSequenceMode = true;
        modeSequenceBtn.classList.add('active');
        modeFreeBtn.classList.remove('active');
        freePracticeSections.forEach(el => el.style.display = 'none');
        sequenceSection.style.display = '';
        if (isRunning) {
            stop();
        }
        loadSequence(sequenceSelect.value);
    }
}

// Convert note + octave to semitone number (C0 = 0)
function noteToSemitone(note, octave) {
    return octave * 12 + noteNames.indexOf(note);
}

// Convert semitone number back to note + octave
function semitoneToNote(semitone) {
    const octave = Math.floor(semitone / 12);
    const noteIndex = ((semitone % 12) + 12) % 12; // Handle negative values
    return { note: noteNames[noteIndex], octave };
}

// Load sequence with transposition based on selected starting note
function loadSequence(id) {
    const seq = sequences[id];
    if (!seq || seq.notes.length === 0) return;

    // Get the original starting note and the user's selected starting note
    const originalStart = seq.notes[0];
    const originalSemitone = noteToSemitone(originalStart.note, originalStart.octave);

    const selectedNote = startNoteSelect.value;
    const selectedOctave = parseInt(startOctaveSelect.value);
    const selectedSemitone = noteToSemitone(selectedNote, selectedOctave);

    // Calculate transposition interval
    const transposition = selectedSemitone - originalSemitone;

    // Transpose all notes
    sequenceState.currentSequence = seq.notes.map(n => {
        const originalSemi = noteToSemitone(n.note, n.octave);
        const transposedSemi = originalSemi + transposition;
        const transposed = semitoneToNote(transposedSemi);

        return {
            ...n,
            note: transposed.note,
            octave: transposed.octave,
            frequency: getFrequency(transposed.note, transposed.octave),
            name: `${transposed.note}${transposed.octave}`
        };
    });

    drawSheetMusic();
    sequenceResults.style.display = 'none';
    sequenceCanvasContainer.classList.remove('active');

    // Sync song practice mini-staff (if initialized)
    if (typeof updateSongPracticeMiniStaff === 'function') {
        updateSongPracticeMiniStaff();
    }
}

// Get tempo-adjusted duration (in ms)
function getAdjustedDuration(baseDuration) {
    return baseDuration * (100 / tempoPercent);
}

// Sheet music drawing

// Diatonic note positions (C=0, D=1, E=2, F=3, G=4, A=5, B=6)
const diatonicPosition = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };

// Get the diatonic position of a note (for vertical placement on staff)
function getStaffPosition(note, octave) {
    // Get base note without sharp
    const baseNote = note.replace('#', '');
    // Position relative to C0: octave * 7 + diatonic position
    return octave * 7 + diatonicPosition[baseNote];
}

// Determine best clef for a sequence
function getBestClef(sequence) {
    if (sequence.length === 0) return 'treble';

    // Calculate average staff position
    const avgPosition = sequence.reduce((sum, n) => sum + getStaffPosition(n.note, n.octave), 0) / sequence.length;

    // Middle C (C4) is at position 28
    // Use treble if average is >= C4, bass otherwise
    return avgPosition >= 28 ? 'treble' : 'bass';
}

// Get Y position on canvas for a staff position
function getYForStaffPosition(staffPos, clef, staffTop, lineSpacing) {
    // Reference positions for each clef (the note on the bottom line)
    // Treble: bottom line is E4 (position 30)
    // Bass: bottom line is G2 (position 18)
    const refPosition = clef === 'treble' ? 30 : 18;

    // Each staff position is half a line spacing
    // Bottom line is at staffTop + 4 * lineSpacing
    const bottomLineY = staffTop + 4 * lineSpacing;
    const positionDiff = staffPos - refPosition;

    return bottomLineY - (positionDiff * lineSpacing / 2);
}

// SVG path for treble clef
const TREBLE_CLEF_PATH = "m51.688 5.25c-5.427-0.1409-11.774 12.818-11.563 24.375 0.049 3.52 1.16 10.659 2.781 19.625-10.223 10.581-22.094 21.44-22.094 35.688-0.163 13.057 7.817 29.692 26.75 29.532 2.906-0.02 5.521-0.38 7.844-1 1.731 9.49 2.882 16.98 2.875 20.44 0.061 13.64-17.86 14.99-18.719 7.15 3.777-0.13 6.782-3.13 6.782-6.84 0-3.79-3.138-6.88-7.032-6.88-2.141 0-4.049 0.94-5.343 2.41-0.03 0.03-0.065 0.06-0.094 0.09-0.292 0.31-0.538 0.68-0.781 1.1-0.798 1.35-1.316 3.29-1.344 6.06 0 11.42 28.875 18.77 28.875-3.75 0.045-3.03-1.258-10.72-3.156-20.41 20.603-7.45 15.427-38.04-3.531-38.184-1.47 0.015-2.887 0.186-4.25 0.532-1.08-5.197-2.122-10.241-3.032-14.876 7.199-7.071 13.485-16.224 13.344-33.093 0.022-12.114-4.014-21.828-8.312-21.969zm1.281 11.719c2.456-0.237 4.406 2.043 4.406 7.062 0.199 8.62-5.84 16.148-13.031 23.719-0.688-4.147-1.139-7.507-1.188-9.5 0.204-13.466 5.719-20.886 9.813-21.281zm-7.719 44.687c0.877 4.515 1.824 9.272 2.781 14.063-12.548 4.464-18.57 21.954-0.781 29.781-10.843-9.231-5.506-20.158 2.312-22.062 1.966 9.816 3.886 19.502 5.438 27.872-2.107 0.74-4.566 1.17-7.438 1.19-7.181 0-21.531-4.57-21.531-21.875 0-14.494 10.047-20.384 19.219-28.969zm6.094 21.469c0.313-0.019 0.652-0.011 0.968 0 13.063 0 17.99 20.745 4.688 27.375-1.655-8.32-3.662-17.86-5.656-27.375z";

// SVG path for bass clef body (with group translate applied from original)
const BASS_CLEF_PATH = "m13.976 0.23c-8.785 0.21-15.515 6.36-13.334 15.79 0.002 0.01 0.013 0.02 0.016 0.03 0.256 3.25 2.96 5.81 6.276 5.81 3.485 0 6.309-2.82 6.309-6.3 0-3.08-2.191-5.64-5.098-6.2-1.158-0.41-2.896-1.34-2.82-2.84 0.036-0.74 0.903-2.09 2.294-2.77 1.691-0.79 3.434-1.22 5.194-0.86 2.667 0.49 9.489 5.39 10.019 13.88 0.31 6.44-3.31 15.15-6.849 19.27-5.698 6.51-14.851 10.55-13.955 11.27 0.803 0.72 11.61-4.22 17.237-10.42 6.867-7.44 10.267-13.64 9.937-21.17-0.19-7.54-6.03-15.7-15.226-15.49z";

// Draw a treble clef using SVG path
function drawTrebleClef(ctx, x, staffTop, lineSpacing) {
    ctx.save();
    ctx.fillStyle = '#999';

    // Scale based on line spacing (base scale 0.50 for lineSpacing=10)
    const scale = (lineSpacing / 10) * 0.50;
    const offsetX = x - 4 * (lineSpacing / 10);
    // The G-circle in the SVG needs to align with G line (staffTop + 3*lineSpacing)
    const offsetY = staffTop - 1.75 * lineSpacing;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const path = new Path2D(TREBLE_CLEF_PATH);
    ctx.fill(path);

    ctx.restore();
}

// Draw a bass clef using SVG path
function drawBassClef(ctx, x, staffTop, lineSpacing) {
    ctx.save();
    ctx.fillStyle = '#999';

    // Scale 0.75 for lineSpacing=10, position to align with F line
    const scale = (lineSpacing / 10) * 0.75;
    const offsetX = x + 6 * (lineSpacing / 10);
    const offsetY = staffTop - 0.3 * lineSpacing;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw main body
    const path = new Path2D(BASS_CLEF_PATH);
    ctx.fill(path);

    // Draw two dots (positions from original SVG)
    ctx.beginPath();
    ctx.arc(36, 9.5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(36, 22.6, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Draw a note with stem (supports different note types)
function drawNote(ctx, x, y, isSharp, isActive, isCompleted, staffMiddleY, score = null, noteType = NOTE_TYPES.QUARTER, dotted = false) {
    ctx.save();

    // Determine colors
    let noteColor;
    if (score !== null) {
        // Color based on performance score
        if (score >= 70) {
            noteColor = '#6bcb77'; // Green - good
        } else if (score >= 40) {
            noteColor = '#ffd93d'; // Yellow - okay
        } else {
            noteColor = '#ff6b6b'; // Red - poor
        }
    } else if (isActive) {
        noteColor = '#4ecdc4'; // Cyan - current
    } else if (isCompleted) {
        noteColor = '#6bcb77'; // Green - completed
    } else {
        noteColor = '#bbb'; // Gray - upcoming
    }
    ctx.fillStyle = noteColor;
    ctx.strokeStyle = noteColor;

    // Note head dimensions
    const noteWidth = 7;
    const noteHeight = 5;
    const stemHeight = 30;
    const stemWidth = 1.5;

    // Determine if note head should be filled or hollow
    const isHollow = noteType === NOTE_TYPES.WHOLE || noteType === NOTE_TYPES.HALF;
    const hasStem = noteType !== NOTE_TYPES.WHOLE;
    const hasFlag = noteType === NOTE_TYPES.EIGHTH;

    // Stem direction: down if on or above middle line, up if below
    const stemDown = y <= staffMiddleY;

    // Draw note head
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (noteType === NOTE_TYPES.WHOLE) {
        // Whole note: wider, more horizontal oval
        ctx.ellipse(x, y, noteWidth + 2, noteHeight, 0, 0, 2 * Math.PI);
    } else {
        // Other notes: tilted oval
        ctx.ellipse(x, y, noteWidth, noteHeight, -0.3, 0, 2 * Math.PI);
    }

    if (isHollow) {
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        ctx.fill();
    }

    // Draw stem
    if (hasStem) {
        if (stemDown) {
            // Stem down (on left side of note)
            ctx.fillRect(x - noteWidth + 1, y, stemWidth, stemHeight);

            // Draw flag for eighth note (stem down)
            if (hasFlag) {
                ctx.beginPath();
                ctx.moveTo(x - noteWidth + 1 + stemWidth, y + stemHeight);
                ctx.quadraticCurveTo(
                    x - noteWidth + 15, y + stemHeight - 5,
                    x - noteWidth + 12, y + stemHeight - 15
                );
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else {
            // Stem up (on right side of note)
            ctx.fillRect(x + noteWidth - stemWidth - 1, y - stemHeight, stemWidth, stemHeight);

            // Draw flag for eighth note (stem up)
            if (hasFlag) {
                ctx.beginPath();
                ctx.moveTo(x + noteWidth - 1, y - stemHeight);
                ctx.quadraticCurveTo(
                    x + noteWidth + 10, y - stemHeight + 5,
                    x + noteWidth + 8, y - stemHeight + 15
                );
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }

    // Draw dot for dotted notes
    if (dotted) {
        ctx.beginPath();
        ctx.arc(x + noteWidth + 5, y, 2, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Draw sharp if needed
    if (isSharp) {
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♯', x - 16, y);
    }

    ctx.restore();
}

// Draw ledger lines for notes outside the staff
function drawLedgerLines(ctx, x, y, staffTop, lineSpacing, clef) {
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;

    const bottomLine = staffTop + 4 * lineSpacing;
    const topLine = staffTop;

    // Draw ledger lines below staff
    if (y > bottomLine + lineSpacing / 2) {
        for (let ly = bottomLine + lineSpacing; ly <= y + lineSpacing / 2; ly += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 12, ly);
            ctx.lineTo(x + 12, ly);
            ctx.stroke();
        }
    }

    // Draw ledger lines above staff
    if (y < topLine - lineSpacing / 2) {
        for (let ly = topLine - lineSpacing; ly >= y - lineSpacing / 2; ly -= lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 12, ly);
            ctx.lineTo(x + 12, ly);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// Calculate total sequence duration in ms
function getSequenceTotalDuration() {
    return sequenceState.currentSequence.reduce((sum, note) => sum + getAdjustedDuration(note.duration), 0);
}

// Get cumulative time up to (but not including) a note index
function getCumulativeTime(upToIndex) {
    let time = 0;
    for (let i = 0; i < upToIndex && i < sequenceState.currentSequence.length; i++) {
        time += getAdjustedDuration(sequenceState.currentSequence[i].duration);
    }
    return time;
}

// Convert frequency to Y position on staff
function frequencyToStaffY(frequency, clef, staffTop, lineSpacing) {
    // Convert frequency to note name and octave
    const midiNote = 12 * Math.log2(frequency / 440) + 69;
    const noteIndex = Math.round(midiNote) % 12;
    const octave = Math.floor(Math.round(midiNote) / 12) - 1;
    const noteName = noteNames[noteIndex];

    // Get staff position and Y coordinate
    const staffPos = getStaffPosition(noteName, octave);

    // For smooth visualization, interpolate based on actual frequency deviation
    const exactMidi = 12 * Math.log2(frequency / 440) + 69;
    const deviation = exactMidi - Math.round(midiNote); // -0.5 to +0.5

    const baseY = getYForStaffPosition(staffPos, clef, staffTop, lineSpacing);
    // Each semitone is roughly half a staff position, adjust Y accordingly
    const yAdjustment = -deviation * (lineSpacing / 2);

    return baseY + yAdjustment;
}

// Main function to draw sheet music
function drawSheetMusic(activeIndex = -1, completedUpTo = -1, noteScores = null, playbackTime = -1, showFinalTrace = false, noteOffsetX = 0, previewScrollOffset = 0) {
    const canvas = sheetMusicCanvas;
    const ctx = sheetMusicCtx;
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(0, 0, width, height);

    const sequence = sequenceState.currentSequence;
    if (sequence.length === 0) return;

    // Layout - center staff vertically with room for pitch deviations
    const staffTop = 55;
    const lineSpacing = 10;
    const clef = getBestClef(sequence);
    const clefWidth = 40;
    const leftMargin = 15;
    const rightMargin = 15;
    const noteAreaWidth = width - leftMargin - clefWidth - rightMargin;
    const minNoteSpacing = 28;
    const idealNoteSpacing = Math.min(50, noteAreaWidth / sequence.length);
    const noteSpacing = Math.max(minNoteSpacing, idealNoteSpacing);
    const notesStartX = leftMargin + clefWidth + noteSpacing / 2;

    // Calculate how many notes can fit (leave room for ellipsis if needed)
    const ellipsisWidth = 30;
    const maxNotesVisible = Math.floor((noteAreaWidth - ellipsisWidth / 2) / noteSpacing);
    const notesToShow = Math.min(sequence.length, maxNotesVisible);
    const hasEllipsis = sequence.length > notesToShow;

    // Calculate note X positions and time boundaries for playback visualization
    const notePositions = [];
    let cumulativeTime = 0;
    sequence.forEach((note, i) => {
        const x = notesStartX + i * noteSpacing;
        const duration = getAdjustedDuration(note.duration);
        notePositions.push({
            x: x,
            startTime: cumulativeTime,
            endTime: cumulativeTime + duration,
            duration: duration
        });
        cumulativeTime += duration;
    });
    const totalDuration = cumulativeTime;

    // Draw staff lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const y = staffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - rightMargin, y);
        ctx.stroke();
    }

    // Draw clef
    if (clef === 'treble') {
        drawTrebleClef(ctx, leftMargin, staffTop, lineSpacing);
    } else {
        drawBassClef(ctx, leftMargin, staffTop, lineSpacing);
    }

    // Middle line of staff (for stem direction)
    const staffMiddleY = staffTop + 2 * lineSpacing;

    // Determine if we're in preview mode (not playing, not counting down)
    const isPreviewMode = playbackTime === -1 && !sequenceState.isPlaying && !sequenceState.isCountingDown;
    const isAudioPreviewing = sequenceState.isPreviewing;

    // Determine how many notes to draw
    const showEllipsis = isPreviewMode && hasEllipsis && !isAudioPreviewing;
    const visibleNoteCount = showEllipsis ? notesToShow : sequence.length;

    // Left edge for clipping notes (at the clef)
    const clipLeftEdge = leftMargin + clefWidth - 5;

    // Draw notes (with optional X offset for countdown animation or preview scroll)
    for (let i = 0; i < visibleNoteCount; i++) {
        const note = sequence[i];
        const x = notesStartX + i * noteSpacing + noteOffsetX - previewScrollOffset;

        // Skip notes that are past the left edge of the staff or off-screen right
        if (x < clipLeftEdge || x > width + 20) continue;

        const staffPos = getStaffPosition(note.note, note.octave);
        const y = getYForStaffPosition(staffPos, clef, staffTop, lineSpacing);
        const isSharp = note.note.includes('#');
        const isActive = i === activeIndex;
        const isCompleted = i < completedUpTo;
        const score = noteScores && noteScores[i] ? noteScores[i].score : null;

        // Draw ledger lines if needed
        drawLedgerLines(ctx, x, y, staffTop, lineSpacing, clef);

        // Draw the note
        drawNote(ctx, x, y, isSharp, isActive, isCompleted, staffMiddleY, score, note.noteType || NOTE_TYPES.QUARTER, note.dotted || false);
    }

    // Draw ellipsis if song is too long and not audio previewing
    if (showEllipsis) {
        const ellipsisX = notesStartX + notesToShow * noteSpacing;
        const ellipsisY = staffTop + 2 * lineSpacing; // Center of staff
        ctx.fillStyle = '#888';
        ctx.font = 'bold 20px serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('...', ellipsisX, ellipsisY);
    }

    // Draw playback visualization if in playback mode or showing final trace
    const showVisualization = (playbackTime >= 0 && sequenceState.isPlaying) || showFinalTrace;
    if (showVisualization) {
        // Calculate the "natural" playhead X position (where it would be without scrolling)
        let naturalPlayheadX = notesStartX;
        if (playbackTime >= 0) {
            for (let i = 0; i < notePositions.length; i++) {
                const pos = notePositions[i];
                if (playbackTime >= pos.startTime && playbackTime < pos.endTime) {
                    const progress = (playbackTime - pos.startTime) / pos.duration;
                    const nextX = (i < notePositions.length - 1) ? notePositions[i + 1].x : pos.x + noteSpacing;
                    naturalPlayheadX = pos.x + progress * (nextX - pos.x);
                    break;
                } else if (playbackTime >= pos.endTime) {
                    naturalPlayheadX = (i < notePositions.length - 1) ? notePositions[i + 1].x : pos.x + noteSpacing / 2;
                }
            }
        }

        // For long songs, calculate scroll offset to keep playhead fixed until all notes fit
        let scrollOffset = 0;
        let playheadX = naturalPlayheadX;
        const rightEdge = width - rightMargin - 10;
        const lastNoteX = notesStartX + (sequence.length - 1) * noteSpacing;

        if (hasEllipsis && playbackTime >= 0) {
            // Max scroll needed: distance from last note to right edge
            const maxScrollNeeded = lastNoteX - rightEdge;
            // Current scroll: how far playhead has moved from start
            const currentScroll = naturalPlayheadX - notesStartX;
            // Apply scroll offset (capped at max needed)
            scrollOffset = Math.min(currentScroll, maxScrollNeeded);
            // Playhead stays fixed while scrolling, then moves normally
            playheadX = notesStartX + Math.max(0, currentScroll - maxScrollNeeded);
        }

        // Redraw notes with scroll offset during playback
        if (scrollOffset > 0) {
            // Clear and redraw background
            ctx.fillStyle = 'rgba(30, 30, 40, 1)';
            ctx.fillRect(0, 0, width, height);

            // Redraw staff lines
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const y = staffTop + i * lineSpacing;
                ctx.beginPath();
                ctx.moveTo(leftMargin, y);
                ctx.lineTo(width - rightMargin, y);
                ctx.stroke();
            }

            // Redraw clef
            if (clef === 'treble') {
                drawTrebleClef(ctx, leftMargin, staffTop, lineSpacing);
            } else {
                drawBassClef(ctx, leftMargin, staffTop, lineSpacing);
            }

            // Redraw notes with scroll offset
            for (let i = 0; i < sequence.length; i++) {
                const note = sequence[i];
                const x = notesStartX + i * noteSpacing - scrollOffset;
                // Skip notes that are off-screen to the left
                if (x < leftMargin - 20) continue;
                // Skip notes that are off-screen to the right
                if (x > width + 20) continue;

                const staffPos = getStaffPosition(note.note, note.octave);
                const y = getYForStaffPosition(staffPos, clef, staffTop, lineSpacing);
                const isSharp = note.note.includes('#');
                const isActive = i === activeIndex;
                const isCompleted = i < completedUpTo;
                const score = noteScores && noteScores[i] ? noteScores[i].score : null;

                drawLedgerLines(ctx, x, y, staffTop, lineSpacing, clef);
                drawNote(ctx, x, y, isSharp, isActive, isCompleted, staffMiddleY, score, note.noteType || NOTE_TYPES.QUARTER, note.dotted || false);
            }
        }

        // Draw pitch trace (with scroll offset applied)
        if (sequenceState.globalPitchTrace.length > 1) {
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw trace segments
            for (let i = 1; i < sequenceState.globalPitchTrace.length; i++) {
                const prev = sequenceState.globalPitchTrace[i - 1];
                const curr = sequenceState.globalPitchTrace[i];

                // Calculate X positions for both points (apply scroll offset)
                let prevX = notesStartX - scrollOffset, currX = notesStartX - scrollOffset;

                for (let j = 0; j < notePositions.length; j++) {
                    const pos = notePositions[j];
                    // Previous point
                    if (prev.time >= pos.startTime && prev.time < pos.endTime) {
                        const progress = (prev.time - pos.startTime) / pos.duration;
                        const nextX = (j < notePositions.length - 1) ? notePositions[j + 1].x : pos.x + noteSpacing;
                        prevX = pos.x + progress * (nextX - pos.x) - scrollOffset;
                    } else if (prev.time >= pos.endTime) {
                        // Point is past this note, update to end of this note
                        const nextX = (j < notePositions.length - 1) ? notePositions[j + 1].x : pos.x + noteSpacing;
                        prevX = nextX - scrollOffset;
                    }
                    // Current point
                    if (curr.time >= pos.startTime && curr.time < pos.endTime) {
                        const progress = (curr.time - pos.startTime) / pos.duration;
                        const nextX = (j < notePositions.length - 1) ? notePositions[j + 1].x : pos.x + noteSpacing;
                        currX = pos.x + progress * (nextX - pos.x) - scrollOffset;
                    } else if (curr.time >= pos.endTime) {
                        // Point is past this note, update to end of this note
                        const nextX = (j < notePositions.length - 1) ? notePositions[j + 1].x : pos.x + noteSpacing;
                        currX = nextX - scrollOffset;
                    }
                }

                // Calculate Y positions based on detected frequency
                const prevY = frequencyToStaffY(prev.frequency, clef, staffTop, lineSpacing);
                const currY = frequencyToStaffY(curr.frequency, clef, staffTop, lineSpacing);

                // Color based on cents deviation (use current point's accuracy)
                const absCents = Math.abs(curr.cents);
                let traceColor;
                if (absCents <= 15) {
                    traceColor = '#6bcb77'; // Green - very accurate
                } else if (absCents <= 30) {
                    traceColor = '#a8e6a3'; // Light green - good
                } else if (absCents <= 50) {
                    traceColor = '#ffd93d'; // Yellow - okay
                } else {
                    traceColor = '#ff6b6b'; // Red - off
                }

                ctx.strokeStyle = traceColor;
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(currX, currY);
                ctx.stroke();
            }
        }

        // Draw playhead line (only during active playback, not final trace)
        if (sequenceState.isPlaying && playbackTime >= 0) {
            ctx.strokeStyle = 'rgba(78, 205, 196, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(playheadX, 10);
            ctx.lineTo(playheadX, height - 10);
            ctx.stroke();
            ctx.setLineDash([]);

            // Show "GO!" for the first half beat of playback
            const goDisplayDuration = sequenceState.countdownBeatInterval * 0.5;
            if (playbackTime < goDisplayDuration) {
                const textY = 25;
                ctx.fillStyle = 'rgba(30, 30, 40, 1)';
                ctx.fillRect(playheadX - 30, textY - 22, 60, 44);
                ctx.fillStyle = '#6bcb77';
                ctx.font = 'bold 36px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('GO!', playheadX, textY);
            }
        }
    }
}

// Stop preview playback
function stopPreview() {
    if (!sequenceState.isPreviewing) return;

    // Stop current audio
    if (currentPreviewAudio) {
        currentPreviewAudio.stop();
        currentPreviewAudio = null;
    }

    sequenceState.isPreviewing = false;
    sequenceState.previewIndex = -1;
    previewBtn.textContent = 'Preview';
    previewBtn.classList.remove('recording');
    goBtn.disabled = false;
    stopPreviewScrollAnimation();
    drawSheetMusic(-1, -1);
}

// Preview sequence
function previewSequence() {
    if (sequenceState.isPlaying) return;

    // If already previewing, stop it
    if (sequenceState.isPreviewing) {
        stopPreview();
        return;
    }

    sequenceState.isPreviewing = true;
    sequenceState.previewIndex = 0;
    previewBtn.textContent = 'Stop';
    previewBtn.classList.add('recording');
    goBtn.disabled = true;

    const notes = sequenceState.currentSequence;

    // Calculate scroll parameters (same as in drawSheetMusic)
    const canvas = sheetMusicCanvas;
    const clefWidth = 40;
    const leftMargin = 15;
    const rightMargin = 15;
    const noteAreaWidth = canvas.width - leftMargin - clefWidth - rightMargin;
    const minNoteSpacing = 28;
    const idealNoteSpacing = Math.min(50, noteAreaWidth / notes.length);
    const noteSpacing = Math.max(minNoteSpacing, idealNoteSpacing);
    const notesStartX = leftMargin + clefWidth + noteSpacing / 2;
    const rightEdge = canvas.width - rightMargin - 10;
    const lastNoteX = notesStartX + (notes.length - 1) * noteSpacing;
    const maxScrollNeeded = Math.max(0, lastNoteX - rightEdge);

    // Build note positions (just X coordinates, timing syncs to audio callbacks)
    const notePositions = [];
    notes.forEach((note, i) => {
        notePositions.push({
            x: notesStartX + i * noteSpacing
        });
    });

    // Start smooth scroll animation
    startPreviewScrollAnimation(notePositions, noteSpacing, notesStartX, maxScrollNeeded);

    let index = 0;

    function playNext() {
        if (index >= notes.length || !sequenceState.isPreviewing) {
            sequenceState.isPreviewing = false;
            sequenceState.previewIndex = -1;
            previewBtn.textContent = 'Preview';
            previewBtn.classList.remove('recording');
            goBtn.disabled = false;
            currentPreviewAudio = null;
            stopPreviewScrollAnimation();
            drawSheetMusic(-1, -1); // Reset highlighting
            return;
        }

        const note = notes[index];
        const adjustedDuration = getAdjustedDuration(note.duration);
        const durationMs = adjustedDuration * 0.9; // Match audio timing
        const durationSec = durationMs / 1000;

        // Sync visual to this note starting
        onPreviewNoteStart(index, durationMs);

        playTone(note.frequency, durationSec, () => {
            index++;
            playNext();
        });
    }

    playNext();
}

// Start sequence challenge
async function startSequence() {
    if (sequenceState.isPlaying || sequenceState.isCountingDown) return;

    try {
        // Ensure audio context is warmed up and resumed
        await warmUpAudio();
        // Delay to ensure audio system is fully ready (longer for mobile)
        await new Promise(resolve => setTimeout(resolve, 100));
        const ctx = getAudioContext();

        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = ctx.createMediaStreamSource(micStream);

        analyser = ctx.createAnalyser();
        analyser.fftSize = 4096;
        source.connect(analyser);

        // Reset state
        sequenceState.currentNoteIndex = 0;
        sequenceState.noteScores = [];
        sequenceState.pitchSamplesForNote = [];
        sequenceState.pitchHistory = [];
        sequenceState.timeOnPitch = 0;
        recentPitches.length = 0;

        previewBtn.disabled = true;
        goBtn.textContent = 'Stop';
        goBtn.classList.add('recording');
        sequenceResults.style.display = 'none';
        // Note: visualization now integrated into sheet music, not using separate canvas
        // sequenceCanvasContainer.classList.add('active');

        // Start countdown
        sequenceState.isCountingDown = true;
        sequenceState.countdownValue = 3;
        updatePreviewNotesState();
        runCountdown();

    } catch (err) {
        console.error('Microphone error:', err);
        sequenceStatus.textContent = 'Error: Could not access microphone.';
    }
}

// Pre-created click sound buffer (created on first use)
let clickBuffer = null;

// Create or get the click sound buffer
function getClickBuffer(ctx) {
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

// Create a single buffer containing 3 countdown clicks with silence between
function createCountdownBuffer(ctx, beatIntervalSec, leadInSec = 0) {
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

// Trigger a visual pulse on the Go/Stop button
function triggerBeatPulse() {
    goBtn.classList.add('beat-pulse');
    setTimeout(() => {
        goBtn.classList.remove('beat-pulse');
    }, 100);
}

// Run countdown before starting
function runCountdown() {
    if (!sequenceState.isCountingDown) return;

    const ctx = getAudioContext();
    // Calculate quarter note beat interval from first note's duration and type
    const firstNote = sequenceState.currentSequence[0];
    const firstNoteDuration = getAdjustedDuration(firstNote.duration);
    const noteType = firstNote.noteType || NOTE_TYPES.QUARTER;

    // Convert to quarter note duration for countdown beat
    let beatIntervalMs;
    if (noteType === NOTE_TYPES.EIGHTH) {
        beatIntervalMs = firstNoteDuration * 2; // Eighth note = half a beat
    } else if (noteType === NOTE_TYPES.HALF) {
        beatIntervalMs = firstNoteDuration / 2; // Half note = 2 beats
    } else if (noteType === NOTE_TYPES.WHOLE) {
        beatIntervalMs = firstNoteDuration / 4; // Whole note = 4 beats
    } else {
        beatIntervalMs = firstNoteDuration; // Quarter note = 1 beat
    }

    const beatIntervalSec = beatIntervalMs / 1000;
    sequenceState.countdownBeatInterval = beatIntervalMs; // Store for use during playback

    // Add lead-in silence to let mobile audio fully initialize
    const leadInSec = 1.5;
    const leadInMs = leadInSec * 1000;

    // Create a single buffer with all 4 clicks baked in
    // This is more reliable than scheduling 4 separate sounds
    const countdownBuffer = createCountdownBuffer(ctx, beatIntervalSec, leadInSec);

    const source = ctx.createBufferSource();
    source.buffer = countdownBuffer;

    // Bandpass filter for woodblock-like tone
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1.5;

    source.connect(filter);
    filter.connect(ctx.destination);

    // Start playback immediately (buffer has lead-in silence)
    source.start(ctx.currentTime);

    // Record actual start time and when countdown begins (after lead-in)
    const actualStartTime = performance.now();
    const countdownStartTime = actualStartTime + leadInMs;

    // Initial visual state
    let lastDisplayedBeat = -1;
    let inLeadIn = true;

    // Show preparing state during lead-in
    sequenceStatus.textContent = 'Preparing...';
    drawCountdownVisualization(-1, 0); // -1 = preparing state, 0 = no progress yet

    // Use requestAnimationFrame for smooth visual updates
    function updateVisuals() {
        if (!sequenceState.isCountingDown) return;

        const now = performance.now();

        // During lead-in period
        if (now < countdownStartTime) {
            requestAnimationFrame(updateVisuals);
            return;
        }

        const elapsed = now - countdownStartTime;
        const currentBeat = Math.floor(elapsed / beatIntervalMs);
        const totalCountdownTime = beatIntervalMs * 3; // 3 beats total (3-2-1, then GO at first note)
        const progress = Math.min(elapsed / totalCountdownTime, 1); // 0 to 1

        // Update beat display and trigger pulse only when beat changes
        if (currentBeat !== lastDisplayedBeat) {
            lastDisplayedBeat = currentBeat;

            // Pulse the button on each beat
            triggerBeatPulse();

            if (currentBeat < 3) {
                const displayNumber = 3 - currentBeat;
                sequenceStatus.textContent = `Get ready... ${displayNumber}`;
            }
        }

        // Draw countdown visualization every frame for smooth playhead animation
        const displayNumber = currentBeat < 3 ? 3 - currentBeat : 0;
        drawCountdownVisualization(displayNumber, progress);

        // Check if countdown is complete (after 3 beats) - GO appears right at first note
        if (elapsed >= beatIntervalMs * 3) {
            sequenceStatus.textContent = 'Sing!';
            sequenceState.isCountingDown = false;
            sequenceState.isPlaying = true;
            sequenceState.noteStartTime = performance.now();
            sequenceState.sequenceStartTime = performance.now();
            sequenceState.globalPitchTrace = [];
            lastPlaybackBeat = -1; // Reset beat tracker for pulse
            lastSequenceSampleTime = 0;
            animationId = requestAnimationFrame(analyzeSequence);
            return;
        }

        requestAnimationFrame(updateVisuals);
    }

    requestAnimationFrame(updateVisuals);
}

// Draw countdown screen with notes scrolling towards fixed playhead
function drawCountdownVisualization(count, progress = 0) {
    const ctx = sheetMusicCtx;
    const width = sheetMusicCanvas.width;
    const height = sheetMusicCanvas.height;

    const sequence = sequenceState.currentSequence;
    if (sequence.length === 0) return;

    // Calculate note spacing (same as in drawSheetMusic)
    const clefWidth = 40;
    const leftMargin = 15;
    const rightMargin = 15;
    const noteAreaWidth = width - leftMargin - clefWidth - rightMargin;
    const noteSpacing = Math.min(50, noteAreaWidth / sequence.length);
    const notesStartX = leftMargin + clefWidth + noteSpacing / 2;

    // Notes start offset to the right and scroll left at quarter note speed
    // Countdown is 3 beats, so offset starts at 3 * noteSpacing and decreases to 0
    const maxOffset = 3 * noteSpacing;
    const noteOffsetX = maxOffset * (1 - progress);

    // Draw sheet music with first note highlighted and offset applied
    drawSheetMusic(0, 0, null, -1, false, noteOffsetX);

    // Playhead stays at fixed position (where first note will be when countdown ends)
    const playheadX = notesStartX;

    // Draw playhead line
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(playheadX, 10);
    ctx.lineTo(playheadX, height - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw countdown number or text above the staff at playhead position
    const textY = 25; // Above the staff (staff starts at y=55)

    if (count === -1) {
        // Preparing state (during lead-in) - opaque background
        ctx.fillStyle = 'rgba(30, 30, 40, 1)';
        ctx.fillRect(playheadX - 55, textY - 12, 110, 24);

        ctx.fillStyle = '#888';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Get ready...', playheadX, textY);
        return;
    }

    // Draw countdown number or "GO!" above the staff with opaque background
    const displayText = count === 0 ? 'GO!' : count.toString();
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(playheadX - 30, textY - 22, 60, 44);

    ctx.fillStyle = count === 0 ? '#6bcb77' : '#4ecdc4';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, playheadX, textY);
}

// Stop sequence
function stopSequence() {
    sequenceState.isPlaying = false;
    sequenceState.isCountingDown = false;

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }

    previewBtn.disabled = false;
    goBtn.textContent = 'Go';
    goBtn.classList.remove('recording');
    sequenceStatus.textContent = '';
}

// Update sheet music to show current/completed state
function updatePreviewNotesState() {
    drawSheetMusic(sequenceState.currentNoteIndex, sequenceState.currentNoteIndex);
}

// Analyze sequence (main loop during challenge)
let lastSequenceSampleTime = 0;
const sequenceSampleInterval = 1000 / 30;

// Track last beat for pulse during playback
let lastPlaybackBeat = -1;

function analyzeSequence(timestamp) {
    if (!sequenceState.isPlaying) return;

    const currentNote = sequenceState.currentSequence[sequenceState.currentNoteIndex];
    const adjustedDuration = getAdjustedDuration(currentNote.duration);
    const elapsed = timestamp - sequenceState.noteStartTime;

    // Pulse on quarter note beats
    const playbackElapsed = timestamp - sequenceState.sequenceStartTime;
    const currentBeat = Math.floor(playbackElapsed / sequenceState.countdownBeatInterval);
    if (currentBeat !== lastPlaybackBeat) {
        lastPlaybackBeat = currentBeat;
        triggerBeatPulse();
    }

    // Sample pitch at fixed rate
    if (timestamp - lastSequenceSampleTime >= sequenceSampleInterval) {
        lastSequenceSampleTime = timestamp;

        const buffer = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buffer);

        const rawPitch = detectPitch(buffer, audioContext.sampleRate);

        if (rawPitch !== -1 && rawPitch > 80 && rawPitch < 1000) {
            const pitch = getSmoothedPitch(rawPitch);
            const cents = getCentsDifference(pitch, currentNote.frequency);
            sequenceState.pitchSamplesForNote.push(cents);
            sequenceState.pitchHistory.push(cents);

            // Add to global pitch trace for integrated visualization
            sequenceState.globalPitchTrace.push({
                time: timestamp - sequenceState.sequenceStartTime,
                frequency: pitch,
                noteIndex: sequenceState.currentNoteIndex,
                cents: cents
            });

            if (Math.abs(cents) <= 50) {
                sequenceState.timeOnPitch += sequenceSampleInterval;
            }
        } else {
            sequenceState.pitchHistory.push(null);
        }
    }

    // Check if note time has expired (using tempo-adjusted duration)
    if (elapsed >= adjustedDuration) {
        advanceNote();
        // Check if sequence finished
        if (!sequenceState.isPlaying) return;
    }

    // Draw integrated visualization on sheet music
    const playbackTime = timestamp - sequenceState.sequenceStartTime;
    drawSheetMusic(sequenceState.currentNoteIndex, sequenceState.currentNoteIndex, sequenceState.noteScores, playbackTime);

    animationId = requestAnimationFrame(analyzeSequence);
}

// Advance to next note
function advanceNote() {
    const currentNote = sequenceState.currentSequence[sequenceState.currentNoteIndex];
    const adjustedDuration = getAdjustedDuration(currentNote.duration);
    const score = calculateNoteScore(
        sequenceState.pitchSamplesForNote,
        sequenceState.timeOnPitch,
        adjustedDuration
    );

    sequenceState.noteScores.push({
        note: currentNote.name,
        score: score,
        avgCents: sequenceState.pitchSamplesForNote.length > 0
            ? sequenceState.pitchSamplesForNote.reduce((a, b) => a + Math.abs(b), 0) / sequenceState.pitchSamplesForNote.length
            : 100,
        timeOnPitch: sequenceState.timeOnPitch,
        totalTime: currentNote.duration
    });

    sequenceState.currentNoteIndex++;
    sequenceState.pitchSamplesForNote = [];
    sequenceState.pitchHistory = [];  // Clear timeline for new note
    sequenceState.timeOnPitch = 0;
    sequenceState.noteStartTime = performance.now();
    recentPitches.length = 0;

    if (sequenceState.currentNoteIndex >= sequenceState.currentSequence.length) {
        finishSequence();
    } else {
        updatePreviewNotesState();
    }
}

// Calculate score for a single note
function calculateNoteScore(pitchSamples, timeOnPitch, totalTime) {
    if (pitchSamples.length === 0) {
        return 0;
    }

    // Accuracy score (60 points max) - based on average cents deviation (very lenient)
    const avgCents = pitchSamples.reduce((a, b) => a + Math.abs(b), 0) / pitchSamples.length;
    let accuracyScore;
    if (avgCents <= 25) {
        accuracyScore = 60;
    } else if (avgCents <= 50) {
        accuracyScore = 55;
    } else if (avgCents <= 75) {
        accuracyScore = 50;
    } else if (avgCents <= 100) {
        accuracyScore = 40;
    } else if (avgCents <= 150) {
        accuracyScore = 30;
    } else {
        accuracyScore = Math.max(10, 25 - (avgCents - 150) / 20);
    }

    // Time on pitch score (40 points max) - count within ±50 cents as "on pitch"
    const timeRatio = timeOnPitch / totalTime;
    const timeScore = timeRatio * 40;

    return Math.round(accuracyScore + timeScore);
}

// Finish sequence and show results
function finishSequence() {
    stopSequence();

    const totalScore = sequenceState.noteScores.reduce((a, b) => a + b.score, 0);
    const maxScore = sequenceState.noteScores.length * 100;
    const percentage = Math.round((totalScore / maxScore) * 100);

    let grade;
    if (percentage >= 85) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 55) grade = 'C';
    else if (percentage >= 40) grade = 'D';
    else grade = 'F';

    resultsGrade.textContent = grade;
    resultsGrade.className = `results-grade grade-${grade.toLowerCase()}`;
    resultsPercent.textContent = `${percentage}%`;

    resultsBreakdown.innerHTML = sequenceState.noteScores.map((ns, i) => {
        const scoreClass = ns.score >= 70 ? 'score-high' : ns.score >= 40 ? 'score-mid' : 'score-low';
        return `
            <div class="breakdown-item">
                <canvas class="breakdown-mini-staff" data-note-index="${i}" width="105" height="45"></canvas>
                <div class="breakdown-score">
                    <div class="breakdown-bar">
                        <div class="breakdown-fill ${scoreClass}" style="width: ${ns.score}%"></div>
                    </div>
                    <span class="breakdown-value">${ns.score}</span>
                </div>
            </div>
        `;
    }).join('');

    // Draw mini-staffs for each note
    const miniStaffCanvases = resultsBreakdown.querySelectorAll('.breakdown-mini-staff');
    miniStaffCanvases.forEach(canvas => {
        const noteIndex = parseInt(canvas.dataset.noteIndex);
        const score = sequenceState.noteScores[noteIndex].score;
        drawBreakdownMiniStaff(canvas, sequenceState.currentSequence, noteIndex, score);
    });

    sequenceResults.style.display = '';
    sequenceCanvasContainer.classList.remove('active');

    // Draw sheet music with performance-based coloring and final pitch trace
    drawSheetMusic(-1, -1, sequenceState.noteScores, -1, true);
}

// Draw sequence visualization
function drawSequenceVisualization(elapsed, totalDuration) {
    const width = sequenceCanvas.width;
    const height = sequenceCanvas.height;

    // Clear
    sequenceCtx.fillStyle = 'rgba(30, 30, 40, 1)';
    sequenceCtx.fillRect(0, 0, width, height);

    // Layout regions
    const headerHeight = 50;
    const timelineTop = headerHeight + 10;
    const timelineHeight = 100;
    const timeBarY = height - 25;

    // --- Header: Target note and upcoming notes ---
    const currentNote = sequenceState.currentSequence[sequenceState.currentNoteIndex];

    // Current target note (left side)
    sequenceCtx.fillStyle = 'rgba(78, 205, 196, 0.1)';
    sequenceCtx.beginPath();
    sequenceCtx.roundRect(10, 5, 80, 40, 8);
    sequenceCtx.fill();

    sequenceCtx.fillStyle = '#888';
    sequenceCtx.font = '10px sans-serif';
    sequenceCtx.textAlign = 'center';
    sequenceCtx.textBaseline = 'top';
    sequenceCtx.fillText('TARGET', 50, 8);

    sequenceCtx.fillStyle = '#4ecdc4';
    sequenceCtx.font = 'bold 20px sans-serif';
    sequenceCtx.textBaseline = 'middle';
    sequenceCtx.fillText(currentNote.name, 50, 32);

    // Upcoming notes (right side)
    const upcomingNotes = sequenceState.currentSequence.slice(sequenceState.currentNoteIndex + 1);
    const noteBlockWidth = 45;
    const noteBlockGap = 8;

    sequenceCtx.fillStyle = '#666';
    sequenceCtx.font = '10px sans-serif';
    sequenceCtx.textAlign = 'left';
    sequenceCtx.textBaseline = 'top';
    if (upcomingNotes.length > 0) {
        sequenceCtx.fillText('NEXT', 110, 8);
    }

    upcomingNotes.slice(0, 6).forEach((note, i) => {
        const x = 110 + i * (noteBlockWidth + noteBlockGap);
        if (x < width - noteBlockWidth) {
            sequenceCtx.fillStyle = 'rgba(78, 205, 196, 0.15)';
            sequenceCtx.strokeStyle = 'rgba(78, 205, 196, 0.4)';
            sequenceCtx.lineWidth = 1;
            sequenceCtx.beginPath();
            sequenceCtx.roundRect(x, 18, noteBlockWidth, 26, 6);
            sequenceCtx.fill();
            sequenceCtx.stroke();

            sequenceCtx.fillStyle = '#4ecdc4';
            sequenceCtx.font = 'bold 14px sans-serif';
            sequenceCtx.textAlign = 'center';
            sequenceCtx.textBaseline = 'middle';
            sequenceCtx.fillText(note.name, x + noteBlockWidth / 2, 31);
        }
    });

    // --- Timeline visualization (like free practice mode) ---
    const timelineX = 10;
    const timelineWidth = width - 20;
    const centerY = timelineTop + timelineHeight / 2;

    // On-pitch zone
    sequenceCtx.fillStyle = 'rgba(107, 203, 119, 0.15)';
    const onPitchHeight = (10 / 100) * (timelineHeight / 2 - 5) * 2;
    sequenceCtx.fillRect(timelineX, centerY - onPitchHeight / 2, timelineWidth, onPitchHeight);

    // Target line
    sequenceCtx.strokeStyle = '#6bcb77';
    sequenceCtx.lineWidth = 2;
    sequenceCtx.setLineDash([5, 5]);
    sequenceCtx.beginPath();
    sequenceCtx.moveTo(timelineX, centerY);
    sequenceCtx.lineTo(timelineX + timelineWidth, centerY);
    sequenceCtx.stroke();
    sequenceCtx.setLineDash([]);

    // Y-axis labels
    sequenceCtx.fillStyle = '#ff6b6b';
    sequenceCtx.font = '9px sans-serif';
    sequenceCtx.textAlign = 'left';
    sequenceCtx.textBaseline = 'top';
    sequenceCtx.fillText('Sharp', timelineX + 2, timelineTop + 2);

    sequenceCtx.fillStyle = '#ffd93d';
    sequenceCtx.textBaseline = 'bottom';
    sequenceCtx.fillText('Flat', timelineX + 2, timelineTop + timelineHeight - 2);

    // Draw pitch history - scale to note duration
    sequenceCtx.lineWidth = 3;
    sequenceCtx.lineCap = 'round';
    sequenceCtx.lineJoin = 'round';

    let lastValidPoint = null;
    const history = sequenceState.pitchHistory;

    // Calculate expected samples for this note's duration
    const expectedSamples = Math.ceil((totalDuration / 1000) * samplesPerSecond);

    for (let i = 0; i < history.length; i++) {
        const cents = history[i];
        if (cents === null) {
            lastValidPoint = null;
            continue;
        }

        // Scale x position to fill the timeline based on note duration
        const x = timelineX + (i / expectedSamples) * timelineWidth;
        const clampedCents = Math.max(-100, Math.min(100, cents));
        const y = centerY - (clampedCents / 100) * (timelineHeight / 2 - 5);

        if (Math.abs(cents) <= 10) {
            sequenceCtx.strokeStyle = '#6bcb77';
        } else if (Math.abs(cents) <= 25) {
            sequenceCtx.strokeStyle = '#ffd93d';
        } else {
            sequenceCtx.strokeStyle = '#ff6b6b';
        }

        if (lastValidPoint) {
            sequenceCtx.beginPath();
            sequenceCtx.moveTo(lastValidPoint.x, lastValidPoint.y);
            sequenceCtx.lineTo(x, y);
            sequenceCtx.stroke();
        }

        lastValidPoint = { x, y, cents };
    }

    // Current position indicator
    if (lastValidPoint) {
        sequenceCtx.beginPath();
        sequenceCtx.arc(lastValidPoint.x, lastValidPoint.y, 6, 0, Math.PI * 2);

        if (Math.abs(lastValidPoint.cents) <= 10) {
            sequenceCtx.fillStyle = '#6bcb77';
        } else if (Math.abs(lastValidPoint.cents) <= 25) {
            sequenceCtx.fillStyle = '#ffd93d';
        } else {
            sequenceCtx.fillStyle = '#ff6b6b';
        }
        sequenceCtx.fill();
        sequenceCtx.strokeStyle = 'white';
        sequenceCtx.lineWidth = 2;
        sequenceCtx.stroke();
    }

    // --- Time remaining bar ---
    const timeBarHeight = 10;
    const timeBarX = 10;
    const timeBarWidth = width - 20;
    const progress = elapsed / totalDuration;

    // Label
    sequenceCtx.fillStyle = '#666';
    sequenceCtx.font = '9px sans-serif';
    sequenceCtx.textAlign = 'center';
    sequenceCtx.textBaseline = 'bottom';
    sequenceCtx.fillText('TIME REMAINING', width / 2, timeBarY - 2);

    // Background
    sequenceCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    sequenceCtx.beginPath();
    sequenceCtx.roundRect(timeBarX, timeBarY, timeBarWidth, timeBarHeight, 4);
    sequenceCtx.fill();

    // Progress (shrinks as time passes)
    const progressColor = progress < 0.5 ? '#4ecdc4' : progress < 0.8 ? '#ffd93d' : '#ff6b6b';
    const remainingWidth = timeBarWidth * (1 - progress);
    if (remainingWidth > 0) {
        sequenceCtx.fillStyle = progressColor;
        sequenceCtx.beginPath();
        sequenceCtx.roundRect(timeBarX, timeBarY, remainingWidth, timeBarHeight, 4);
        sequenceCtx.fill();
    }
}

// Event listeners for sequence mode
modeFreeBtn.addEventListener('click', () => setMode('free'));
modeSequenceBtn.addEventListener('click', () => setMode('sequence'));

sequenceSelect.addEventListener('change', () => {
    const isCustom = sequenceSelect.value === 'custom';
    musicxmlImport.style.display = isCustom ? '' : 'none';
    // Hide part selector when not in custom mode
    if (!isCustom) {
        musicxmlPartSelector.style.display = 'none';
    }

    if (!isCustom) {
        loadSequence(sequenceSelect.value);
    } else {
        // Clear sheet music if no custom sequence loaded yet
        if (sequences['custom'].notes.length === 0) {
            sequenceState.currentSequence = [];
            drawSheetMusic();
        } else {
            loadSequence('custom');
        }
    }
});

startNoteSelect.addEventListener('change', () => {
    loadSequence(sequenceSelect.value);
});

startOctaveSelect.addEventListener('change', () => {
    loadSequence(sequenceSelect.value);
});

// Tempo control
tempoSlider.addEventListener('input', () => {
    tempoPercent = parseInt(tempoSlider.value);
    tempoDisplay.textContent = tempoPercent + '%';
});

previewBtn.addEventListener('click', previewSequence);

goBtn.addEventListener('click', () => {
    if (sequenceState.isPlaying || sequenceState.isCountingDown) {
        stopSequence();
    } else {
        startSequence();
    }
});

retryBtn.addEventListener('click', () => {
    sequenceResults.style.display = 'none';
    drawSheetMusic();
    startSequence();
});

// MusicXML file import handler
// Store parsed MusicXML document for part selection
let currentMusicXMLDoc = null;
let currentMusicXMLFilename = '';

musicxmlFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    musicxmlFilename.textContent = file.name;
    currentMusicXMLFilename = file.name;
    sequenceStatus.textContent = 'Loading...';
    musicxmlPartSelector.style.display = 'none';

    try {
        const text = await file.text();
        const { doc, parts } = getMusicXMLParts(text);
        currentMusicXMLDoc = doc;

        if (parts.length === 1) {
            // Single part - load directly
            const notes = parseMusicXMLPart(doc, parts[0].id);
            loadCustomSequence(notes, file.name);
        } else {
            // Multiple parts - show selector and auto-load first part
            musicxmlPartSelect.innerHTML = parts.map(p =>
                `<option value="${p.id}">${p.name}</option>`
            ).join('');
            musicxmlPartSelector.style.display = '';

            // Auto-load the first part
            const notes = parseMusicXMLPart(doc, parts[0].id);
            loadCustomSequence(notes, file.name);
        }
    } catch (err) {
        console.error('MusicXML parse error:', err);
        sequenceStatus.textContent = `Error: ${err.message}`;
        musicxmlFilename.textContent = '';
        currentMusicXMLDoc = null;
    }
});

// Handle part selection
musicxmlPartSelect.addEventListener('change', () => {
    if (!currentMusicXMLDoc) return;

    const partId = musicxmlPartSelect.value;
    try {
        const notes = parseMusicXMLPart(currentMusicXMLDoc, partId);
        loadCustomSequence(notes, currentMusicXMLFilename);
    } catch (err) {
        console.error('MusicXML parse error:', err);
        sequenceStatus.textContent = `Error: ${err.message}`;
    }
});

// Helper to load custom sequence
function loadCustomSequence(notes, filename) {
    sequences['custom'].notes = notes;

    // Set starting note selector to match the first note of the custom sequence
    if (notes.length > 0) {
        const firstNote = notes[0];
        startNoteSelect.value = firstNote.note;
        startOctaveSelect.value = firstNote.octave.toString();
    }

    loadSequence('custom');

    const partName = musicxmlPartSelector.style.display !== 'none'
        ? ` (${musicxmlPartSelect.options[musicxmlPartSelect.selectedIndex].text})`
        : '';
    sequenceStatus.textContent = `Loaded ${notes.length} notes from ${filename}${partName}`;
    setTimeout(() => {
        if (sequenceStatus.textContent.startsWith('Loaded')) {
            sequenceStatus.textContent = '';
        }
    }, 3000);
}

// Initialize with Song Practice mode (load default sequence)
setTimeout(() => {
    loadSequence(sequenceSelect.value || 'simple-scale');
}, 100);

// ============================================
// Note Selector - Visual Grand Staff Selection
// ============================================

// Note selector state
const noteSelectorState = {
    isOpen: false,
    mode: 'free', // 'free' or 'song'
    hoveredNote: null,
    selectedNote: null, // {note, octave} - pending selection before OK
    accidental: 'natural', // 'flat', 'natural', or 'sharp'
    notePositions: [] // Array of {note, octave, x, y, width, height} for hit detection
};

// Note selector DOM elements
const noteSelectorPopup = document.getElementById('note-selector-popup');
const noteSelectorClose = document.getElementById('note-selector-close');
const noteSelectorLabel = document.getElementById('note-selector-label');
const noteSelectorOk = document.getElementById('note-selector-ok');
const accidentalToggle = document.getElementById('accidental-toggle');
const accidentalBtns = accidentalToggle.querySelectorAll('.accidental-btn');
const grandStaffCanvas = document.getElementById('grand-staff-canvas');
const grandStaffCtx = grandStaffCanvas.getContext('2d');
const freePracticeMiniCanvas = document.getElementById('free-practice-mini-canvas');
const freePracticeMiniCtx = freePracticeMiniCanvas.getContext('2d');
const songPracticeMiniCanvas = document.getElementById('song-practice-mini-canvas');
const songPracticeMiniCtx = songPracticeMiniCanvas.getContext('2d');
const freePracticeMiniStaff = document.getElementById('free-practice-mini-staff');
const songPracticeMiniStaff = document.getElementById('song-practice-mini-staff');
const freeOctaveDown = document.getElementById('free-octave-down');
const freeOctaveUp = document.getElementById('free-octave-up');
const songOctaveDown = document.getElementById('song-octave-down');
const songOctaveUp = document.getElementById('song-octave-up');

// Natural notes only (no sharps/flats)
const naturalNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Generate note range from E2 to G5 (natural notes only)
function getNoteRange() {
    const notes = [];
    // E2 to G5: natural notes only
    for (let octave = 2; octave <= 5; octave++) {
        for (const note of naturalNotes) {
            // Skip notes before E2
            if (octave === 2 && naturalNotes.indexOf(note) < naturalNotes.indexOf('E')) continue;
            // Skip notes after G5
            if (octave === 5 && naturalNotes.indexOf(note) > naturalNotes.indexOf('G')) continue;
            notes.push({ note, octave });
        }
    }
    return notes;
}

// Draw a scaled treble clef for mini-staff using SVG path
function drawTrebleClefMini(ctx, x, staffTop, lineSpacing) {
    ctx.save();
    ctx.fillStyle = '#999';

    // Scale based on line spacing (base scale 0.50 for lineSpacing=10)
    const scale = (lineSpacing / 10) * 0.50;
    const offsetX = x - 4 * (lineSpacing / 10);
    // The G-circle in the SVG needs to align with G line (staffTop + 3*lineSpacing)
    const offsetY = staffTop - 1.75 * lineSpacing;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const path = new Path2D(TREBLE_CLEF_PATH);
    ctx.fill(path);

    ctx.restore();
}

// Draw a scaled bass clef for mini-staff using SVG path
function drawBassClefMini(ctx, x, staffTop, lineSpacing) {
    ctx.save();
    ctx.fillStyle = '#999';

    // Scale 0.75 for lineSpacing=10, position to align with F line
    const scale = (lineSpacing / 10) * 0.75;
    const offsetX = x + 6 * (lineSpacing / 10);
    const offsetY = staffTop - 0.3 * lineSpacing;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw main body
    const path = new Path2D(BASS_CLEF_PATH);
    ctx.fill(path);

    // Draw two dots (positions from original SVG)
    ctx.beginPath();
    ctx.arc(36, 9.5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(36, 22.6, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Get display name for a note with accidental
function getNoteDisplayName(note, octave) {
    // Handle sharp notation (C# -> C♯4)
    if (note.includes('#')) {
        return `${note.replace('#', '♯')}${octave}`;
    }
    // Handle flat notation (Db -> D♭4)
    if (note.includes('b')) {
        return `${note.replace('b', '♭')}${octave}`;
    }
    return `${note}${octave}`;
}

// Draw mini-staff with a single selected note
function drawMiniStaff(ctx, canvas, note, octave) {
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(0, 0, width, height);

    // Compact layout
    const staffTop = 12;
    const lineSpacing = 6;
    const clefWidth = 18;
    const leftMargin = 3;

    // Determine clef based on note (C4 and above use treble)
    const staffPos = getStaffPosition(note, octave);
    const clef = staffPos >= 28 ? 'treble' : 'bass';

    // Draw staff lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const y = staffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - 3, y);
        ctx.stroke();
    }

    // Draw clef
    if (clef === 'treble') {
        drawTrebleClefMini(ctx, leftMargin, staffTop, lineSpacing);
    } else {
        drawBassClefMini(ctx, leftMargin, staffTop, lineSpacing);
    }

    // Note position - close to clef with small gap
    const noteX = leftMargin + clefWidth + 12;
    const y = getYForStaffPosition(staffPos, clef, staffTop, lineSpacing);
    const isSharp = note.includes('#');
    const isFlat = note.includes('b');

    // Draw ledger lines
    drawMiniLedgerLines(ctx, noteX, y, staffTop, lineSpacing);

    // Draw note head (filled)
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.ellipse(noteX, y, 4, 3, -0.3, 0, 2 * Math.PI);
    ctx.fill();

    // Draw accidental if needed
    if (isSharp) {
        ctx.fillStyle = '#4ecdc4';
        ctx.font = 'bold 9px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u266F', noteX - 8, y);
    } else if (isFlat) {
        ctx.fillStyle = '#4ecdc4';
        ctx.font = 'bold 10px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u266D', noteX - 8, y);
    }

    // Draw note name below staff (centered under note)
    ctx.fillStyle = '#888';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(getNoteDisplayName(note, octave), noteX, height - 9);
}

// Draw ledger lines for mini-staff
function drawMiniLedgerLines(ctx, x, y, staffTop, lineSpacing) {
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;

    const bottomLine = staffTop + 4 * lineSpacing;
    const topLine = staffTop;

    if (y > bottomLine + lineSpacing / 2) {
        for (let ly = bottomLine + lineSpacing; ly <= y + lineSpacing / 2; ly += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 6, ly);
            ctx.lineTo(x + 6, ly);
            ctx.stroke();
        }
    }

    if (y < topLine - lineSpacing / 2) {
        for (let ly = topLine - lineSpacing; ly >= y - lineSpacing / 2; ly -= lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 6, ly);
            ctx.lineTo(x + 6, ly);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// Draw a mini-staff for results breakdown with context notes (prev/next shown faded)
function drawBreakdownMiniStaff(canvas, sequence, noteIndex, noteScore) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(0, 0, width, height);

    const currentNote = sequence[noteIndex];
    const prevNote = noteIndex > 0 ? sequence[noteIndex - 1] : null;
    const nextNote = noteIndex < sequence.length - 1 ? sequence[noteIndex + 1] : null;

    // Layout
    const staffTop = 12;
    const lineSpacing = 6;
    const clefWidth = 18;
    const leftMargin = 3;
    const noteSpacing = 20;

    // Determine clef based on current note
    const staffPos = getStaffPosition(currentNote.note, currentNote.octave);
    const clef = staffPos >= 28 ? 'treble' : 'bass';
    const staffMiddleY = staffTop + 2 * lineSpacing;

    // Draw staff lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const y = staffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - 3, y);
        ctx.stroke();
    }

    // Draw clef
    if (clef === 'treble') {
        drawTrebleClefMini(ctx, leftMargin, staffTop, lineSpacing);
    } else {
        drawBassClefMini(ctx, leftMargin, staffTop, lineSpacing);
    }

    // Calculate note positions - spread evenly across available space
    // Always use 3 positions for consistent layout (prev, center, next)
    const notesAreaStart = leftMargin + clefWidth + 10;
    const notesAreaEnd = width - 8;
    const notesAreaWidth = notesAreaEnd - notesAreaStart;
    const prevX = notesAreaStart;
    const centerX = notesAreaStart + notesAreaWidth * 0.35;
    const nextX = notesAreaStart + notesAreaWidth * 0.75;

    // Helper to draw a mini note with stem and dot
    function drawMiniNote(note, x, alpha, scoreValue) {
        const pos = getStaffPosition(note.note, note.octave);
        const y = getYForStaffPosition(pos, clef, staffTop, lineSpacing);
        const isSharp = note.note.includes('#');
        const noteType = note.noteType || NOTE_TYPES.QUARTER;
        const dotted = note.dotted || false;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw ledger lines
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        const bottomLine = staffTop + 4 * lineSpacing;
        const topLine = staffTop;
        if (y > bottomLine + lineSpacing / 2) {
            for (let ly = bottomLine + lineSpacing; ly <= y + lineSpacing / 2; ly += lineSpacing) {
                ctx.beginPath();
                ctx.moveTo(x - 5, ly);
                ctx.lineTo(x + 5, ly);
                ctx.stroke();
            }
        }
        if (y < topLine - lineSpacing / 2) {
            for (let ly = topLine - lineSpacing; ly >= y - lineSpacing / 2; ly -= lineSpacing) {
                ctx.beginPath();
                ctx.moveTo(x - 5, ly);
                ctx.lineTo(x + 5, ly);
                ctx.stroke();
            }
        }

        // Determine color
        let noteColor;
        if (scoreValue !== null) {
            if (scoreValue >= 70) noteColor = '#6bcb77';
            else if (scoreValue >= 40) noteColor = '#ffd93d';
            else noteColor = '#ff6b6b';
        } else {
            noteColor = '#666';
        }
        ctx.fillStyle = noteColor;
        ctx.strokeStyle = noteColor;

        // Mini note dimensions (scaled down from main)
        const noteWidth = 4;
        const noteHeight = 3;
        const stemHeight = 16;
        const isHollow = noteType === NOTE_TYPES.WHOLE || noteType === NOTE_TYPES.HALF;
        const hasStem = noteType !== NOTE_TYPES.WHOLE;
        const hasFlag = noteType === NOTE_TYPES.EIGHTH;
        const stemDown = y <= staffMiddleY;

        // Draw note head
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (noteType === NOTE_TYPES.WHOLE) {
            ctx.ellipse(x, y, noteWidth + 1, noteHeight, 0, 0, 2 * Math.PI);
        } else {
            ctx.ellipse(x, y, noteWidth, noteHeight, -0.3, 0, 2 * Math.PI);
        }
        if (isHollow) {
            ctx.stroke();
        } else {
            ctx.fill();
        }

        // Draw stem
        if (hasStem) {
            ctx.lineWidth = 1;
            if (stemDown) {
                ctx.beginPath();
                ctx.moveTo(x - noteWidth + 1, y);
                ctx.lineTo(x - noteWidth + 1, y + stemHeight);
                ctx.stroke();
                // Flag for eighth notes
                if (hasFlag) {
                    ctx.beginPath();
                    ctx.moveTo(x - noteWidth + 1, y + stemHeight);
                    ctx.quadraticCurveTo(x + 2, y + stemHeight - 4, x + 4, y + stemHeight - 10);
                    ctx.stroke();
                }
            } else {
                ctx.beginPath();
                ctx.moveTo(x + noteWidth - 1, y);
                ctx.lineTo(x + noteWidth - 1, y - stemHeight);
                ctx.stroke();
                if (hasFlag) {
                    ctx.beginPath();
                    ctx.moveTo(x + noteWidth - 1, y - stemHeight);
                    ctx.quadraticCurveTo(x + 6, y - stemHeight + 4, x + 8, y - stemHeight + 10);
                    ctx.stroke();
                }
            }
        }

        // Draw dot
        if (dotted) {
            ctx.beginPath();
            ctx.arc(x + noteWidth + 3, y, 1.5, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Draw accidental
        if (isSharp) {
            ctx.font = 'bold 8px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('\u266F', x - 7, y);
        }

        ctx.restore();
    }

    // Draw context notes first (faded, no score coloring)
    if (prevNote) {
        drawMiniNote(prevNote, prevX, 0.5, null);
    }
    if (nextNote) {
        drawMiniNote(nextNote, nextX, 0.5, null);
    }

    // Draw main note (full opacity, colored by score)
    drawMiniNote(currentNote, centerX, 1.0, noteScore);

    // Draw pitch trace for this note
    const noteSamples = sequenceState.globalPitchTrace.filter(s => s.noteIndex === noteIndex);
    if (noteSamples.length > 1) {
        // Get time bounds for this note
        const noteStartTime = noteSamples[0].time;
        const noteEndTime = noteSamples[noteSamples.length - 1].time;
        const noteDuration = noteEndTime - noteStartTime;

        // X range for the trace - starts after main note, always ends at next note position
        const traceStartX = centerX + 6;
        const traceEndX = nextX - 6;
        const traceWidth = traceEndX - traceStartX;

        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < noteSamples.length; i++) {
            const prev = noteSamples[i - 1];
            const curr = noteSamples[i];

            // Map time to X position
            const prevProgress = noteDuration > 0 ? (prev.time - noteStartTime) / noteDuration : 0;
            const currProgress = noteDuration > 0 ? (curr.time - noteStartTime) / noteDuration : 0;
            const prevTraceX = traceStartX + prevProgress * traceWidth;
            const currTraceX = traceStartX + currProgress * traceWidth;

            // Map frequency to Y position
            const prevY = frequencyToStaffY(prev.frequency, clef, staffTop, lineSpacing);
            const currY = frequencyToStaffY(curr.frequency, clef, staffTop, lineSpacing);

            // Color based on cents deviation
            const absCents = Math.abs(curr.cents);
            let traceColor;
            if (absCents <= 15) {
                traceColor = '#6bcb77';
            } else if (absCents <= 30) {
                traceColor = '#a8e6a3';
            } else if (absCents <= 50) {
                traceColor = '#ffd93d';
            } else {
                traceColor = '#ff6b6b';
            }

            ctx.strokeStyle = traceColor;
            ctx.beginPath();
            ctx.moveTo(prevTraceX, prevY);
            ctx.lineTo(currTraceX, currY);
            ctx.stroke();
        }
    }
}

// Draw a selectable note on grand staff (hollow whole note with hover state)
function drawSelectableNote(ctx, x, y, isHovered, isSelected) {
    ctx.save();

    // Determine color
    let noteColor;
    if (isSelected) {
        noteColor = '#4ecdc4';
    } else if (isHovered) {
        noteColor = '#6bcb77';
    } else {
        noteColor = '#bbb';
    }
    ctx.strokeStyle = noteColor;
    ctx.fillStyle = noteColor;

    // Note head (hollow whole note style)
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 5, 0, 0, 2 * Math.PI);
    if (isSelected || isHovered) {
        ctx.fill();
    } else {
        ctx.stroke();
    }

    ctx.restore();
}

// Draw grand staff selector with all notes from E2 to G5
function drawGrandStaffSelector() {
    const canvas = grandStaffCanvas;
    const ctx = grandStaffCtx;
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(0, 0, width, height);

    // Layout - stacked: treble notes on treble staff, bass notes on bass staff
    const trebleStaffTop = 15;
    const bassStaffTop = 115;
    const lineSpacing = 10;
    const leftMargin = 5;
    const clefWidth = 45;

    // Split notes into treble (C4+) and bass (below C4)
    const noteRange = getNoteRange();
    const trebleNotes = noteRange.filter(n => getStaffPosition(n.note, n.octave) >= 28);
    const bassNotes = noteRange.filter(n => getStaffPosition(n.note, n.octave) < 28);

    // Calculate spacing for each staff
    const trebleNoteSpacing = (width - clefWidth - 15) / trebleNotes.length;
    const bassNoteSpacing = (width - clefWidth - 15) / bassNotes.length;

    // Draw treble staff
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const y = trebleStaffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - 5, y);
        ctx.stroke();
    }

    // Draw bass staff
    for (let i = 0; i < 5; i++) {
        const y = bassStaffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - 5, y);
        ctx.stroke();
    }

    // Draw clefs
    drawTrebleClef(ctx, leftMargin, trebleStaffTop, lineSpacing);
    drawBassClef(ctx, leftMargin, bassStaffTop, lineSpacing);

    // Clear note positions for hit detection
    noteSelectorState.notePositions = [];

    // Draw treble notes (C4 to G5)
    trebleNotes.forEach((noteInfo, i) => {
        const x = clefWidth + i * trebleNoteSpacing + trebleNoteSpacing / 2;
        const staffPos = getStaffPosition(noteInfo.note, noteInfo.octave);
        const y = getYForStaffPosition(staffPos, 'treble', trebleStaffTop, lineSpacing);

        const isHovered = noteSelectorState.hoveredNote &&
            noteSelectorState.hoveredNote.note === noteInfo.note &&
            noteSelectorState.hoveredNote.octave === noteInfo.octave;
        const isSelected = noteSelectorState.selectedNote &&
            noteSelectorState.selectedNote.note === noteInfo.note &&
            noteSelectorState.selectedNote.octave === noteInfo.octave;

        // Draw ledger lines
        drawGrandStaffLedgerLines(ctx, x, y, trebleStaffTop, lineSpacing);

        // Draw the note
        drawSelectableNote(ctx, x, y, isHovered, isSelected);

        // Store position for hit detection
        noteSelectorState.notePositions.push({
            note: noteInfo.note,
            octave: noteInfo.octave,
            x: x - 10,
            y: y - 10,
            width: 20,
            height: 20
        });
    });

    // Draw bass notes (E2 to B3)
    bassNotes.forEach((noteInfo, i) => {
        const x = clefWidth + i * bassNoteSpacing + bassNoteSpacing / 2;
        const staffPos = getStaffPosition(noteInfo.note, noteInfo.octave);
        const y = getYForStaffPosition(staffPos, 'bass', bassStaffTop, lineSpacing);

        const isHovered = noteSelectorState.hoveredNote &&
            noteSelectorState.hoveredNote.note === noteInfo.note &&
            noteSelectorState.hoveredNote.octave === noteInfo.octave;
        const isSelected = noteSelectorState.selectedNote &&
            noteSelectorState.selectedNote.note === noteInfo.note &&
            noteSelectorState.selectedNote.octave === noteInfo.octave;

        // Draw ledger lines
        drawGrandStaffLedgerLines(ctx, x, y, bassStaffTop, lineSpacing);

        // Draw the note
        drawSelectableNote(ctx, x, y, isHovered, isSelected);

        // Store position for hit detection
        noteSelectorState.notePositions.push({
            note: noteInfo.note,
            octave: noteInfo.octave,
            x: x - 10,
            y: y - 10,
            width: 20,
            height: 20
        });
    });
}

// Draw ledger lines for grand staff (handles middle C area)
function drawGrandStaffLedgerLines(ctx, x, y, staffTop, lineSpacing) {
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;

    const bottomLine = staffTop + 4 * lineSpacing;
    const topLine = staffTop;

    // Below staff
    if (y > bottomLine + lineSpacing / 2) {
        for (let ly = bottomLine + lineSpacing; ly <= y + lineSpacing / 2; ly += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 10, ly);
            ctx.lineTo(x + 10, ly);
            ctx.stroke();
        }
    }

    // Above staff
    if (y < topLine - lineSpacing / 2) {
        for (let ly = topLine - lineSpacing; ly >= y - lineSpacing / 2; ly -= lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 10, ly);
            ctx.lineTo(x + 10, ly);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// Get note at canvas position (hit detection)
function getNoteAtPosition(x, y) {
    for (const pos of noteSelectorState.notePositions) {
        if (x >= pos.x && x <= pos.x + pos.width &&
            y >= pos.y && y <= pos.y + pos.height) {
            return { note: pos.note, octave: pos.octave };
        }
    }
    return null;
}

// Get the base note from a note that may have accidentals
function getBaseNote(note) {
    return note.replace('#', '').replace('b', '');
}

// Get the accidental from a note string
function getAccidentalFromNote(note) {
    if (note.includes('#')) return 'sharp';
    if (note.includes('b')) return 'flat';
    return 'natural';
}

// Apply accidental to a base note
function applyAccidental(baseNote, accidental) {
    if (accidental === 'sharp') return baseNote + '#';
    if (accidental === 'flat') return baseNote + 'b';
    return baseNote;
}

// Convert flat notes to their enharmonic sharp equivalents for dropdown compatibility
// Returns { note, octave } with adjusted octave if needed (e.g., Cb -> B of lower octave)
function flatToSharpEquivalent(note, octave) {
    if (!note.includes('b')) return { note, octave };

    const baseNote = note.replace('b', '');
    const flatToSharp = {
        'D': { note: 'C#', octaveAdjust: 0 },
        'E': { note: 'D#', octaveAdjust: 0 },
        'G': { note: 'F#', octaveAdjust: 0 },
        'A': { note: 'G#', octaveAdjust: 0 },
        'B': { note: 'A#', octaveAdjust: 0 },
        'C': { note: 'B', octaveAdjust: -1 },  // Cb -> B of lower octave
        'F': { note: 'E', octaveAdjust: 0 }    // Fb -> E (rare but handle it)
    };

    const equiv = flatToSharp[baseNote];
    if (equiv) {
        return { note: equiv.note, octave: octave + equiv.octaveAdjust };
    }
    return { note, octave };
}

// Update the accidental toggle UI
function updateAccidentalToggle(accidental) {
    accidentalBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.accidental === accidental);
    });
}

// Update the note selector label
function updateNoteSelectorLabel() {
    if (noteSelectorState.selectedNote) {
        const { note, octave } = noteSelectorState.selectedNote;
        const finalNote = applyAccidental(note, noteSelectorState.accidental);
        noteSelectorLabel.textContent = getNoteDisplayName(finalNote, octave);
        noteSelectorLabel.classList.add('note-selected');
        noteSelectorOk.disabled = false;
    } else {
        noteSelectorLabel.textContent = 'Select a note';
        noteSelectorLabel.classList.remove('note-selected');
        noteSelectorOk.disabled = true;
    }
}

// Open note selector popup
function openNoteSelector(mode) {
    noteSelectorState.mode = mode;
    noteSelectorState.isOpen = true;
    noteSelectorState.hoveredNote = null;

    // Get current selection and parse it
    let currentNote, currentOctave;
    if (mode === 'free') {
        currentNote = noteSelect.value;
        currentOctave = parseInt(octaveSelect.value);
    } else {
        currentNote = startNoteSelect.value;
        currentOctave = parseInt(startOctaveSelect.value);
    }

    // Set initial state from current selection
    const baseNote = getBaseNote(currentNote);
    const accidental = getAccidentalFromNote(currentNote);
    noteSelectorState.selectedNote = { note: baseNote, octave: currentOctave };
    noteSelectorState.accidental = accidental;

    // Update UI
    updateAccidentalToggle(accidental);
    updateNoteSelectorLabel();
    noteSelectorPopup.classList.add('active');
    drawGrandStaffSelector();
}

// Close note selector popup
function closeNoteSelector() {
    noteSelectorState.isOpen = false;
    noteSelectorState.hoveredNote = null;
    noteSelectorState.selectedNote = null;
    noteSelectorPopup.classList.remove('active');
}

// Handle clicking a note on the grand staff (sets pending selection)
function handleNoteClick(note, octave) {
    noteSelectorState.selectedNote = { note, octave };
    updateNoteSelectorLabel();
    drawGrandStaffSelector();
}

// Confirm selection and apply to appropriate mode
function confirmNoteSelection() {
    if (!noteSelectorState.selectedNote) return;

    const { note, octave } = noteSelectorState.selectedNote;
    const finalNote = applyAccidental(note, noteSelectorState.accidental);

    // Convert flats to sharp equivalents for dropdown compatibility
    const { note: dropdownNote, octave: dropdownOctave } = flatToSharpEquivalent(finalNote, octave);

    if (noteSelectorState.mode === 'free') {
        noteSelect.value = dropdownNote;
        octaveSelect.value = dropdownOctave.toString();
        updateCurrentNote();
        // Mini-staff will be redrawn by updateCurrentNote
    } else {
        startNoteSelect.value = dropdownNote;
        startOctaveSelect.value = dropdownOctave.toString();
        loadSequence(sequenceSelect.value);
        // Mini-staff will be redrawn by loadSequence -> updateSongPracticeMiniStaff
    }
    closeNoteSelector();
}

// Initialize note selector event listeners
function initNoteSelector() {
    // Mini-staff click handlers
    freePracticeMiniStaff.addEventListener('click', () => {
        openNoteSelector('free');
    });

    songPracticeMiniStaff.addEventListener('click', () => {
        openNoteSelector('song');
    });

    // Close button
    noteSelectorClose.addEventListener('click', closeNoteSelector);

    // OK button
    noteSelectorOk.addEventListener('click', confirmNoteSelection);

    // Accidental toggle buttons
    accidentalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            noteSelectorState.accidental = btn.dataset.accidental;
            updateAccidentalToggle(noteSelectorState.accidental);
            updateNoteSelectorLabel();
        });
    });

    // Click outside to close
    noteSelectorPopup.addEventListener('click', (e) => {
        if (e.target === noteSelectorPopup) {
            closeNoteSelector();
        }
    });

    // Grand staff mouse/touch events
    grandStaffCanvas.addEventListener('mousemove', (e) => {
        const rect = grandStaffCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const noteInfo = getNoteAtPosition(x, y);

        if (noteInfo) {
            noteSelectorState.hoveredNote = noteInfo;
        } else {
            noteSelectorState.hoveredNote = null;
        }
        drawGrandStaffSelector();
    });

    grandStaffCanvas.addEventListener('mouseleave', () => {
        noteSelectorState.hoveredNote = null;
        drawGrandStaffSelector();
    });

    grandStaffCanvas.addEventListener('click', (e) => {
        const rect = grandStaffCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const noteInfo = getNoteAtPosition(x, y);

        if (noteInfo) {
            handleNoteClick(noteInfo.note, noteInfo.octave);
        }
    });

    // Touch support for mobile
    grandStaffCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = grandStaffCanvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const noteInfo = getNoteAtPosition(x, y);

        if (noteInfo) {
            noteSelectorState.hoveredNote = noteInfo;
            drawGrandStaffSelector();
        }
    });

    grandStaffCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (noteSelectorState.hoveredNote) {
            handleNoteClick(noteSelectorState.hoveredNote.note, noteSelectorState.hoveredNote.octave);
            noteSelectorState.hoveredNote = null;
        }
    });

    // Keyboard support (Escape to close, Enter to confirm)
    document.addEventListener('keydown', (e) => {
        if (!noteSelectorState.isOpen) return;
        if (e.key === 'Escape') {
            closeNoteSelector();
        } else if (e.key === 'Enter' && noteSelectorState.selectedNote) {
            confirmNoteSelection();
        }
    });

    // Octave button handlers
    freeOctaveDown.addEventListener('click', () => shiftFreeOctave(-1));
    freeOctaveUp.addEventListener('click', () => shiftFreeOctave(1));
    songOctaveDown.addEventListener('click', () => shiftSongOctave(-1));
    songOctaveUp.addEventListener('click', () => shiftSongOctave(1));

    // Initialize mini-staffs with current selections
    const freeNote = noteSelect.value;
    const freeOctave = parseInt(octaveSelect.value);
    drawMiniStaff(freePracticeMiniCtx, freePracticeMiniCanvas, freeNote, freeOctave);

    const songNote = startNoteSelect.value;
    const songOctave = parseInt(startOctaveSelect.value);
    drawMiniStaff(songPracticeMiniCtx, songPracticeMiniCanvas, songNote, songOctave);

    // Initialize octave button states
    updateOctaveButtonStates();
}

// Sync mini-staff when note changes via original dropdowns (if ever used)
const originalUpdateCurrentNote = updateCurrentNote;
updateCurrentNote = function() {
    originalUpdateCurrentNote();
    const note = noteSelect.value;
    const octave = parseInt(octaveSelect.value);
    drawMiniStaff(freePracticeMiniCtx, freePracticeMiniCanvas, note, octave);
    updateOctaveButtonStates();
};

// Helper function to update song practice mini-staff (called from loadSequence)
function updateSongPracticeMiniStaff() {
    const songNote = startNoteSelect.value;
    const songOctave = parseInt(startOctaveSelect.value);
    drawMiniStaff(songPracticeMiniCtx, songPracticeMiniCanvas, songNote, songOctave);
    updateOctaveButtonStates();
}

// Check if a note/octave is within the valid range (E2 to G5)
function isNoteInRange(note, octave) {
    const baseNote = getBaseNote(note);
    const staffPos = getStaffPosition(baseNote, octave);
    const minPos = getStaffPosition('E', 2); // E2
    const maxPos = getStaffPosition('G', 5); // G5
    return staffPos >= minPos && staffPos <= maxPos;
}

// Update octave button disabled states
function updateOctaveButtonStates() {
    // Free practice mode
    const freeNote = noteSelect.value;
    const freeOctave = parseInt(octaveSelect.value);
    freeOctaveDown.disabled = !isNoteInRange(freeNote, freeOctave - 1);
    freeOctaveUp.disabled = !isNoteInRange(freeNote, freeOctave + 1);

    // Song practice mode
    const songNote = startNoteSelect.value;
    const songOctave = parseInt(startOctaveSelect.value);
    songOctaveDown.disabled = !isNoteInRange(songNote, songOctave - 1);
    songOctaveUp.disabled = !isNoteInRange(songNote, songOctave + 1);
}

// Shift octave for free practice
function shiftFreeOctave(direction) {
    const currentOctave = parseInt(octaveSelect.value);
    const newOctave = currentOctave + direction;
    if (isNoteInRange(noteSelect.value, newOctave)) {
        octaveSelect.value = newOctave.toString();
        updateCurrentNote();
    }
}

// Shift octave for song practice
function shiftSongOctave(direction) {
    const currentOctave = parseInt(startOctaveSelect.value);
    const newOctave = currentOctave + direction;
    if (isNoteInRange(startNoteSelect.value, newOctave)) {
        startOctaveSelect.value = newOctave.toString();
        loadSequence(sequenceSelect.value);
    }
}

// Initialize note selector on page load
initNoteSelector();
