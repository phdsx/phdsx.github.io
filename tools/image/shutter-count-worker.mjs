import { parseMetadata } from '../../assets/vendor/exiftool-wasm-1.0.4/index.js';
import { metadataArgs, summarizeMetadata } from './shutter-count-core.mjs';

// The bundled reader's relative WASM URL is resolved against its own directory,
// rather than against the worker/page. No photo bytes are sent over the network.
const wasmURL = new URL('../../assets/vendor/exiftool-wasm-1.0.4/zeroperl-mqcadjqm.wasm', import.meta.url);
self.onmessage = async ({ data: file }) => {
  try {
    self.postMessage({ stage: 'reading' });
    const result = await parseMetadata(file, {
      args: metadataArgs,
      fetch: async () => {
        const response = await fetch(wasmURL);
        if (!response.ok) throw new Error('解析器下载失败，请检查网络后重试。');
        return response;
      },
      transform: JSON.parse
    });
    if (!result.success) throw new Error('照片无法解析，请确认文件完整，并使用相机原片。');
    const tags = result.data?.[0];
    if (tags?.['ExifTool:Error']) throw new Error('文件损坏或格式无法识别，请重新从存储卡复制原片。');
    self.postMessage({ result: summarizeMetadata(tags) });
  } catch (error) {
    self.postMessage({ error: error.message || '读取失败，请换一张原始照片重试。' });
  }
};
