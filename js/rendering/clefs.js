/**
 * Clef rendering functions and SVG paths
 */

// SVG path for treble clef
export const TREBLE_CLEF_PATH = "m51.688 5.25c-5.427-0.1409-11.774 12.818-11.563 24.375 0.049 3.52 1.16 10.659 2.781 19.625-10.223 10.581-22.094 21.44-22.094 35.688-0.163 13.057 7.817 29.692 26.75 29.532 2.906-0.02 5.521-0.38 7.844-1 1.731 9.49 2.882 16.98 2.875 20.44 0.061 13.64-17.86 14.99-18.719 7.15 3.777-0.13 6.782-3.13 6.782-6.84 0-3.79-3.138-6.88-7.032-6.88-2.141 0-4.049 0.94-5.343 2.41-0.03 0.03-0.065 0.06-0.094 0.09-0.292 0.31-0.538 0.68-0.781 1.1-0.798 1.35-1.316 3.29-1.344 6.06 0 11.42 28.875 18.77 28.875-3.75 0.045-3.03-1.258-10.72-3.156-20.41 20.603-7.45 15.427-38.04-3.531-38.184-1.47 0.015-2.887 0.186-4.25 0.532-1.08-5.197-2.122-10.241-3.032-14.876 7.199-7.071 13.485-16.224 13.344-33.093 0.022-12.114-4.014-21.828-8.312-21.969zm1.281 11.719c2.456-0.237 4.406 2.043 4.406 7.062 0.199 8.62-5.84 16.148-13.031 23.719-0.688-4.147-1.139-7.507-1.188-9.5 0.204-13.466 5.719-20.886 9.813-21.281zm-7.719 44.687c0.877 4.515 1.824 9.272 2.781 14.063-12.548 4.464-18.57 21.954-0.781 29.781-10.843-9.231-5.506-20.158 2.312-22.062 1.966 9.816 3.886 19.502 5.438 27.872-2.107 0.74-4.566 1.17-7.438 1.19-7.181 0-21.531-4.57-21.531-21.875 0-14.494 10.047-20.384 19.219-28.969zm6.094 21.469c0.313-0.019 0.652-0.011 0.968 0 13.063 0 17.99 20.745 4.688 27.375-1.655-8.32-3.662-17.86-5.656-27.375z";

// SVG path for bass clef body
export const BASS_CLEF_PATH = "m13.976 0.23c-8.785 0.21-15.515 6.36-13.334 15.79 0.002 0.01 0.013 0.02 0.016 0.03 0.256 3.25 2.96 5.81 6.276 5.81 3.485 0 6.309-2.82 6.309-6.3 0-3.08-2.191-5.64-5.098-6.2-1.158-0.41-2.896-1.34-2.82-2.84 0.036-0.74 0.903-2.09 2.294-2.77 1.691-0.79 3.434-1.22 5.194-0.86 2.667 0.49 9.489 5.39 10.019 13.88 0.31 6.44-3.31 15.15-6.849 19.27-5.698 6.51-14.851 10.55-13.955 11.27 0.803 0.72 11.61-4.22 17.237-10.42 6.867-7.44 10.267-13.64 9.937-21.17-0.19-7.54-6.03-15.7-15.226-15.49z";

/**
 * Draw a treble clef using SVG path
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} staffTop - Y position of top staff line
 * @param {number} lineSpacing - Spacing between staff lines
 */
export function drawTrebleClef(ctx, x, staffTop, lineSpacing) {
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

/**
 * Draw a bass clef using SVG path
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} staffTop - Y position of top staff line
 * @param {number} lineSpacing - Spacing between staff lines
 */
export function drawBassClef(ctx, x, staffTop, lineSpacing) {
    ctx.save();
    ctx.fillStyle = '#999';

    // Scale based on line spacing (base scale 0.90 for lineSpacing=10)
    const scale = (lineSpacing / 10) * 0.90;
    const offsetX = x + 2 * (lineSpacing / 10);
    // F line is the second from top (staffTop + lineSpacing)
    const offsetY = staffTop + 0.5 * lineSpacing;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const path = new Path2D(BASS_CLEF_PATH);
    ctx.fill(path);

    // Draw the two dots (to the right of the main clef body)
    const dotRadius = 2.5;
    const dotX = 32;
    ctx.beginPath();
    ctx.arc(dotX, 7, dotRadius, 0, Math.PI * 2);
    ctx.arc(dotX, 17, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Draw a mini treble clef (scaled down for mini staff)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} staffTop - Y position of top staff line
 * @param {number} lineSpacing - Spacing between staff lines
 */
export function drawTrebleClefMini(ctx, x, staffTop, lineSpacing) {
    ctx.save();
    ctx.fillStyle = '#666';

    const scale = (lineSpacing / 10) * 0.35;
    const offsetX = x - 2;
    const offsetY = staffTop - 1.2 * lineSpacing;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const path = new Path2D(TREBLE_CLEF_PATH);
    ctx.fill(path);

    ctx.restore();
}

/**
 * Draw a mini bass clef (scaled down for mini staff)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} staffTop - Y position of top staff line
 * @param {number} lineSpacing - Spacing between staff lines
 */
export function drawBassClefMini(ctx, x, staffTop, lineSpacing) {
    ctx.save();
    ctx.fillStyle = '#666';

    const scale = (lineSpacing / 10) * 0.65;
    const offsetX = x + 1;
    const offsetY = staffTop + 0.3 * lineSpacing;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const path = new Path2D(BASS_CLEF_PATH);
    ctx.fill(path);

    // Draw the two dots
    const dotRadius = 2;
    const dotX = 32;
    ctx.beginPath();
    ctx.arc(dotX, 7, dotRadius, 0, Math.PI * 2);
    ctx.arc(dotX, 17, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
