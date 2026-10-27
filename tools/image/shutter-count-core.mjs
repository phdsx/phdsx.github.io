// Only camera maker-note counters are eligible. File/image sequence numbers and
// user-editable XMP fields must never be presented as lifetime shutter counts.
const makerGroup = /^(?:Nikon\w*|Sony\w*|Canon\w*|Pentax\w*|Ricoh\w*|FujiFilm\w*|Samsung\w*|Olympus\w*|Panasonic\w*)$/i;
const definitions = {
  MechanicalShutterCount: { label: '机械快门次数', rank: 0 },
  ShutterCount: { label: '快门计数', rank: 1 },
  ShutterCount2: { label: '快门计数 2', rank: 2 },
  ShutterCount3: { label: '快门计数 3', rank: 3 },
  ImageCount: { label: '图像计数', rank: 4 }
};

export const metadataArgs = ['-json', '-G1', '-a', '-s', '-q', '-q',
  '-Make', '-Model', '-LensModel', '-DateTimeOriginal', '-FileType',
  '-ExifToolVersion', '-Warning', '-Error', ...Object.keys(definitions).map(tag => '-' + tag)];

export function summarizeMetadata(tags) {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) throw new Error('无效的元数据结果');
  const entries = Object.entries(tags);
  const field = name => entries.find(([key]) => key.split(':').at(-1) === name)?.[1] ?? '';
  const counters = [];
  for (const [key, raw] of entries) {
    const [group, tag, extra] = key.split(':');
    if (extra || !makerGroup.test(group) || !Object.hasOwn(definitions, tag)) continue;
    if (!(typeof raw === 'number' || typeof raw === 'string' && /^\d+$/.test(raw))) continue;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 0) continue;
    counters.push({ key, tag, value, ...definitions[tag] });
  }
  counters.sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key));
  return {
    make: String(field('Make')), model: String(field('Model')),
    lens: String(field('LensModel')), date: String(field('DateTimeOriginal')),
    type: String(field('FileType')), engine: String(field('ExifToolVersion')),
    counters, warnings: entries.filter(([key]) => /:(?:Warning|Error)$/.test(key)).map(([, value]) => String(value))
  };
}

export function validateFile(file) {
  if (!file || file.size === 0) return '文件为空，请选择相机直出的原始照片。';
  if (file.size > 200 * 1024 * 1024) return '文件超过 200 MiB，请选择较小的原始照片。';
  if (!/\.(?:jpe?g|tiff?|nef|nrw|arw|sr2|srf|cr2|cr3|crw|raf|pef|dng|orf|rw2|srw|rwl|heic|heif|hif)$/i.test(file.name)) {
    return '请选择 JPEG、TIFF、HEIF 或相机 RAW 原片；截图和 PNG 通常没有快门计数。';
  }
  return '';
}
