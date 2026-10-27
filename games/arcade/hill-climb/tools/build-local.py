"""Build the local Chinese HCR Lite archive from the recorded 1.3.0 input.

Original art, physics and level resources stay byte-identical. Only localization,
font coverage and platform integration are patched. See REA_FINDINGS.md.
"""
from pathlib import Path
import sys, json, struct, csv, io, shutil, hashlib, re, zlib, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

GAME = Path(__file__).resolve().parents[1]
REPO = GAME.parents[2]
SOURCE = Path(os.environ.get('HCR_SOURCE', REPO / '.local-tools/hill-climb-original'))
from unpack_hcr import wire

def vint(value):
    value &= (1 << 64) - 1
    result = bytearray()
    while value >= 128:
        result.append((value & 127) | 128); value >>= 7
    result.append(value); return bytes(result)

def encode(fields):
    out = bytearray()
    for field, kind, value in fields:
        out.extend(vint(field << 3 | kind))
        if kind == 0: out.extend(vint(value))
        elif kind == 2: out.extend(vint(len(value))); out.extend(value)
        else: out.extend(value)
    return bytes(out)

def replace(fields, field, kind, value):
    return [(f, k, v) for f, k, v in fields if f != field] + [(field, kind, value)]

def f32(value): return struct.pack('<f', value)

def patch_lua(blob, source):
    top = wire(blob)
    nested = wire(next(v for f, k, v in top if f == 1 and k == 2))
    nested = replace(nested, 1, 2, source.encode('utf-8'))
    return encode(replace(top, 1, 2, encode(nested)))

def augment_font(body, size, chars):
    fields = wire(body)
    values = {f: v for f, k, v in fields if f != 1}
    glyphs = [(f, k, v) for f, k, v in fields if f == 1]
    present = {dict((f, v) for f, k, v in wire(g[2]))[1] for g in glyphs}
    data = bytearray(values[4]); padding = values.get(2, 0)
    channels = values.get(3, 1)
    font_path = Path(os.environ.get('HCR_FONT_PATH', REPO / '.local-tools/hole-original/NotoSansSC.ttf'))
    font = ImageFont.truetype(str(font_path), size)
    try: font.set_variation_by_axes([800])
    except (AttributeError, OSError): pass
    cell_w, cell_h, cell_ascent = values.get(16, 0), values.get(17, 0), values.get(18, 0)
    missing = sorted(chars - present)
    for point in missing:
        char = chr(point)
        # Match the existing bank's bitmap channels, including its outline/shadow.
        left, top, right, bottom = font.getbbox(char, anchor='ls')
        border = max(1, padding)
        image_width = max(1, right - left) + border * 2
        ascent, descent = max(0, -top) + border, max(0, bottom) + border
        width, height = image_width + padding * 2, ascent + descent + padding * 2
        face = Image.new('L', (width, height)); d = ImageDraw.Draw(face)
        d.text((padding + border - left, padding + ascent), char, font=font, fill=255, anchor='ls')
        outline = face.filter(ImageFilter.MaxFilter(border * 2 + 1))
        shadow = outline.filter(ImageFilter.GaussianBlur(.7))
        if channels == 1: pixels = face.tobytes()
        elif channels == 3: pixels = Image.merge('RGB', (face, outline, shadow)).tobytes()
        else: pixels = Image.merge('RGBA', (face, outline, shadow, face)).tobytes()
        # Flag 0 is the engine's raw bitmap representation: no compression predictor.
        pixels = b'\x00' + pixels
        glyph = [(1, 0, point), (2, 5, f32(image_width)), (3, 0, image_width),
                 (4, 5, f32(font.getlength(char))), (5, 5, f32(left - border)),
                 (6, 0, ascent), (7, 0, descent), (10, 0, len(data)), (11, 0, len(pixels))]
        glyphs.append((1, 2, encode(glyph))); data.extend(pixels)
        cell_w = max(cell_w, width); cell_h = max(cell_h, height); cell_ascent = max(cell_ascent, ascent)
    fields = [x for x in fields if x[0] != 1]
    fields = replace(fields, 4, 2, bytes(data))
    for field, value in [(14, 2048), (15, 2048), (16, cell_w), (17, cell_h), (18, cell_ascent)]:
        fields = replace(fields, field, 0, value)
    return encode(glyphs + fields), len(missing)

