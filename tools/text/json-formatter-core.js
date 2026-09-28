/* Lossless JSON syntax tree: numeric and string tokens never pass through Number.
 * Objects use ordered entries, preserving duplicate keys and avoiding prototype writes. */
(function (root) {
  'use strict';
  const LIMITS = Object.freeze({ bytes: 2 * 1024 * 1024, depth: 128, nodes: 50000, output: 8 * 1024 * 1024 });
  function parse(source) {
    let pos = 0, count = 0;
    function fail(message, offset = pos) {
      const before = source.slice(0, offset).split(/\r\n|\r|\n/);
      const error = new SyntaxError(message);
      Object.assign(error, { offset, line: before.length, column: before.at(-1).length + 1 });
      throw error;
    }
    if (source.length > LIMITS.bytes || new TextEncoder().encode(source).length > LIMITS.bytes) fail('内容超过 2 MiB，请拆分后再处理。', 0);
    const space = () => { while (/[\x20\t\r\n]/.test(source[pos] || '\0')) pos++; };
    function string() {
      const start = pos++;
      while (pos < source.length) {
        const ch = source[pos++];
        if (ch === '"') return source.slice(start, pos);
        if (ch.charCodeAt(0) < 32) fail('字符串中不能包含未转义的换行或控制字符。', pos - 1);
        if (ch === '\\') {
          const escape = source[pos++];
          if (escape === 'u') {
            if (!/^[0-9a-fA-F]{4}$/.test(source.slice(pos, pos + 4))) fail('Unicode 转义必须包含 4 位十六进制数字。', pos);
            pos += 4;
          } else if (!escape || !'"\\/bfnrt'.includes(escape)) fail('无效的字符串转义。', pos - 1);
        }
      }
      fail('字符串缺少结束引号。', source.length);
    }
    function value(depth) {
      space();
      if (depth > LIMITS.depth) fail('嵌套超过 128 层，请简化数据后再处理。');
      if (++count > LIMITS.nodes) fail('节点超过 50,000 个，请拆分数据后再处理。');
      const id = count;
      const ch = source[pos];
      if (ch === '{' || ch === '[') {
        const type = ch === '{' ? 'object' : 'array', close = ch === '{' ? '}' : ']';
        const node = { id, type, entries: [] };
        pos++; space();
        if (source[pos] === close) { pos++; return node; }
        while (pos < source.length) {
          let key = null;
          if (type === 'object') {
            if (source[pos] !== '"') fail('对象的键必须使用双引号。');
            key = string(); space();
            if (source[pos++] !== ':') fail('对象的键后缺少冒号。', pos - 1);
          }
          node.entries.push({ key, node: value(depth + 1) });
          space();
          if (source[pos] === close) { pos++; return node; }
          if (source[pos++] !== ',') fail('元素之间缺少逗号，或括号不匹配。', pos - 1);
          space();
          if (source[pos] === close) fail('最后一个元素后不能有多余逗号。');
        }
        fail('对象或数组缺少结束括号。');
      }
      if (ch === '"') return { id, type: 'string', raw: string() };
      const rest = source.slice(pos);
      const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(rest);
      if (number) { pos += number[0].length; return { id, type: 'number', raw: number[0] }; }
      for (const raw of ['true', 'false', 'null']) {
        if (source.startsWith(raw, pos)) { pos += raw.length; return { id, type: raw === 'null' ? 'null' : 'boolean', raw }; }
      }
      fail(pos >= source.length ? '缺少 JSON 值。' : '无法识别此处内容，请检查 JSON 语法。');
    }
    space();
    if (pos === source.length) fail('请先粘贴 JSON 文本或上传 .json 文件。');
    const tree = value(0);
    space();
    if (pos !== source.length) fail('JSON 值后包含多余内容。');
    return { tree, count };
  }
  function format(tree, indent = 2) {
    if (![0, 2, 4].includes(indent)) throw new RangeError('缩进必须为 0、2 或 4。');
    const chunks = []; let size = 0;
    const push = text => {
      size += text.length;
      if (size > LIMITS.output) throw new RangeError('格式化结果超过 8 MiB，请拆分数据后再处理。');
      chunks.push(text);
    };
    function visit(node, depth) {
      if (!node.entries) { push(node.raw); return; }
      const object = node.type === 'object';
      push(object ? '{' : '[');
      node.entries.forEach((entry, index) => {
        if (index) push(',');
        if (indent) push('\n' + ' '.repeat((depth + 1) * indent));
        if (object) push(entry.key + (indent ? ': ' : ':'));
        visit(entry.node, depth + 1);
      });
      if (node.entries.length && indent) push('\n' + ' '.repeat(depth * indent));
      push(object ? '}' : ']');
    }
    visit(tree, 0);
    const output = chunks.join('');
    if (new TextEncoder().encode(output).length > LIMITS.output) throw new RangeError('格式化结果超过 8 MiB，请拆分数据后再处理。');
    return output;
  }
  const api = { LIMITS, parse, format };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JSONFormatterCore = api;
})(globalThis);
