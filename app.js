// Audio context and nodes
let audioContext = null;
let analyser = null;
let micStream = null;

// State
let isRunning = false;
let animationId = null;

// Note frequencies
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Predefined sequences
const sequences = {
    'simple-scale': {
        name: 'Simple Scale (C-E)',
        notes: [
            { note: 'C', octave: 3, duration: 1800 },
            { note: 'D', octave: 3, duration: 1800 },
            { note: 'E', octave: 3, duration: 1800 }
        ]
    },
    'octave-jump': {
        name: 'Octave Jump',
        notes: [
            { note: 'C', octave: 3, duration: 1500 },
            { note: 'C', octave: 4, duration: 1500 },
            { note: 'C', octave: 3, duration: 1500 }
        ]
    },
    'major-arpeggio': {
        name: 'Major Arpeggio',
        notes: [
            { note: 'C', octave: 3, duration: 1200 },
            { note: 'E', octave: 3, duration: 1200 },
            { note: 'G', octave: 3, duration: 1200 },
            { note: 'C', octave: 4, duration: 1200 }
        ]
    },
    'full-scale': {
        name: 'Full Scale Up',
        notes: [
            { note: 'C', octave: 3, duration: 1000 },
            { note: 'D', octave: 3, duration: 1000 },
            { note: 'E', octave: 3, duration: 1000 },
            { note: 'F', octave: 3, duration: 1000 },
            { note: 'G', octave: 3, duration: 1000 },
            { note: 'A', octave: 3, duration: 1000 },
            { note: 'B', octave: 3, duration: 1000 },
            { note: 'C', octave: 4, duration: 1000 }
        ]
    }
};

// Sequence state
const sequenceState = {
    isSequenceMode: false,
    isPlaying: false,
    isPreviewing: false,
    isCountingDown: false,
    countdownValue: 0,
    currentSequence: [],
    currentNoteIndex: 0,
    noteStartTime: 0,
    noteScores: [],
    pitchSamplesForNote: [],
    pitchHistory: [],          // Timeline history for visualization
    timeOnPitch: 0
};

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
        // Play a very short silent tone to prime the audio system
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, ctx.currentTime); // Silent
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.01);
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

