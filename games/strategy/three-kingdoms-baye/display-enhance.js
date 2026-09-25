/* Display-only Scale2x enhancement: https://www.scale2x.it/algorithm
   Game logic, LCD coordinates, and save data are untouched. */
(() => {
  'use strict';

  function scale2x(source, width, height, destination) {
    const outWidth = width * 2;
    const output = destination || new Uint32Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const above = Math.max(0, y - 1) * width;
      const current = y * width;
      const below = Math.min(height - 1, y + 1) * width;
      for (let x = 0; x < width; x++) {
        const left = Math.max(0, x - 1);
        const right = Math.min(width - 1, x + 1);
        const b = source[above + x];
        const d = source[current + left];
        const e = source[current + x];
        const f = source[current + right];
        const h = source[below + x];
        const offset = y * 2 * outWidth + x * 2;
        if (b !== h && d !== f) {
          output[offset] = d === b ? d : e;
          output[offset + 1] = b === f ? f : e;
          output[offset + outWidth] = d === h ? d : e;
          output[offset + outWidth + 1] = h === f ? f : e;
        } else {
          output[offset] = e;
          output[offset + 1] = e;
          output[offset + outWidth] = e;
          output[offset + outWidth + 1] = e;
        }
      }
    }
    return output;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { scale2x };
  if (typeof window === 'undefined') return;

  const originalFlush = window.bayeFlushLcdBuffer;
  const canvas = document.getElementById('lcd');
  const context = canvas.getContext('2d');
  let output;
  let image;
  let sourceCopy;
  let imageWidth = 0;
  let imageHeight = 0;

  window.bayeFlushLcdBuffer = function enhancedFlush(buffer) {
    if (dotSize !== 1 || typeof wasmMemory === 'undefined') {
      originalFlush(buffer);
      if (window.bayeFrameRendered) window.bayeFrameRendered();
      return;
    }

    const width = lcdWidth;
    const height = lcdHeight;
    const count = width * height;
    if (width !== imageWidth || height !== imageHeight) {
      imageWidth = width;
      imageHeight = height;
      output = new Uint32Array(count * 4);
      image = new ImageData(new Uint8ClampedArray(output.buffer), width * 2, height * 2);
    }
    if (canvas.width !== width * 2 || canvas.height !== height * 2) {
      canvas.width = width * 2;
      canvas.height = height * 2;
    }

    let source;
    if (buffer % 4 === 0) {
      source = new Uint32Array(wasmMemory.buffer, buffer, count);
    } else {
      if (!sourceCopy || sourceCopy.length !== count) sourceCopy = new Uint32Array(count);
      new Uint8Array(sourceCopy.buffer).set(new Uint8Array(wasmMemory.buffer, buffer, count * 4));
      source = sourceCopy;
    }
    scale2x(source, width, height, output);
    context.putImageData(image, 0, 0);
    if (window.bayeFrameRendered) window.bayeFrameRendered();
  };
})();