def main():
    investigation = SOURCE / 'investigation'
    translations = json.loads((GAME / 'localization/zh-CN.json').read_text(encoding='utf-8'))
    sources = json.loads((investigation / 'source-index.json').read_text())
    mapping = json.loads((investigation / 'resource-map.json').read_text())
    path_map = {x['path']: x['hash'] for x in mapping}
    patches = {}
    def original(digest): return (SOURCE / 'unpacked' / digest).read_bytes()
    for entry in sources:
        path = entry['source_path']; source = (investigation / 'source' / path).read_text(encoding='utf-8')
        changed = False
        if path == 'modules/lang.lua':
            source = source.replace('ENGLISH = "en",', 'ENGLISH = "en",\n CHINESE = "zh",')
            source = source.replace('en = hash("main_menu_buttons"),', 'zh = hash("main_menu_buttons"),\n en = hash("main_menu_buttons"),')
            source = source.replace('en = hash("main_game_font"),', 'zh = hash("main_game_font"),\n en = hash("main_game_font"),')
            source = source.replace('en = hash("wtour_font"),', 'zh = hash("wtour_font"),\n en = hash("wtour_font"),')
            source = source.replace('M.language = LANGUAGE_CODES.ENGLISH', 'M.language = LANGUAGE_CODES.CHINESE')
            # Translate text paths which bypass the original Druid localization helper.
            additions = (GAME / 'patches/localization.lua').read_text(encoding='utf-8')
            source = source.replace('return M', additions + '\nreturn M')
            changed = True
        elif path == 'modules/platforms/platforms.lua':
            source = source.replace('return platforms', (GAME / 'patches/local-platform.lua').read_text(encoding='utf-8') + '\nreturn platforms')
            changed = True
        elif path == 'modules/platforms/Poki/poki_wrapper.lua':
            source = (GAME / 'patches/no-sdk.lua').read_text(encoding='utf-8'); changed = True
        elif path == 'modules/managers/player_info.lua':
            source = source.replace('language = "en"', 'language = "zh"').replace('state.language = "en"', 'state.language = "zh"')
            source = source.replace('return M', (GAME / 'patches/save-compat.lua').read_text(encoding='utf-8') + '\nreturn M')
            changed = True
        elif path.endswith('main_menu_language.gui_script'):
            source = source.replace('"English",', '"简体中文",')
            source = source.replace('LANGUAGE_CODES.ENGLISH, true', 'LANGUAGE_CODES.CHINESE, true')
            source = source.replace('local number_of_languages = 9', 'local number_of_languages = 1')
            changed = True
        elif path == 'main/controller_main_start.script':
            source = source.replace('pi:clear_data()', 'pi:clear_data()\n pi:import_legacy_canvas()')
            source = source.replace('SCENE_HELPER.update(dt)', '''SCENE_HELPER.update(dt)
    self.local_snapshot_time = (self.local_snapshot_time or 0) + dt
    if html5 and self.local_snapshot_time > 0.5 then
        self.local_snapshot_time = 0
        local snapshot = json.encode({ coins = pi:get_coins(), language = lang.get_language(),
            stage = tostring(pi:get_selected_stage_id()), vehicle = tostring(pi:get_selected_vehicle_id()),
            races = pi.get_number_of_races(), upgrades = pi.get_number_of_upgrades(), paused = SCENE_HELPER.get_paused(), texts = HCR_LOCAL_TEXTS or {} })
        html5.run("window.HCR_LOCAL_STATE=" .. snapshot)
    end''')
            changed = True
        elif path == 'resources/ui/game_ui/game_ui/game_ui_druid.gui_script':
            source = source.replace('function init(self)', (GAME/'patches/gauges.lua').read_text(encoding='utf-8') + '\nfunction init(self)\n localize_gauges()')
            source = source.replace('self.time = self.time + dt', '''self.time = self.time + dt
    self.local_report_time = (self.local_report_time or 0) + dt
    if html5 and self.local_report_time > 0.25 then
        self.local_report_time = 0
        html5.run("window.HCR_LOCAL_RUN=" .. json.encode({distance=game_data.distance, fuel=ui_state.fuel_level, rpm=ui_state.rpm_level, boost=ui_state.boost_level}))
        if html5.run("window.HCR_LOCAL_COMMAND||''") == "pause" then
            html5.run("window.HCR_LOCAL_COMMAND=''")
            on_button_callback_settings(self)
        end
    end''')
            changed = True
        if changed: patches[entry['hash']] = patch_lua(original(entry['hash']), source)
    rows = list(csv.reader(io.StringIO((investigation / 'all-languages.tsv').read_text(encoding='utf-8')), delimiter='\t'))
    rows[0].append('zh')
    for row in rows[1:]: row.append(translations[row[0]])
    original_keys = {row[0] for row in rows[1:]}
    for key, value in translations.items():
        if key not in original_keys: rows.append([key] + [''] * (len(rows[0]) - 2) + [value])
    stream = io.StringIO(); csv.writer(stream, delimiter='\t', lineterminator='\n', quoting=csv.QUOTE_NONE, escapechar=None).writerows(rows)
    patches[path_map['/assets/all-languages.tsv']] = stream.getvalue().encode('utf-8')
    # Translate authored GUI defaults and remove movie pictograms from free rewards.
    gui_results = []
    for item in mapping:
        if not item['path'].endswith('.guic'): continue
        def patch_node(blob):
            node = wire(blob); props = {f: v for f, k, v in node}
            text = props.get(8, b'').decode('utf-8', 'replace')
            texture = props.get(9, b'').decode('utf-8', 'replace')
            identity = props.get(11, b'').decode('utf-8', 'replace')
            if text in translations: node = replace(node, 8, 2, translations[text].replace('\\n', '\n').encode('utf-8'))
            if 'rewarded-ad-icon' in texture or 'video_icon' in identity:
                node = replace(node, 46, 0, 0)
            return encode(node)
        gui = wire(original(item['hash'])); updated = []
        for f, k, v in gui:
            if f == 6 and k == 2: v = patch_node(v)
            elif f == 9 and k == 2:
                v = encode([(nf, nk, patch_node(nv) if nf == 2 and nk == 2 else nv) for nf, nk, nv in wire(v)])
            updated.append((f, k, v))
        output = encode(updated)
        if output != original(item['hash']): patches[item['hash']] = output; gui_results.append(item['path'])
    all_text = ''.join(translations.values()) + '中文免费领取无广告继续返回游戏大厅加载暂停设置购买纪录等级双倍加成经验米' + ''.join(translations.keys())
    chars = {ord(char) for char in all_text if ord(char) >= 0x3000}
    font_results = []
    for item in mapping:
        if not item['path'].endswith('.fontc') or 'default' in item['path'] or 'signFont' in item['path']: continue
        font_fields = dict((f, v) for f, k, v in wire(original(item['hash'])))
        glyph_path = font_fields[2].decode(); glyph_hash = path_map[glyph_path]
        size = font_fields[4]
        patched, added = augment_font(original(glyph_hash), size, chars)
        patches[glyph_hash] = patched
        font_results.append({'font': item['path'], 'size': size, 'added_glyphs': added})
    # Preserve all original payloads at their offsets; append only modified resources.
    arci = bytearray((SOURCE / 'archive/game0.arci').read_bytes())
    metadata = json.loads((SOURCE / 'archive/archive_files.json').read_text())
    arcd = bytearray()
    for piece in next(x for x in metadata['content'] if x['name'] == 'game.arcd')['pieces']:
        arcd.extend((SOURCE / 'archive' / piece['name']).read_bytes())
    count, offset, hash_offset, hash_len = struct.unpack_from('>4I', arci, 16)
    applied = []
    for i in range(count):
        digest = arci[hash_offset + i * 64:hash_offset + i * 64 + hash_len].hex()
        if digest not in patches: continue
        payload = patches[digest]
        while len(arcd) % 4: arcd.append(0)
        struct.pack_into('>4I', arci, offset + i * 16, len(arcd), len(payload), 0xffffffff, 0)
        arcd.extend(payload); applied.append({'original_resource': digest, 'patched_sha256': hashlib.sha256(payload).hexdigest(), 'bytes': len(payload)})
    runtime = GAME / 'runtime'; archive = runtime / 'archive'; archive.mkdir(parents=True, exist_ok=True)
    contents = {'game.projectc': (SOURCE / 'archive/game0.projectc').read_bytes(), 'game.arci': bytes(arci), 'game.arcd': bytes(arcd), 'game.dmanifest': (SOURCE / 'archive/game0.dmanifest').read_bytes(), 'game.public.der': (SOURCE / 'archive/game0.public.der').read_bytes()}
    manifest = []
    for name, body in contents.items():
        pieces = []
        if name == 'game.arcd':
            for piece_index, piece_offset in enumerate(range(0, len(body), 2097152)):
                piece_name = f'game{piece_index}.arcd'
                (archive / piece_name).write_bytes(body[piece_offset:piece_offset+2097152])
                pieces.append({'name': piece_name, 'offset': piece_offset})
        else:
            (archive / name).write_bytes(body); pieces = [{'name': name, 'offset': 0}]
        manifest.append({'name': name, 'size': len(body), 'pieces': pieces})
    (archive / 'archive_files.json').write_text(json.dumps({'content': manifest, 'total_size': sum(x['size'] for x in manifest)}))
    for name in ['HCRLite.wasm', 'HCRLite_wasm.js', 'dmloader.js']: shutil.copy2(SOURCE / name, runtime / name)
    reference_data_size = next(x['size'] for x in metadata['content'] if x['name'] == 'game.arcd')
    report = {'source_version': '1.3.0', 'archive_entries': count, 'translated_messages': len(translations), 'original_payloads_unchanged': count - len(applied), 'original_data_bytes': reference_data_size, 'original_data_sha256': hashlib.sha256(arcd[:reference_data_size]).hexdigest(), 'patched_resources': applied, 'font_results': font_results, 'localized_gui_scenes': gui_results, 'engine_sha256': hashlib.sha256((runtime/'HCRLite.wasm').read_bytes()).hexdigest()}
    (runtime / 'build-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'patched_resources': len(applied), 'fonts': font_results, 'runtime_archive_bytes': len(arcd)}, ensure_ascii=False, indent=2))

if __name__ == '__main__': main()
