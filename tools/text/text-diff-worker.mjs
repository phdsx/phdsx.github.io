import { compareTexts } from './text-diff-core.mjs';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, result: compareTexts(data.original, data.comparison, data.rule) });
  } catch (error) {
    // Only a bounded diagnostic is returned. Input is never logged or sent online.
    self.postMessage({ id: data.id, error: error.message || '比对失败，请分段重试。' });
  }
};
