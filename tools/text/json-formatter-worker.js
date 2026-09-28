'use strict';
importScripts('json-formatter-core.js');
self.onmessage = ({ data }) => {
  try {
    const { tree, count } = JSONFormatterCore.parse(data.source);
    self.postMessage({ tree, count, output: JSONFormatterCore.format(tree, data.indent), compact: JSONFormatterCore.format(tree, 0) });
  } catch (error) {
    self.postMessage({ error: { message: error.message, offset: error.offset, line: error.line, column: error.column } });
  }
};
