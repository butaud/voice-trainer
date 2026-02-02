// Audio context for playing notes
let audioContext = null;

// Recording state
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Pitch detection state
let analyser = null;
let pitchDetectionActive = false;
let animationId = null;

// Note frequencies (C0 = MIDI note 12)
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getFrequency(note, octave) {
    const noteIndex = noteNames.indexOf(note);
    const midiNote = (octave + 1) * 12 + noteIndex;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Current note (A4 = 440Hz)
const currentNote = {
    name: 'A4',
    frequency: 440
};

// DOM elements
const playNoteBtn = document.getElementById('play-note');
const recordBtn = document.getElementById('record-btn');
const statusEl = document.getElementById('status');
const playbackEl = document.getElementById('playback');
const visualizerSection = document.getElementById('visualizer-section');
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

// Pitch history for visualization
const pitchHistory = [];
const maxPitchHistory = 100;

// Smoothing for pitch detection
const recentPitches = [];
const smoothingWindow = 5;

// Initialize audio context on first user interaction
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Play a tone at the specified frequency
function playTone(frequency, duration = 1.5) {
    const ctx = getAudioContext();

    // Create oscillator
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Create gain node for envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + duration - 0.1);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    // Connect and play
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    // Visual feedback
    playNoteBtn.disabled = true;
    setTimeout(() => {
        playNoteBtn.disabled = false;
    }, duration * 1000);
}

// Start recording
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            playbackEl.src = audioUrl;
            playbackEl.style.display = 'block';
            statusEl.textContent = 'Recording saved. Play it back to see pitch analysis.';

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        isRecording = true;
        recordBtn.textContent = 'Stop Recording';
        recordBtn.classList.add('recording');
        statusEl.textContent = 'Recording... Sing the note!';

    } catch (err) {
        console.error('Error accessing microphone:', err);
        statusEl.textContent = 'Error: Could not access microphone. Please allow microphone access.';
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.textContent = 'Start Recording';
        recordBtn.classList.remove('recording');
    }
}

// Autocorrelation pitch detection (YIN-inspired algorithm)
function detectPitch(buffer, sampleRate) {
    const SIZE = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);

    // Find the RMS of the signal
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        const val = buffer[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // Not enough signal
    if (rms < 0.005) {
        return -1;
    }

    // Compute the difference function
    const diff = new Float32Array(MAX_SAMPLES);
    for (let tau = 0; tau < MAX_SAMPLES; tau++) {
        let sum = 0;
        for (let i = 0; i < MAX_SAMPLES; i++) {
            const delta = buffer[i] - buffer[i + tau];
            sum += delta * delta;
        }
        diff[tau] = sum;
    }

    // Cumulative mean normalized difference function
    const cmndf = new Float32Array(MAX_SAMPLES);
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < MAX_SAMPLES; tau++) {
        runningSum += diff[tau];
        cmndf[tau] = diff[tau] / (runningSum / tau);
    }

    // Find the first minimum below threshold
    const threshold = 0.1;
    let tau = 2;

    // Skip to first value below threshold
    while (tau < MAX_SAMPLES - 1 && cmndf[tau] >= threshold) {
        tau++;
    }

    // Find the minimum in this dip
    while (tau < MAX_SAMPLES - 1 && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
    }

    if (tau >= MAX_SAMPLES - 1 || cmndf[tau] >= threshold) {
        return -1;
    }

    // Parabolic interpolation for better precision
    const s0 = cmndf[tau - 1];
    const s1 = cmndf[tau];
    const s2 = cmndf[tau + 1];
    const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));

    if (Math.abs(adjustment) < 1) {
        tau = tau + adjustment;
    }

    return sampleRate / tau;
}

// Median filter for smoothing
function getSmoothedPitch(newPitch) {
    recentPitches.push(newPitch);
    if (recentPitches.length > smoothingWindow) {
        recentPitches.shift();
    }

    if (recentPitches.length < 3) {
        return newPitch;
    }

    // Return median of recent pitches
    const sorted = [...recentPitches].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Convert frequency to cents difference from target
function getCentsDifference(detected, target) {
    return 1200 * Math.log2(detected / target);
}

// Get note name from frequency
function getNoteFromFrequency(frequency) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteNum = 12 * (Math.log2(frequency / 440)) + 69;
    const note = Math.round(noteNum);
    const noteName = noteNames[note % 12];
    const octave = Math.floor(note / 12) - 1;
    return `${noteName}${octave}`;
}