// Play reference tone
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

        if (callback) {
            setTimeout(callback, duration * 1000);
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
    if (!seq) return;

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

// Draw a treble clef
function drawTrebleClef(ctx, x, staffTop, lineSpacing) {
    ctx.save();
    ctx.strokeStyle = '#999';
    ctx.fillStyle = '#999';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // G line is the second line from bottom (staffTop + 3 * lineSpacing)
    const gLineY = staffTop + 3 * lineSpacing;
    const cx = x + 18;

    // Draw using a series of arcs and lines to form treble clef shape
    // Vertical line through the clef
    ctx.beginPath();
    ctx.moveTo(cx, staffTop - 5);
    ctx.lineTo(cx, staffTop + 4.5 * lineSpacing);
    ctx.stroke();

    // Main curved part that wraps around G line
    ctx.beginPath();
    ctx.arc(cx - 1, gLineY, lineSpacing * 0.9, 0, Math.PI * 1.9);
    ctx.stroke();

    // Upper spiral
    ctx.beginPath();
    ctx.arc(cx + 2, staffTop + 1.2 * lineSpacing, lineSpacing * 1.1, Math.PI * 0.5, Math.PI * 2);
    ctx.stroke();

    // Bottom curl
    ctx.beginPath();
    ctx.arc(cx - 5, staffTop + 4.8 * lineSpacing, lineSpacing * 0.5, Math.PI * 1.5, Math.PI * 0.8);
    ctx.stroke();

    ctx.restore();
}

// Draw a bass clef using bezier curves
function drawBassClef(ctx, x, staffTop, lineSpacing) {
    ctx.save();
    ctx.strokeStyle = '#999';
    ctx.fillStyle = '#999';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const scale = lineSpacing / 10;
    const cx = x + 12;
    const cy = staffTop + lineSpacing; // Center on F line

    // Main curve
    ctx.beginPath();
    ctx.arc(cx, cy + 2*scale, 8*scale, -0.8 * Math.PI, 0.5 * Math.PI);
    ctx.stroke();

    // Head dot
    ctx.beginPath();
    ctx.arc(cx - 2*scale, cy - 2*scale, 3.5*scale, 0, 2 * Math.PI);
    ctx.fill();

    // Two dots
    ctx.beginPath();
    ctx.arc(cx + 14*scale, cy - 3*scale, 2*scale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 14*scale, cy + 7*scale, 2*scale, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
}

// Draw a note with stem
function drawNote(ctx, x, y, isSharp, isActive, isCompleted, staffMiddleY, score = null) {
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

    // Draw filled note head (oval, slightly tilted)
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, noteWidth, noteHeight, -0.3, 0, 2 * Math.PI);
    ctx.fill();

    // Draw stem
    const stemHeight = 30;
    const stemWidth = 1.5;

    // Stem goes down (left side) if note is on or above middle line, up (right side) if below
    if (y <= staffMiddleY) {
        // Stem down (on left side of note)
        ctx.fillRect(x - noteWidth + 1, y, stemWidth, stemHeight);
    } else {
        // Stem up (on right side of note)
        ctx.fillRect(x + noteWidth - stemWidth - 1, y - stemHeight, stemWidth, stemHeight);
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

// Main function to draw sheet music
function drawSheetMusic(activeIndex = -1, completedUpTo = -1, noteScores = null) {
    const canvas = sheetMusicCanvas;
    const ctx = sheetMusicCtx;
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(0, 0, width, height);

    const sequence = sequenceState.currentSequence;
    if (sequence.length === 0) return;

    // Layout
    const staffTop = 35;
    const lineSpacing = 10;
    const clef = getBestClef(sequence);
    const clefWidth = 40;
    const leftMargin = 15;
    const rightMargin = 15;
    const noteAreaWidth = width - leftMargin - clefWidth - rightMargin;
    const noteSpacing = Math.min(50, noteAreaWidth / sequence.length);
    const notesStartX = leftMargin + clefWidth + noteSpacing / 2;

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

    // Draw notes
    sequence.forEach((note, i) => {
        const x = notesStartX + i * noteSpacing;
        const staffPos = getStaffPosition(note.note, note.octave);
        const y = getYForStaffPosition(staffPos, clef, staffTop, lineSpacing);
        const isSharp = note.note.includes('#');
        const isActive = i === activeIndex;
        const isCompleted = i < completedUpTo;
        const score = noteScores && noteScores[i] ? noteScores[i].score : null;

        // Draw ledger lines if needed
        drawLedgerLines(ctx, x, y, staffTop, lineSpacing, clef);

        // Draw the note
        drawNote(ctx, x, y, isSharp, isActive, isCompleted, staffMiddleY, score);
    });
}

// Preview sequence
function previewSequence() {
    if (sequenceState.isPreviewing || sequenceState.isPlaying) return;

    sequenceState.isPreviewing = true;
    previewBtn.disabled = true;
    goBtn.disabled = true;

    const notes = sequenceState.currentSequence;
    let index = 0;

    function playNext() {
        if (index >= notes.length) {
            sequenceState.isPreviewing = false;
            previewBtn.disabled = false;
            goBtn.disabled = false;
            drawSheetMusic(-1, -1); // Reset highlighting
            return;
        }

        // Highlight current note on sheet music
        drawSheetMusic(index, index);

        const note = notes[index];
        playTone(note.frequency, 0.8, () => {
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
        sequenceCanvasContainer.classList.add('active');

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

// Run countdown before starting
function runCountdown() {
    if (!sequenceState.isCountingDown) return;

    if (sequenceState.countdownValue > 0) {
        sequenceStatus.textContent = `Get ready... ${sequenceState.countdownValue}`;
        drawCountdownVisualization(sequenceState.countdownValue);
        sequenceState.countdownValue--;
        setTimeout(runCountdown, 1000);
    } else {
        // Countdown finished, start the challenge
        sequenceState.isCountingDown = false;
        sequenceState.isPlaying = true;
        sequenceState.noteStartTime = performance.now();
        sequenceStatus.textContent = 'Sing!';
        lastSequenceSampleTime = 0;
        animationId = requestAnimationFrame(analyzeSequence);
    }
}

// Draw countdown screen
function drawCountdownVisualization(count) {
    const width = sequenceCanvas.width;
    const height = sequenceCanvas.height;

    // Clear
    sequenceCtx.fillStyle = 'rgba(30, 30, 40, 1)';
    sequenceCtx.fillRect(0, 0, width, height);

    // Draw countdown number
    sequenceCtx.fillStyle = '#4ecdc4';
    sequenceCtx.font = 'bold 80px sans-serif';
    sequenceCtx.textAlign = 'center';
    sequenceCtx.textBaseline = 'middle';
    sequenceCtx.fillText(count.toString(), width / 2, height / 2 - 20);

    // Draw "Get Ready" text
    sequenceCtx.fillStyle = '#888';
    sequenceCtx.font = '18px sans-serif';
    sequenceCtx.fillText('Get Ready...', width / 2, height / 2 + 40);

    // Draw first note preview
    const firstNote = sequenceState.currentSequence[0];
    sequenceCtx.fillStyle = '#666';
    sequenceCtx.font = '14px sans-serif';
    sequenceCtx.fillText(`First note: ${firstNote.name}`, width / 2, height / 2 + 70);
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

function analyzeSequence(timestamp) {
    if (!sequenceState.isPlaying) return;

    const currentNote = sequenceState.currentSequence[sequenceState.currentNoteIndex];
    const elapsed = timestamp - sequenceState.noteStartTime;

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

            if (Math.abs(cents) <= 50) {
                sequenceState.timeOnPitch += sequenceSampleInterval;
            }
        } else {
            sequenceState.pitchHistory.push(null);
        }
    }

    // Check if note time has expired
    if (elapsed >= currentNote.duration) {
        advanceNote();
    }

    drawSequenceVisualization(elapsed, currentNote.duration);
    animationId = requestAnimationFrame(analyzeSequence);
}

// Advance to next note
function advanceNote() {
    const currentNote = sequenceState.currentSequence[sequenceState.currentNoteIndex];
    const score = calculateNoteScore(
        sequenceState.pitchSamplesForNote,
        sequenceState.timeOnPitch,
        currentNote.duration
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

    resultsBreakdown.innerHTML = sequenceState.noteScores.map(ns => {
        const scoreClass = ns.score >= 70 ? 'score-high' : ns.score >= 40 ? 'score-mid' : 'score-low';
        return `
            <div class="breakdown-item">
                <span class="breakdown-note">${ns.note}</span>
                <div class="breakdown-score">
                    <div class="breakdown-bar">
                        <div class="breakdown-fill ${scoreClass}" style="width: ${ns.score}%"></div>
                    </div>
                    <span class="breakdown-value">${ns.score}</span>
                </div>
            </div>
        `;
    }).join('');

    sequenceResults.style.display = '';
    sequenceCanvasContainer.classList.remove('active');

    // Draw sheet music with performance-based coloring
    drawSheetMusic(-1, -1, sequenceState.noteScores);
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
    loadSequence(sequenceSelect.value);
});

startNoteSelect.addEventListener('change', () => {
    loadSequence(sequenceSelect.value);
});

startOctaveSelect.addEventListener('change', () => {
    loadSequence(sequenceSelect.value);
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
