(() => {
  const exifHeader = new Uint8Array([69, 120, 105, 102, 0, 0]);
  const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const matches = (bytes, offset, signature) => signature.every((value, index) => bytes[offset + index] === value);

  function readExif(bytes) {
    if (bytes[0] === 255 && bytes[1] === 216) {
      let offset = 2;
      while (offset + 4 <= bytes.length && bytes[offset] === 255) {
        const marker = bytes[offset + 1];
        if (marker === 218 || marker === 217) break;
        const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (size < 2 || offset + 2 + size > bytes.length) break;
        if (marker === 225 && matches(bytes, offset + 4, exifHeader)) {
          return bytes.slice(offset + 10, offset + 2 + size);
        }
        offset += 2 + size;
      }
    } else if (matches(bytes, 0, pngHeader)) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let offset = 8;
      while (offset + 12 <= bytes.length) {
        const size = view.getUint32(offset);
        if (offset + 12 + size > bytes.length) break;
        if (matches(bytes, offset + 4, [101, 88, 73, 102])) return bytes.slice(offset + 8, offset + 8 + size);
        offset += 12 + size;
      }
    } else if (matches(bytes, 0, [82, 73, 70, 70]) && matches(bytes, 8, [87, 69, 66, 80])) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let offset = 12;
      while (offset + 8 <= bytes.length) {
        const size = view.getUint32(offset + 4, true);
        if (offset + 8 + size > bytes.length) break;
        if (matches(bytes, offset, [69, 88, 73, 70])) {
          const data = bytes.slice(offset + 8, offset + 8 + size);
          return matches(data, 0, exifHeader) ? data.slice(6) : data;
        }
        offset += 8 + size + (size % 2);
      }
    }
    return null;
  }

  function normalizeOrientation(tiff) {
    if (tiff.length < 8) throw new Error('EXIF 数据不完整');
    const little = tiff[0] === 73 && tiff[1] === 73;
    if (!little && !(tiff[0] === 77 && tiff[1] === 77)) throw new Error('EXIF 字节序无效');
    const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    if (view.getUint16(2, little) !== 42) throw new Error('EXIF 标识无效');
    const ifd = view.getUint32(4, little);
    if (ifd + 2 > tiff.length) throw new Error('EXIF 目录不完整');
    const count = view.getUint16(ifd, little);
    if (ifd + 2 + count * 12 > tiff.length) throw new Error('EXIF 目录不完整');
    for (let index = 0; index < count; index++) {
      const entry = ifd + 2 + index * 12;
      if (view.getUint16(entry, little) === 274 && view.getUint16(entry + 2, little) === 3 && view.getUint32(entry + 4, little) === 1) {
        view.setUint16(entry + 8, 1, little);
        break;
      }
    }
    return tiff;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function insertExif(bytes, tiff, type) {
    if (type === 'image/jpeg') {
      if (bytes[0] !== 255 || bytes[1] !== 216 || tiff.length + 8 > 65535) throw new Error('无法向 JPEG 写入 EXIF');
      const segment = new Uint8Array(tiff.length + 10);
      segment.set([255, 225, (tiff.length + 8) >> 8, (tiff.length + 8) & 255], 0);
      segment.set(exifHeader, 4);
      segment.set(tiff, 10);
      return new Blob([bytes.slice(0, 2), segment, bytes.slice(2)], { type });
    }
    if (type === 'image/png') {
      if (!matches(bytes, 0, pngHeader)) throw new Error('无法向 PNG 写入 EXIF');
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const firstEnd = 8 + 12 + view.getUint32(8);
      if (firstEnd > bytes.length || !matches(bytes, 12, [73, 72, 68, 82])) throw new Error('PNG 数据不完整');
      const chunk = new Uint8Array(tiff.length + 12);
      const chunkView = new DataView(chunk.buffer);
      chunkView.setUint32(0, tiff.length);
      chunk.set([101, 88, 73, 102], 4);
      chunk.set(tiff, 8);
      chunkView.setUint32(chunk.length - 4, crc32(chunk.slice(4, -4)));
      return new Blob([bytes.slice(0, firstEnd), chunk, bytes.slice(firstEnd)], { type });
    }
    throw new Error('输出格式不支持 EXIF');
  }

  async function preserveExif(source, output) {
    const sourceBytes = new Uint8Array(await source.arrayBuffer());
    const tiff = readExif(sourceBytes);
    if (!tiff) return output;
    const outputBytes = new Uint8Array(await output.arrayBuffer());
    return insertExif(outputBytes, normalizeOrientation(tiff), output.type);
  }

  window.PHDSXImageExif = { preserveExif };
})();