// Draw pitch visualization
function drawPitchVisualization() {
    const width = pitchCanvas.width;
    const height = pitchCanvas.height;

    // Clear canvas
    canvasCtx.fillStyle = 'rgba(30, 30, 40, 1)';
    canvasCtx.fillRect(0, 0, width, height);

    const centerY = height / 2;

    // Draw "on pitch" zone (green band)
    canvasCtx.fillStyle = 'rgba(107, 203, 119, 0.15)';
    const onPitchHeight = (10 / 100) * (height / 2 - 10) * 2;
    canvasCtx.fillRect(0, centerY - onPitchHeight / 2, width, onPitchHeight);

    // Draw target line (center)
    canvasCtx.strokeStyle = '#6bcb77';
    canvasCtx.lineWidth = 2;
    canvasCtx.setLineDash([5, 5]);
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, centerY);
    canvasCtx.lineTo(width, centerY);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);

    // Draw threshold lines (+/- 50 cents)
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    canvasCtx.lineWidth = 1;
    const thresholdOffset = height / 4;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, centerY - thresholdOffset);
    canvasCtx.lineTo(width, centerY - thresholdOffset);
    canvasCtx.moveTo(0, centerY + thresholdOffset);
    canvasCtx.lineTo(width, centerY + thresholdOffset);
    canvasCtx.stroke();

    // Draw current playback position line
    const currentTime = playbackEl.currentTime;
    const duration = playbackEl.duration || 10;
    const playheadX = (currentTime / duration) * width;

    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    canvasCtx.lineWidth = 1;
    canvasCtx.beginPath();
    canvasCtx.moveTo(playheadX, 0);
    canvasCtx.lineTo(playheadX, height);
    canvasCtx.stroke();

    // Draw pitch history as connected line segments
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

        const x = (i / maxPitchHistory) * width;
        const clampedCents = Math.max(-100, Math.min(100, cents));
        const y = centerY - (clampedCents / 100) * (height / 2 - 10);

        // Set color based on accuracy
        if (Math.abs(cents) <= 10) {
            canvasCtx.strokeStyle = '#6bcb77'; // Green
        } else if (Math.abs(cents) <= 25) {
            canvasCtx.strokeStyle = '#ffd93d'; // Yellow
        } else {
            canvasCtx.strokeStyle = '#ff6b6b'; // Red
        }

        if (lastValidPoint) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(lastValidPoint.x, lastValidPoint.y);
            canvasCtx.lineTo(x, y);
            canvasCtx.stroke();
        }

        lastValidPoint = { x, y, cents };
    }

    // Draw current pitch indicator
    if (lastValidPoint && pitchDetectionActive) {
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

        // White border for visibility
        canvasCtx.strokeStyle = 'white';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
    }
}

// Analyze pitch during playback
function analyzePitch() {
    if (!pitchDetectionActive) return;

    const bufferLength = analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(buffer);

    const rawPitch = detectPitch(buffer, audioContext.sampleRate);

    if (rawPitch !== -1 && rawPitch > 80 && rawPitch < 1000) {
        const pitch = getSmoothedPitch(rawPitch);
        const cents = getCentsDifference(pitch, currentNote.frequency);
        const noteName = getNoteFromFrequency(pitch);

        // Update display
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

        // Add to history based on playback time
        const currentTime = playbackEl.currentTime;
        const duration = playbackEl.duration || 10;
        const historyIndex = Math.floor((currentTime / duration) * maxPitchHistory);

        // Fill in any gaps
        while (pitchHistory.length < historyIndex) {
            pitchHistory.push(null);
        }
        pitchHistory[historyIndex] = cents;
    }

    drawPitchVisualization();
    animationId = requestAnimationFrame(analyzePitch);
}

// Start pitch detection for playback
async function startPitchDetection() {
    const ctx = getAudioContext();

    // Create media element source from the audio element
    const source = ctx.createMediaElementSource(playbackEl);

    // Create analyser with larger buffer for better low-frequency resolution
    analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;

    // Connect: source -> analyser -> destination
    source.connect(analyser);
    analyser.connect(ctx.destination);

    // Clear history
    pitchHistory.length = 0;
    recentPitches.length = 0;

    // Show visualizer
    visualizerSection.style.display = 'block';

    // Start analysis
    pitchDetectionActive = true;
    analyzePitch();
}

// Stop pitch detection
function stopPitchDetection() {
    pitchDetectionActive = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Track if we've connected the audio element
let audioElementConnected = false;

// Update current note from selectors
function updateCurrentNote() {
    const note = noteSelect.value;
    const octave = parseInt(octaveSelect.value);
    const frequency = getFrequency(note, octave);

    currentNote.name = `${note}${octave}`;
    currentNote.frequency = frequency;

    // Update display
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

recordBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

playbackEl.addEventListener('play', () => {
    if (!audioElementConnected) {
        startPitchDetection();
        audioElementConnected = true;
    } else {
        // Clear history if starting from beginning
        if (playbackEl.currentTime < 0.1) {
            pitchHistory.length = 0;
            recentPitches.length = 0;
        }
        pitchDetectionActive = true;
        analyzePitch();
    }
});

playbackEl.addEventListener('pause', () => {
    stopPitchDetection();
});

playbackEl.addEventListener('ended', () => {
    stopPitchDetection();
    statusEl.textContent = 'Playback complete. Record again or replay to analyze.';
});
