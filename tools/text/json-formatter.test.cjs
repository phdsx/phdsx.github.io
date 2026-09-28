const test = require('node:test');
const assert = require('node:assert/strict');
const { parse, format, LIMITS } = require('./json-formatter-core.js');

test('ordinary JSON, Chinese, nested arrays and objects round-trip with 2/4 spaces', () => {
  const source = '{"中文":"你好😀","数字":42,"布尔":false,"空":null,"数组":[{"items":[1,true,null]},[]],"对象":{}}';
  const { tree } = parse(source);
  for (const indent of [2, 4]) {
    const pretty = format(tree, indent);
    assert.deepEqual(JSON.parse(pretty), JSON.parse(source));
    assert.ok(pretty.includes('\n' + ' '.repeat(indent) + '"中文"'));
    assert.equal(format(parse(pretty).tree, 0), source);
  }
});

test('empty containers and all primitive JSON roots are supported', () => {
  for (const source of ['{}', '[]', '"中文"', '42', '-0', 'true', 'false', 'null']) {
    assert.equal(format(parse(source).tree, 2), source);
  }
});

test('large integers, decimals and exponents preserve their exact original tokens', () => {
  const source = '{"id":9007199254740993123456789,"negative":-900719925474099312345,"decimal":1.234567890123456789,"exponent":1E+999,"zero":-0,"trailing":1.00}';
  const tree = parse(source).tree;
  assert.equal(tree.entries[0].node.type, 'number');
  assert.equal(tree.entries[0].node.raw, '9007199254740993123456789');
  for (const indent of [0, 2, 4]) assert.equal(format(parse(format(tree, indent)).tree, 0), source);
});

test('duplicate keys, __proto__, escapes and HTML-like content stay literal', () => {
  const source = '{"a":1,"a":2,"__proto__":{"polluted":true},"html":"<img src=x onerror=alert(1)>","escaped":"\\u4e2d\\n\\\""}';
  assert.equal(format(parse(source).tree, 0), source);
  assert.equal({}.polluted, undefined);
});

test('invalid JSON rejects comments, invalid numbers, escapes and trailing content', () => {
  const invalid = ['', ' ', '{', '[1,]', '{"a":1,}', '{a:1}', '{"a" 1}', '{"a":}', '[1 2]', '01', '1.', '1e', '+1', 'NaN', 'Infinity', 'True', 'null false', '// comment\n{}', '"a\n"', '"\\q"', '"\\uXYZ1"', '"unterminated'];
  for (const source of invalid) assert.throws(() => parse(source), SyntaxError, source);
});

test('errors carry precise offsets, line and column, including CRLF and Chinese', () => {
  for (const newline of ['\n', '\r\n', '\r']) {
    const source = '{' + newline + '  "中文": [1,]' + newline + '}';
    assert.throws(() => parse(source), error => error.line === 2 && error.column === 12 && error.offset === source.indexOf(']'));
  }
});

test('file size, depth, node and expanded-output protections stop oversized work', () => {
  assert.throws(() => parse('"' + '中'.repeat(Math.ceil(LIMITS.bytes / 3)) + '"'), /2 MiB/);
  assert.throws(() => parse('['.repeat(130) + '0' + ']'.repeat(130)), /128/);
  assert.doesNotThrow(() => parse('['.repeat(128) + '0' + ']'.repeat(128)));
  assert.throws(() => parse('[' + Array(50000).fill('0').join(',') + ']'), /50,000/);
  const large = parse('['.repeat(127) + '[' + Array(20000).fill('0').join(',') + ']' + ']'.repeat(127)).tree;
  assert.throws(() => format(large, 4), /8 MiB/);
});

test('bounded large-array formatting and repeated parse remain stable', () => {
  const source = '[' + Array(10000).fill('{"n":9007199254740993}').join(',') + ']';
  const result = parse(source);
  assert.equal(result.count, 20001);
  assert.equal(format(parse(format(result.tree, 4)).tree, 0), source);
});
