import { diffArrays } from '../../assets/vendor/jsdiff-8.0.3/array.js';

const { strToU8, unzipSync, zipSync } = globalThis.fflate;

// Read just the ZIP directory. This also lets Word export copy unchanged entries in their original compressed form.
function zipIndex(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = offset => view.getUint16(offset, true);
  const u32 = offset => view.getUint32(offset, true);
  let end = bytes.length - 22;
  const earliest = Math.max(0, end - 65535);
  while (end >= earliest && !(u32(end) === 0x06054b50 && end + 22 + u16(end + 20) === bytes.length)) end--;
  if (end < earliest || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) throw new Error('Unsupported ZIP directory');
  const count = u16(end + 10);
  const directorySize = u32(end + 12);
  const start = u32(end + 16);
  if (start + directorySize > end || count === 65535) throw new Error('Unsupported ZIP layout');
  const entries = new Map();
  const decoder = new TextDecoder();
  let offset = start;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > start + directorySize || u32(offset) !== 0x02014b50) throw new Error('Invalid ZIP entry');
    const nameLength = u16(offset + 28);
    const next = offset + 46 + nameLength + u16(offset + 30) + u16(offset + 32);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    const local = u32(offset + 42);
    const compressedSize = u32(offset + 20);
    const size = u32(offset + 24);
    if (next > end || local >= start || compressedSize === 0xffffffff || size === 0xffffffff || entries.has(name)) throw new Error('Unsupported ZIP entry');
    entries.set(name, { name, offset, next, local, compressedSize, size, crc: u32(offset + 16) });
    offset = next;
  }
  if (offset !== start + directorySize) throw new Error('Invalid ZIP directory size');
  return { bytes, start, end, entries };
}

function replaceZipPart(archive, name, data) {
  if (!archive.entries.has(name)) throw new Error('Missing Word content');
  const replacement = zipIndex(zipSync({ [name]: data }, { level: 5 }));
  const newPart = replacement.entries.get(name);
  const local = [...archive.entries.values()].sort((a, b) => a.local - b.local);
  const chunks = [archive.bytes.subarray(0, local[0].local)];
  const offsets = new Map();
  let size = chunks[0].length;
  for (const [i, entry] of local.entries()) {
    const next = local[i + 1]?.local ?? archive.start;
    const bytes = entry === archive.entries.get(name)
      ? replacement.bytes.subarray(newPart.local, replacement.start)
      : archive.bytes.subarray(entry.local, next);
    offsets.set(entry.name, size);
    size += bytes.length;
    chunks.push(bytes);
  }
  const start = size;
  for (const entry of archive.entries.values()) {
    const record = entry.name === name ? replacement.bytes.slice(newPart.offset, newPart.next) : archive.bytes.slice(entry.offset, entry.next);
    new DataView(record.buffer).setUint32(42, offsets.get(entry.name), true);
    size += record.length;
    chunks.push(record);
  }
  const trailer = archive.bytes.slice(archive.end);
  const info = new DataView(trailer.buffer);
  info.setUint32(12, size - start, true);
  info.setUint32(16, start, true);
  chunks.push(trailer);
  return chunks;
}

function relationshipsPart(part) {
  const split = part.lastIndexOf('/') + 1;
  return `${part.slice(0, split)}_rels/${part.slice(split)}.rels`;
}

function relationshipTarget(part, uri) {
  let target;
  try { target = decodeURIComponent(uri.split('#')[0]); } catch { return null; }
  if (!target || /[\\:\u0000]/.test(target)) return null;
  const directory = part.slice(0, part.lastIndexOf('/') + 1);
  const result = [];
  for (const piece of `${target.startsWith('/') ? '' : directory}${target}`.split('/')) {
    if (piece === '..') {
      if (!result.length) return null;
      result.pop();
    } else if (piece && piece !== '.') result.push(piece);
  }
  return result.join('/');
}

function readRelationships(data, part) {
  const result = new Map();
  for (const node of parseXml(data)?.documentElement?.children || []) {
    if (node.localName !== 'Relationship') continue;
    const target = node.getAttribute('Target') || '';
    const external = node.getAttribute('TargetMode')?.toLowerCase() === 'external';
    result.set(node.getAttribute('Id'), {
      path: external ? null : relationshipTarget(part, target), external, target,
      type: node.getAttribute('Type')?.split('/').at(-1) || '',
    });
  }
  return result;
}

const MATH_NAMESPACE = /(?:openxmlformats\.org\/officeDocument\/2006|purl\.oclc\.org\/ooxml\/officeDocument)\/math$/;
const IMAGE_FORMATS = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
const GRAPHIC_LABELS = { image: '图片', chart: '图表', shape: '形状', diagram: 'SmartArt', math: '公式', object: '嵌入对象' };

function isMath(element) {
  return MATH_NAMESPACE.test(element.namespaceURI || '') && ['oMath', 'oMathPara'].includes(element.localName);
}

function isGraphic(element) {
  return ['drawing', 'pict', 'object'].some(name => word(element, name)) || isMath(element);
}

