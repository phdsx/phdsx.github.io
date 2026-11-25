import { compareDocuments } from './word-compare-core.mjs';

self.onmessage = event => {
  try {
    const [left, right] = event.data;
    const result = compareDocuments(left, right, progress => self.postMessage({ progress }));
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: String(error.message || error) });
  }
};