function graphicsIn(root) {
  const found = [];
  function visit(node) {
    if (word(node, 'del') || word(node, 'moveFrom')) return;
    if (isGraphic(node)) found.push(node);
    else for (const child of visibleChildren(node)) visit(child);
  }
  visit(root);
  return found;
}

function alternateContent(node) {
  return node.localName === 'AlternateContent' && /\/markup-compatibility\/2006$/.test(node.namespaceURI || '');
}

function visibleChildren(node) {
  if (!alternateContent(node)) return node.children;
  const branches = [...node.children];
  return (branches.find(branch => branch.localName === 'Choice') || branches.find(branch => branch.localName === 'Fallback'))?.children || [];
}

function relationshipAttribute(attr) {
  return /\/relationships$/.test(attr.namespaceURI || '');
}

function graphicType(node, refs) {
  if (isMath(node)) return 'math';
  if (word(node, 'object')) return 'object';
  if (refs.some(ref => /chart/i.test(ref.type))) return 'chart';
  if (refs.some(ref => /diagram/i.test(ref.type))) return 'diagram';
  const names = new Set(Array.from(node.getElementsByTagName('*'), item => item.localName));
  if (['chart', 'chartEx'].some(name => names.has(name))) return 'chart';
  if (names.has('relIds')) return 'diagram';
  if (names.has('grpSp') || names.has('wgp') || names.has('wsp')) return 'shape';
  if (refs.some(ref => ref.type === 'image') || names.has('imagedata') || names.has('blip')) return 'image';
  return 'shape';
}

function resourceFingerprint(archive, path, dependencies, visited = new Set()) {
  const entry = archive.entries.get(path);
  if (!entry) return 'missing';
  const signature = `${entry.size}:${entry.crc.toString(16)}`;
  if (visited.has(path) || visited.size >= 5) return signature;
  const children = dependencies.get(path) || [];
  if (!children.length) return signature;
  const next = new Set([...visited, path]);
  return `${signature}[${children.map(ref => `${ref.type}:${ref.external ? ref.target : resourceFingerprint(archive, ref.path, dependencies, next)}`).sort().join('|')}]`;
}

function graphicReader(archive, main, body) {
  const items = graphicsIn(body);
  if (!items.length) return { byNode: new Map(), previewBytes: new Map() };
  const rootPart = relationshipsPart(main);
  const rootBytes = readParts(archive.bytes, [rootPart]);
  const links = readRelationships(rootBytes[rootPart], main);
  const dependencies = new Map();
  const all = new Set();
  let layer = [...new Set(Array.from(links.values(), ref => ref.path).filter(Boolean))];
  // Read relationship parts for nested chart workbooks, diagrams, and embedded media.
  for (let depth = 0; depth < 5 && layer.length; depth++) {
    const next = layer.filter(path => !all.has(path) && archive.entries.has(relationshipsPart(path)));
    if (!next.length) break;
    const rels = readParts(archive.bytes, next.map(relationshipsPart));
    for (const path of next) {
      all.add(path);
      dependencies.set(path, [...readRelationships(rels[relationshipsPart(path)], path).values()]);
    }
    layer = next.flatMap(path => dependencies.get(path).map(ref => ref.path)).filter(Boolean);
  }

  const byNode = new Map();
  const previews = new Map();
  const previewPaths = new Set();
  const typeCounts = new Map();
  const fingerprints = new Map();
  function fingerprint(path) {
    if (!fingerprints.has(path)) fingerprints.set(path, resourceFingerprint(archive, path, dependencies));
    return fingerprints.get(path);
  }
  let availablePreviewBytes = 32 * 1024 * 1024;
  for (const [i, node] of items.entries()) {
    if (i >= 2000) throw new DocumentError('可比较的图形对象超过 2,000 个。请拆分文档后再比较。');
    const descendants = [node, ...node.getElementsByTagName('*')];
    const refs = descendants.flatMap(element => Array.from(element.attributes)
      .filter(relationshipAttribute).map(attr => links.get(attr.value)).filter(Boolean));
    const type = graphicType(node, refs);
    const ordinal = (typeCounts.get(type) || 0) + 1;
    typeCounts.set(type, ordinal);
    const id = i + 1;
    const title = `${GRAPHIC_LABELS[type]} ${ordinal}`;
    const properties = descendants.find(element => element.localName === 'docPr');
    const description = (properties?.getAttribute('descr') || properties?.getAttribute('title') || '').slice(0, 100);
    const media = refs.find(ref => ref.type === 'image' && ref.path)?.path;
    const mimeType = IMAGE_FORMATS[media?.split('.').at(-1)?.toLowerCase()];
    const entry = archive.entries.get(media);
    if (mimeType && entry && entry.size <= 8 * 1024 * 1024) {
      if (!previewPaths.has(media) && availablePreviewBytes >= entry.size) {
        previewPaths.add(media);
        availablePreviewBytes -= entry.size;
      }
      if (previewPaths.has(media)) previews.set(id, { path: media, mimeType });
    }

    function canonical(element) {
      if (['creationId', 'modId'].includes(element.localName) || word(element, 'rsid')) return null;
      const attributes = [];
      for (const attr of element.attributes) {
        const local = attr.localName;
        if (attr.namespaceURI === 'http://www.w3.org/2000/xmlns/' || ['anchorId', 'editId', 'spid'].includes(local) || /^rsid/.test(local)) continue;
        if (['docPr', 'cNvPr'].includes(element.localName) && ['id', 'name'].includes(local)) continue;
        let value = attr.value;
        if (relationshipAttribute(attr)) {
          const ref = links.get(value);
          value = ref ? `${ref.type}:${ref.external ? `link:${ref.target}` : fingerprint(ref.path)}` : 'unresolved';
        }
        attributes.push([`${attr.namespaceURI || ''}:${local}`, value]);
      }
      attributes.sort((a, b) => a[0].localeCompare(b[0]));
      const content = Array.from(element.childNodes).flatMap(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const data = canonical(child);
          return data ? [data] : [];
        }
        return child.nodeType === Node.TEXT_NODE && (child.nodeValue.trim() || !element.children.length) ? [child.nodeValue] : [];
      });
      if (!content.length && (element.localName === 'extLst' || (element.localName === 'ext' && element.hasAttribute('uri')))) return null;
      return [element.namespaceURI, element.localName, attributes, content];
    }
    const signature = JSON.stringify(canonical(node));
    byNode.set(node, { id, kind: 'graphic', type, title, description, text: title,
      fingerprint: signature, linked: refs.some(ref => ref.external) });
  }

  const bytes = previewPaths.size ? unzipSync(archive.bytes, { filter: entry => previewPaths.has(entry.name) }) : {};
  const previewBytes = new Map([...previews].map(([id, { path, mimeType }]) => [id, { bytes: bytes[path], mimeType }]));
  return { byNode, previewBytes };
}

const WORD_NAMESPACES = new Set([
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  'http://purl.oclc.org/ooxml/wordprocessingml/main',
]);
const MAIN_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
const FILE_LIMIT = 20 * 1024 * 1024;
const XML_LIMIT = 16 * 1024 * 1024;
const BLOCK_LIMIT = 5000;

class DocumentError extends Error {}

function word(element, name) {
  return element && WORD_NAMESPACES.has(element.namespaceURI) && element.localName === name;
}

function child(element, name) {
  return Array.from(element?.children || []).find(item => word(item, name));
}

function attribute(element, name = 'val') {
  return element?.getAttributeNS(element.namespaceURI, name) ?? null;
}

function parseXml(data) {
  if (!data) return null;
  const encoding = data[0] === 0xff && data[1] === 0xfe ? 'utf-16le'
    : data[0] === 0xfe && data[1] === 0xff ? 'utf-16be' : 'utf-8';
  const source = new TextDecoder(encoding, { fatal: true }).decode(data);
  if (/<!DOCTYPE/i.test(source)) throw new DocumentError('文件包含无法读取的 XML 结构。');
  const doc = new DOMParser().parseFromString(source, 'application/xml');
  if (doc.getElementsByTagNameNS('*', 'parsererror').length) throw new DocumentError('文件中的 Word 内容已损坏。');
  return doc;
}

function readParts(bytes, names) {
  const wanted = new Set(names);
  const seen = new Set();
  let total = 0;
  return unzipSync(bytes, { filter(entry) {
    if (!wanted.has(entry.name)) return false;
    if (seen.has(entry.name)) throw new DocumentError('文件内有重复的 Word 内容。');
    seen.add(entry.name);
    total += entry.originalSize;
    if (entry.originalSize > XML_LIMIT || total > XML_LIMIT * 1.5) {
      throw new DocumentError('文件解压后的正文过大。请将文档拆分后再比较。');
    }
    return true;
  } });
}

export function validateFile(file) {
  if (!/\.docx$/i.test(file.name)) {
    throw new DocumentError(/\.doc$/i.test(file.name)
      ? '旧版 .doc 请在 Word 中另存为 .docx 后重试。' : '请选择 .docx 文件。');
  }
  if (!file.size) throw new DocumentError('文件为空。请选择有效的 .docx 文件。');
  if (file.size > FILE_LIMIT) throw new DocumentError('文件超过 20 MB。请缩小文件或拆分后重试。');
}

export async function readDocument(file) {
  validateFile(file);
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if ([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((value, i) => bytes[i] === value)) {
      throw new DocumentError('文件可能受密码保护，或使用了旧版 Word 格式。请在 Word 中打开并另存为未加密的 .docx。');
    }
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new DocumentError('文件不是有效的 .docx，或已损坏。');
    let parts = readParts(bytes, ['[Content_Types].xml', 'word/document.xml', 'word/styles.xml', 'word/numbering.xml']);
    const types = parseXml(parts['[Content_Types].xml']);
    const main = Array.from(types?.getElementsByTagNameNS('*', 'Override') || [])
      .find(item => item.getAttribute('ContentType') === MAIN_CONTENT_TYPE)?.getAttribute('PartName')?.replace(/^\//, '');
    if (!main || /(^|\/)\.\.?($|\/)|[\\:\u0000]/.test(main)) {
      throw new DocumentError('文件缺少有效的 Word 正文。');
    }
    if (main !== 'word/document.xml') {
      const folder = main.slice(0, main.lastIndexOf('/') + 1);
      parts = readParts(bytes, [main, `${folder}styles.xml`, `${folder}numbering.xml`]);
      parts['word/styles.xml'] = parts[`${folder}styles.xml`];
      parts['word/numbering.xml'] = parts[`${folder}numbering.xml`];
    }
    const doc = parseXml(parts[main]);
    const body = child(doc?.documentElement, 'body');
    if (!body) throw new DocumentError('文件缺少可读取的正文。');
    const styles = readStyles(parseXml(parts['word/styles.xml']));
    const numbering = readNumbering(parseXml(parts['word/numbering.xml']));
    const archive = zipIndex(bytes);
    const graphicData = graphicReader(archive, main, body);
    const signed = [...archive.entries.keys()].some(name => name.startsWith('_xmlsignatures/'));
    return { ...buildDocument(body, styles, numbering, graphicData.byNode), main, signed, previews: graphicData.previewBytes };
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError('无法读取这个 .docx。文件可能已损坏或受密码保护。');
  }
}

function contains(element, names) {
  for (const name of names) {
    for (const namespace of WORD_NAMESPACES) {
      if (element.getElementsByTagNameNS(namespace, name).length) return true;
    }
  }
  return false;
}

function flowChildren(parent, wanted) {
  const items = [];
  for (const node of visibleChildren(parent)) {
    if (wanted.some(name => word(node, name))) items.push(node);
    else if (word(node, 'sdt')) {
      const content = child(node, 'sdtContent');
      if (content) items.push(...flowChildren(content, wanted));
    } else if (alternateContent(node) || ['customXml', 'ins', 'moveTo'].some(name => word(node, name))) {
      items.push(...flowChildren(node, wanted));
    }
  }
  return items;
}

function paragraphPieces(element) {
  const pieces = [];
  function read(node) {
    if (isGraphic(node)) return;
    if (['del', 'moveFrom', 'drawing', 'pict', 'object', 'txbxContent', 'pPr', 'rPr', 'ruby', 'fldChar']
      .some(name => word(node, name))) return;
    if (word(node, 't')) pieces.push({ node, text: node.textContent });
    else if (word(node, 'tab')) pieces.push({ text: '\t' });
    else if (word(node, 'cr') || (word(node, 'br') && !['page', 'column'].includes(attribute(node, 'type')))) pieces.push({ text: '\n' });
    else if (word(node, 'noBreakHyphen')) pieces.push({ text: '\u2011' });
    else if (word(node, 'softHyphen')) pieces.push({ text: '\u00ad' });
    else for (const item of visibleChildren(node)) read(item);
  }
  read(element);
  return pieces;
}

function paragraphText(element) {
  return paragraphPieces(element).map(piece => piece.text).join('');
}

function indexedParagraphs(body) {
  return Array.from(body.getElementsByTagNameNS('*', 'p')).filter(element => word(element, 'p'));
}

function editableParagraph(element) {
  if (contains(element, ['del', 'ins', 'moveFrom', 'moveTo', 'fldSimple', 'instrText', 'fldChar', 'ruby', 'sym'])) return false;
  return paragraphPieces(element).every(piece => piece.node && !/[\r\n\t]/.test(piece.text));
}

function listProperties(properties) {
  const num = child(properties, 'numPr');
  return { id: attribute(child(num, 'numId')), level: attribute(child(num, 'ilvl')) };
}

function readStyles(doc) {
  const styles = new Map();
  for (const node of doc?.documentElement?.children || []) {
    if (!word(node, 'style')) continue;
    const id = attribute(node, 'styleId');
    const name = attribute(child(node, 'name')) || id || '';
    const properties = child(node, 'pPr');
    const namedHeading = /^(?:heading|标题)\s*([1-9])$/i.exec(name);
    const outline = attribute(child(properties, 'outlineLvl'));
    styles.set(id, {
      heading: outline !== null ? Number(outline) + 1 : namedHeading ? Number(namedHeading[1]) : null,
      base: attribute(child(node, 'basedOn')),
      list: listProperties(properties),
    });
  }
  return styles;
}

function parseLevel(node) {
  return {
    start: Number(attribute(child(node, 'start')) ?? 1),
    format: attribute(child(node, 'numFmt')) || 'decimal',
    text: attribute(child(node, 'lvlText')) || '',
    restart: attribute(child(node, 'lvlRestart')),
  };
}

function readNumbering(doc) {
  const definitions = new Map();
  const instances = new Map();
  for (const node of doc?.documentElement?.children || []) {
    if (word(node, 'abstractNum')) {
      const levels = new Map();
      for (const level of node.children) if (word(level, 'lvl')) levels.set(Number(attribute(level, 'ilvl')), parseLevel(level));
      definitions.set(attribute(node, 'abstractNumId'), levels);
    } else if (word(node, 'num')) {
      instances.set(attribute(node, 'numId'), node);
    }
  }
  const counters = new Map();
  return function label(id, depth) {
    if (!id || id === '0' || !instances.has(id)) return '';
    const instance = instances.get(id);
    const levels = definitions.get(attribute(child(instance, 'abstractNumId')));
    const override = new Map(Array.from(instance.children).filter(n => word(n, 'lvlOverride'))
      .map(n => [Number(attribute(n, 'ilvl')), n]));
    function at(i) {
      const overrideLevel = child(override.get(i), 'lvl');
      const level = overrideLevel ? parseLevel(overrideLevel) : levels?.get(i);
      const start = attribute(child(override.get(i), 'startOverride'));
      return level && start !== null ? { ...level, start: Number(start) } : level;
    }
    const level = at(depth);
    if (!level) return '';
    if (!counters.has(id)) counters.set(id, Array(9).fill(null));
    const used = counters.get(id);
    used[depth] = used[depth] === null ? level.start : used[depth] + 1;
    for (let i = depth + 1; i < used.length; i++) {
      const restart = at(i)?.restart;
      if (restart === null || restart === undefined || Number(restart) === depth + 1) used[i] = null;
    }
    if (level.format === 'bullet') return '•';
    if (level.format === 'none') return '';
    return (level.text || `%${depth + 1}.`).replace(/%([1-9])/g, (token, index) => {
      const position = Number(index) - 1;
      const definition = at(position);
      return formatNumber(used[position] ?? definition?.start ?? 1, definition?.format);
    });
  };
}

function formatNumber(value, format) {
  if (format === 'decimalZero') return String(value).padStart(2, '0');
  if (format === 'upperLetter' || format === 'lowerLetter') {
    if (value < 1 || value > 100000) return String(value);
    let letters = '';
    for (let n = value; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + (n - 1) % 26) + letters;
    return format === 'upperLetter' ? letters : letters.toLowerCase();
  }
  if ((format === 'upperRoman' || format === 'lowerRoman') && value > 0 && value < 4000) {
    let roman = '';
    for (const [amount, letter] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
      [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) {
      const count = Math.floor(value / amount);
      roman += letter.repeat(count);
      value %= amount;
    }
    return format === 'upperRoman' ? roman : roman.toLowerCase();
  }
  if (['chineseCounting', 'chineseCountingThousand', 'ideographTraditional'].includes(format) && value >= 0 && value < 100) {
    const digits = '零一二三四五六七八九';
    const tens = Math.floor(value / 10);
    return tens ? `${tens === 1 ? '' : digits[tens]}十${value % 10 ? digits[value % 10] : ''}` : digits[value];
  }
  return String(value);
}

function buildDocument(body, styles, numberLabel, graphics) {
  const blocks = [];
  const warnings = [];
  const paragraphIds = new Map(indexedParagraphs(body).map((node, i) => [node, i]));
  let section = '';
  let paragraph = 0;
  let table = 0;
  let unitCount = 0;
  let complexTable = false;
  const tracked = contains(body, ['ins', 'del', 'moveFrom', 'moveTo', 'cellIns', 'cellDel']);
  if (tracked) warnings.push('含已有修订，比较可提取的修订后正文。');
  const skippedContent = contains(body, ['altChunk', 'sym', 'ruby']);
  if (skippedContent) warnings.push('含特殊 Word 内容，部分文字可能未纳入比较。');

  function editTarget(node, text) {
    const id = paragraphIds.get(node);
    return editableParagraph(node) ? { id, text } : null;
  }

  function appendGraphicBlocks(element, position, target = blocks) {
    if (!graphics.size) return;
    const ordinals = new Map();
    for (const item of graphicsIn(element)) {
      const graphic = graphics.get(item);
      if (!graphic) continue;
      let paragraph = item.parentElement;
      while (paragraph && !word(paragraph, 'p')) paragraph = paragraph.parentElement;
      const renderId = paragraphIds.get(paragraph);
      const visual = ordinals.get(renderId) || 0;
      ordinals.set(renderId, visual + (graphic.type === 'image' ? 1 : 0));
      target.push({ ...graphic, position: `${position} · ${graphic.title}`, section, renderId, visual });
    }
  }

  for (const node of flowChildren(body, ['p', 'tbl'])) {
    if (++unitCount > BLOCK_LIMIT) throw new DocumentError('可比较内容超过 5,000 个段落或单元格。请拆分文档后重试。');
    if (word(node, 'p')) {
      const text = paragraphText(node);
      if (!text.trim()) {
        appendGraphicBlocks(node, '正文');
        continue;
      }
      const properties = child(node, 'pPr');
      const ownOutline = attribute(child(properties, 'outlineLvl'));
      let heading = ownOutline === null ? null : Number(ownOutline) + 1;
      const list = listProperties(properties);
      let styleKey = attribute(child(properties, 'pStyle'));
      const visited = new Set();
      while (styles.has(styleKey) && !visited.has(styleKey)) {
        visited.add(styleKey);
        const style = styles.get(styleKey);
        heading ??= style.heading;
        list.id ??= style.list.id;
        list.level ??= style.list.level;
        styleKey = style.base;
      }
      const level = Math.min(8, Math.max(0, Number(list.level) || 0));
      const label = numberLabel(list.id, level);
      if (heading > 0 && heading <= 9) section = text.replace(/\s+/g, ' ').slice(0, 74);
      const position = `第 ${++paragraph} 段`;
      blocks.push({ kind: 'paragraph', text, heading: heading > 0 && heading <= 9 ? heading : 0,
        label, level, section, position, renderId: paragraphIds.get(node), target: editTarget(node, text) });
      appendGraphicBlocks(node, position);
      continue;
    }

    const rows = [];
    const tableGraphics = [];
    const tablePosition = `表 ${table + 1}`;
    let columns = Array.from(child(node, 'tblGrid')?.children || []).filter(n => word(n, 'gridCol')).length;
    for (const row of flowChildren(node, ['tr'])) {
      const properties = child(row, 'trPr');
      if (child(properties, 'del')) continue;
      let column = Math.max(0, Number(attribute(child(properties, 'gridBefore'))) || 0);
      if (column) complexTable = true;
      const cells = [];
      for (const cell of flowChildren(row, ['tc'])) {
        if (++unitCount > BLOCK_LIMIT) throw new DocumentError('可比较内容超过 5,000 个段落或单元格。请拆分文档后重试。');
        const props = child(cell, 'tcPr');
        if (child(props, 'cellDel')) continue;
        const span = Math.min(100, Math.max(1, Number(attribute(child(props, 'gridSpan'))) || 1));
        const contents = flowChildren(cell, ['p', 'tbl']);
        const targets = [];
        const paragraphTexts = contents.map(item => {
          if (word(item, 'p')) {
            const text = paragraphText(item);
            targets.push(editTarget(item, text));
            return text;
          }
          complexTable = true;
          targets.push(null);
          return flowChildren(item, ['tr']).map(tr => flowChildren(tr, ['tc'])
            .map(tc => flowChildren(tc, ['p']).map(paragraphText).join('\n')).join('\t')).join('\n');
        });
        if (span !== 1 || child(props, 'vMerge') || child(props, 'hMerge')) complexTable = true;
        if (child(props, 'vMerge') && attribute(child(props, 'vMerge')) !== 'restart') targets.fill(null);
        const renderIds = contents.map(item => word(item, 'p') ? paragraphIds.get(item) : null);
        cells.push({ column, span, text: paragraphTexts.join('\n'), targets, paragraphTexts, renderIds });
        appendGraphicBlocks(cell, `${tablePosition} · 第 ${rows.length + 1} 行，第 ${column + 1} 列`, tableGraphics);
        column += span;
      }
      columns = Math.max(columns, column);
      if (cells.length) rows.push({ cells, number: rows.length + 1, header: Boolean(child(properties, 'tblHeader')) });
    }
    if (rows.length) {
      table++;
      blocks.push({ kind: 'table', rows, columns, section, position: tablePosition,
        text: rows.map(row => row.cells.map(cell => cell.text).join('\u001f')).join('\u001e') });
      blocks.push(...tableGraphics);
    }
  }
  if (complexTable) warnings.push('含合并或嵌套表格，按可提取文字比较，表格布局可能简化。');
  if (skippedContent && !blocks.some(block => /[^\s\u001e\u001f]/.test(block.text))) {
    throw new DocumentError('正文中没有可提取的文字或图形。');
  }
  return { blocks, warnings };
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function withDrafts(doc, drafts) {
  if (!drafts.size) return { blocks: doc.blocks };
  function apply(target) {
    return target ? drafts.get(target.id)?.text ?? target.text : '';
  }
  const blocks = doc.blocks.map(block => {
    if (block.kind === 'paragraph') return block.target ? { ...block, text: apply(block.target) } : block;
    if (block.kind !== 'table') return block;
    const rows = block.rows.map(row => ({ ...row, cells: row.cells.map(cell => ({ ...cell,
      paragraphTexts: cell.paragraphTexts.map((text, i) => cell.targets[i] ? apply(cell.targets[i]) : text),
    })).map(cell => ({ ...cell, text: cell.paragraphTexts.join('\n') })) }));
    return { ...block, rows, text: rows.map(row => row.cells.map(cell => cell.text).join('\u001f')).join('\u001e') };
  });
  return { blocks };
}

export function canRepresentText(text) {
  return !/[\u0000-\u001f\ud800-\udfff\ufffe\uffff]/u.test(text);
}

// Keep unchanged characters in their existing w:t elements. Replacements across runs retain the styles of the replaced runs in order.
function replaceParagraphText(paragraph, replacement) {
  if (!editableParagraph(paragraph) || !canRepresentText(replacement)) throw new Error('这段文字包含当前编辑器无法保留的结构。');
  let pieces = paragraphPieces(paragraph);
  if (!pieces.length) {
    const namespace = paragraph.namespaceURI;
    const prefix = paragraph.prefix ? `${paragraph.prefix}:` : '';
    const run = paragraph.ownerDocument.createElementNS(namespace, `${prefix}r`);
    const node = paragraph.ownerDocument.createElementNS(namespace, `${prefix}t`);
    run.append(node);
    paragraph.append(run);
    pieces = [{ node, text: '' }];
  }

  const a = pieces.flatMap(piece => Array.from(piece.text));
  const b = Array.from(replacement);
  const lengths = pieces.map(piece => Array.from(piece.text).length);
  const starts = [];
  let previous = 0;
  for (const length of lengths) { starts.push(previous); previous += length; }
  const outputs = pieces.map(() => []);
  let source = 0;
  let current = 0;
  function advance(until, append, inserted = []) {
    let at = 0;
    let last = null;
    while (source < until) {
      while (current + 1 < starts.length && source >= starts[current] + lengths[current]) current++;
      const end = Math.min(until, starts[current] + lengths[current]);
      if (end <= source) throw new Error('文字位置已经改变。');
      if (append) outputs[current].push(a.slice(source, end).join(''));
      else if (at < inserted.length) {
        outputs[current].push(inserted.slice(at, at + end - source).join(''));
        at += end - source;
      }
      source = end;
      last = current;
    }
    if (at < inserted.length) outputs[last ?? current].push(inserted.slice(at).join(''));
  }

  let prefix = 0;
  let endA = a.length;
  let endB = b.length;
  while (prefix < endA && prefix < endB && a[prefix] === b[prefix]) prefix++;
  while (endA > prefix && endB > prefix && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  advance(prefix, true);
  const middleA = a.slice(prefix, endA);
  const middleB = b.slice(prefix, endB);
  const diff = diffArrays(middleA, middleB, { timeout: 150, maxEditLength: 3600 }) || [
    { removed: true, value: middleA }, { added: true, value: middleB },
  ];
  for (let i = 0; i < diff.length;) {
    const part = diff[i];
    if (!part.added && !part.removed) { advance(source + part.value.length, true); i++; continue; }
    let removed = 0;
    let inserted = [];
    while (i < diff.length && (diff[i].added || diff[i].removed)) {
      if (diff[i].removed) removed += diff[i].value.length;
      else inserted = inserted.concat(diff[i].value);
      i++;
    }
    advance(source + removed, false, inserted);
  }
  advance(a.length, true);
  for (const [i, piece] of pieces.entries()) {
    const content = outputs[i].join('');
    if (content === piece.text) continue;
    piece.node.textContent = content;
    if (/^\s|\s$/.test(content)) piece.node.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
  }
  if (paragraphText(paragraph) !== replacement) throw new Error('无法按原有格式写入此段文字。');
}

export async function exportDocument(file, doc, drafts) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const archive = zipIndex(bytes);
  const xml = parseXml(readParts(bytes, [doc.main])[doc.main]);
  const body = child(xml.documentElement, 'body');
  const paragraphs = indexedParagraphs(body);
  for (const [id, draft] of drafts) {
    const paragraph = paragraphs[id];
    if (!paragraph || paragraphText(paragraph) !== draft.original) throw new Error('底稿中的文字位置已改变。');
    replaceParagraphText(paragraph, draft.text);
  }
  const serialized = new XMLSerializer().serializeToString(xml);
  // Serializers can preserve the old XML declaration; the exported part is always UTF-8.
  const normalized = serialized.replace(/^<\?xml[^?]*\?>/, '');
  return new Blob(replaceZipPart(archive, doc.main, new TextEncoder().encode(normalized)), { type: DOCX_MIME });
}

export function stagedWord(original, doc, drafts, stamp) {
  const archive = zipIndex(original);
  // Browser preview is optional if the document has oversized render resources.
  if ([...archive.entries.values()].reduce((sum, entry) => sum + entry.size, 0) > 140 * 1024 * 1024) return null;
  const xml = parseXml(readParts(original, [doc.main])[doc.main]);
  const paragraphs = indexedParagraphs(child(xml.documentElement, 'body'));
  for (const [i, paragraph] of paragraphs.entries()) {
    const draft = drafts.get(i);
    if (draft) replaceParagraphText(paragraph, draft.text);
    const prefix = paragraph.prefix ? `${paragraph.prefix}:` : '';
    const ns = paragraph.namespaceURI;
    const open = xml.createElementNS(ns, `${prefix}bookmarkStart`);
    const close = xml.createElementNS(ns, `${prefix}bookmarkEnd`);
    const id = String(1000000 + i);
    open.setAttributeNS(ns, `${prefix}id`, id);
    open.setAttributeNS(ns, `${prefix}name`, `${stamp}${i}`);
    close.setAttributeNS(ns, `${prefix}id`, id);
    const first = child(paragraph, 'pPr')?.nextSibling ?? paragraph.firstChild;
    const afterProperties = first && word(first, 'pPr') ? first.nextSibling : first;
    paragraph.insertBefore(open, afterProperties);
    paragraph.insertBefore(close, afterProperties);
  }
  const serialized = new XMLSerializer().serializeToString(xml).replace(/^<\?xml[^?]*\?>/, '');
  return new Blob(replaceZipPart(archive, doc.main, new TextEncoder().encode(serialized)), { type: DOCX_MIME });
}

export function demoFile(revised) {
  const esc = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const para = (text, heading = false) => `<w:p>${heading ? '<w:pPr><w:outlineLvl w:val="0"/></w:pPr>' : ''}<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  const row = (values, header = false) => `<w:tr>${header ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${values.map(value => `<w:tc>${para(value)}</w:tc>`).join('')}</w:tr>`;
  const drawing = '<w:p><w:r><w:drawing><wp:inline><wp:extent cx="1645920" cy="855878"/><wp:docPr id="1" name="进度示意图" descr="进度示意图"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="progress.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1645920" cy="855878"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  const content = [
    para('项目服务协议', true),
    para('双方就项目交付、费用结算和验收安排达成以下约定。'),
    para('一、交付与付款', true),
    para(`甲方在收到合规发票后 ${revised ? '45' : '30'} 日内完成付款。`),
    para('乙方应在约定日期前交付项目成果，并提供必要的操作说明。'),
    revised ? para('如需调整交付时间，双方应以书面形式确认。') : '',
    para('二、里程碑安排', true),
    drawing,
    `<w:tbl><w:tblPr/><w:tblGrid><w:gridCol/><w:gridCol/><w:gridCol/></w:tblGrid>${row(['阶段', '交付内容', '截止日期'], true)}${row(['初稿', '项目方案', revised ? '12 月 12 日' : '12 月 10 日'])}${row(['验收', '交付清单', '12 月 20 日'])}</w:tbl>`,
    para('三、验收与通知', true),
    para('甲方在收到成果后五个工作日内书面反馈验收结果。'),
    revised ? '' : para('纸质验收报告应同步邮寄一份。'),
    para('双方的项目联系人负责记录交付和验收过程中的书面沟通。'),
  ].join('');
  const page = '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
  const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${content}${page}</w:body></w:document>`;
  const types = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="${MAIN_CONTENT_TYPE}"/></Types>`;
  const relationships = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const mediaLink = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/progress.png"/></Relationships>';
  // Two small chart thumbnails bundled with the example documents.
  const picture = revised
    ? 'iVBORw0KGgoAAAANSUhEUgAAAH0AAABBCAIAAABzWjykAAAA9ElEQVR4nO3csU0DMRiAUQdlrYiSggVSpMoCTEDFBCyQiiILpKBE2ShSRMsGiOb8ncR7rS1b+vQX1hW3uX/fBtM9zL8S3TPmvaF7Q/eG7g3dG7o3tn/Z9HncLXH30+k6/ivz3tC9oXtD94buDd0bujd0b+je0L2he0P3FX8Xm+z1/L7EsW/7l7Ea5r2he0P3hu4N3Ru6N3RvrPH9PtnH12WJYw+Pz7+smveG7g3dG7o3dG/o3tC9oXtD94buDd0bujd0b+je0L2he0P3hu4N3Ru6N3Rv6N7QvbHxP72EeW/o3tC9oXtD94buDd0bujd0b+g+Ej8yzA9D1CuVVgAAAABJRU5ErkJggg=='
    : 'iVBORw0KGgoAAAANSUhEUgAAAH0AAABBCAIAAABzWjykAAAA90lEQVR4nO3csU0DMRiAUQdln4zAACxAkSJSBmACKiZggEgUKbIAAzBCVokU0bIBojl/J/Fea8uWPv2FdcVt7t+3wXQP869E94x5b+je0L2he0P3hu6N7V827Y6HJe6+nj7Gf2XeG7o3dG/o3tC9oXtD94buDd0bujd0b+i+4u9ik71e3pc49u35ZayGeW/o3tC9oXtD94buDd0ba3y/T3b++lzi2P3j0y+r5r2he0P3hu4N3Ru6N3Rv6N7QvaF7Q/eG7g3dG7o3dG/o3tC9oXtD94buDd0bujd0b2z8Ty9h3hu6N3Rv6N7QvaF7Q/eG7g3dG7qPxA8QIg9DBdbOKQAAAABJRU5ErkJggg==';
  const bytes = zipSync({ '[Content_Types].xml': strToU8(types), '_rels/.rels': strToU8(relationships),
    'word/document.xml': strToU8(xml), 'word/_rels/document.xml.rels': strToU8(mediaLink),
    'word/media/progress.png': Uint8Array.from(atob(picture), value => value.charCodeAt(0)) });
  return new File([bytes], revised ? '项目服务协议_修订稿.docx' : '项目服务协议_原稿.docx', { type: DOCX_MIME });
}
