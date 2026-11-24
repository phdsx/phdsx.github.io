(() => {
  const get = (id) => document.getElementById(id);
  const source = get('eq-source');
  const output = get('eq-output');
  const body = get('eq-review-body');
  const template = get('eq-row-template');
  const toneType = get('eq-tone-type');
  const nonZh = get('eq-non-zh');
  const downValue = get('eq-down-value');
  const placeholder = get('eq-placeholder');
  const sourceStatus = get('eq-status');
  const reviewStatus = get('eq-review-status');
  const outputStatus = get('eq-output-status');
  const library = window.pinyinPro;

  let rows = [];
  let reviewRows = [];

  const isHan = (character) => /[\p{Unified_Ideograph}〇]/u.test(character);

  function setStatus(element, message, error = false) {
    element.textContent = message;
    element.toggleAttribute('data-error', error);
  }

  function getReading(character) {
    if (!isHan(character)) return { reading: character, numbered: '', manualType: '' };
    return {
      reading: library?.pinyin(character, { nonZh: 'removed', v: true }) ?? '',
      numbered: library?.pinyin(character, { toneType: 'num', nonZh: 'removed' }) ?? '',
      manualType: ''
    };
  }

  function getNumberedReading(value) {
    const reading = value.trim().toLowerCase().normalize('NFC');
    const numbered = /[0-5]$/.test(reading)
      ? reading.replace(/5$/, '0')
      : library?.convert(reading, { format: 'symbolToNum' }) ?? '';
    return /^[a-züê]+[0-4]$/.test(numbered) ? numbered : '';
  }

  function displayReading(row) {
    if (!row.numbered || toneType.value === row.manualType) return row.reading;
    if (toneType.value === 'num') return row.numbered.replaceAll('ü', 'v');
    if (toneType.value === 'none') return row.numbered.slice(0, -1).replaceAll('ü', 'v');
    return row.manualType ? library.convert(row.numbered) : row.reading;
  }

  // EQ uses parentheses and commas to delimit instructions and operands.
  function escapeOperand(value) {
    return value.replace(/[\\(),]/g, '\\$&');
  }

  function makeCode(pinyin) {
    const down = downValue.value || '38';
    const mark = escapeOperand(placeholder.value || '$');
    return `EQ \\o(\\l(${escapeOperand(pinyin)}),\\s\\do${down}(${mark}))`;
  }

  function currentCodes() {
    return reviewRows.map(({ row }) => makeCode(displayReading(row))).join('\n');
  }

  function updateOutput() {
    output.value = currentCodes();
    setStatus(reviewStatus, '');
    setStatus(outputStatus, '');
  }

  function syncRow(view) {
    const reading = displayReading(view.row);
    if (view.pinyin.value !== reading) view.pinyin.value = reading;
    view.tone.disabled = !isHan(view.row.character) || !view.row.numbered;
    view.tone.value = view.tone.disabled ? '' : view.row.numbered.slice(-1);
    view.code.textContent = makeCode(reading);
  }

  function renderRows() {
    const fragment = document.createDocumentFragment();
    const visible = rows.filter((row) => row.sourceIsHan || nonZh.value === 'keep');

    reviewRows = visible.map((row, index) => {
      const tr = template.content.firstElementChild.cloneNode(true);
      const character = tr.querySelector('.eq-char-edit');
      const pinyin = tr.querySelector('.eq-pinyin-edit');
      const tone = tr.querySelector('.eq-tone-edit');
      const code = tr.querySelector('code');
      const remove = tr.querySelector('button');
      const view = { row, pinyin, tone, code, remove };
      const position = `第 ${index + 1} 行`;

      tr.querySelector('.eq-row-number').textContent = String(index + 1);
      character.value = row.character;
      character.setAttribute('aria-label', `${position}字符`);
      pinyin.setAttribute('aria-label', `${position}拼音`);
      tone.setAttribute('aria-label', `${position}声调`);
      remove.setAttribute('aria-label', `删除${position}`);
      syncRow(view);

      character.addEventListener('change', () => {
        if (Array.from(character.value).length !== 1) {
          character.value = row.character;
          setStatus(reviewStatus, '每行只能填写一个字符。', true);
          return;
        }
        row.character = character.value;
        Object.assign(row, getReading(row.character));
        syncRow(view);
        updateOutput();
        showGenerationStatus();
      });

      pinyin.addEventListener('input', () => {
        const wasMissing = !row.reading;
        row.reading = pinyin.value;
        row.numbered = isHan(row.character) ? getNumberedReading(row.reading) : '';
        row.manualType = toneType.value;
        syncRow(view);
        updateOutput();
        if (isHan(row.character) && (wasMissing !== !row.reading)) showGenerationStatus();
      });

      tone.addEventListener('change', () => {
        if (tone.value === '') {
          syncRow(view);
          return;
        }
        row.numbered = `${row.numbered.slice(0, -1)}${tone.value}`;
        row.reading = library.convert(row.numbered.replaceAll('v', 'ü'));
        row.manualType = '';
        syncRow(view);
        updateOutput();
      });

      remove.addEventListener('click', () => {
        rows.splice(rows.indexOf(row), 1);
        renderRows();
        if (reviewRows.length) {
          showGenerationStatus();
          reviewRows[Math.min(index, reviewRows.length - 1)].remove.focus();
          setStatus(reviewStatus, '已删除该行。');
        } else {
          source.focus();
          setStatus(sourceStatus, '校验列表已清空。');
        }
      });

      fragment.append(tr);
      return view;
    });

    body.replaceChildren(fragment);
    get('eq-review').hidden = !visible.length;
    get('eq-empty').hidden = Boolean(visible.length);
    get('eq-review-actions').hidden = !visible.length;
    const count = get('eq-count');
    count.hidden = !visible.length;
    count.textContent = `${visible.length} 行`;
    updateOutput();
  }

  function generate() {
    const characters = source.value.split(/\r\n?|\n/).filter((line) => line.trim()).flatMap((line) => Array.from(line));
    rows = characters.map((character) => ({
      character,
      sourceIsHan: isHan(character),
      ...getReading(character)
    }));
    renderRows();
    showGenerationStatus();
  }

  function showGenerationStatus() {
    if (!reviewRows.length) {
      const message = nonZh.value === 'keep' ? '请输入文本。' : '请输入至少一个汉字，或选择保留非汉字。';
      setStatus(sourceStatus, message, true);
      return;
    }
    const missing = reviewRows.filter(({ row }) => isHan(row.character) && !row.reading).length;
    setStatus(sourceStatus, missing
      ? `已生成 ${reviewRows.length} 行，其中 ${missing} 个汉字需手动填写拼音。`
      : `已生成 ${reviewRows.length} 行域代码。`, Boolean(missing));
  }

  async function copyText(text, status) {
    if (!text) {
      setStatus(status, '没有可复制的内容。', true);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const active = document.activeElement;
      const field = document.createElement('textarea');
      field.className = 'sr-only';
      field.value = text;
      document.body.append(field);
      field.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch {
        // Some browsers disable the legacy copy command.
      } finally {
        field.remove();
        active?.focus();
        setStatus(status, copied ? '已复制到剪贴板。' : '复制失败，请选中文本后手动复制。', !copied);
      }
      return;
    }
    setStatus(status, '已复制到剪贴板。');
  }

  get('eq-form').addEventListener('submit', (event) => {
    event.preventDefault();
    generate();
  });
  get('eq-sample').addEventListener('click', () => {
    source.value = '是的\n僵硬\n中华人民共和国';
    source.focus();
    setStatus(sourceStatus, '已填入示例。');
  });
  get('eq-clear').addEventListener('click', () => {
    source.value = '';
    rows = [];
    renderRows();
    source.focus();
    setStatus(sourceStatus, '已清空。');
  });
  get('eq-refresh').addEventListener('click', () => {
    updateOutput();
    setStatus(reviewStatus, '代码已刷新。');
  });
  get('eq-copy-all').addEventListener('click', () => copyText(currentCodes(), reviewStatus));
  get('eq-copy-output').addEventListener('click', () => copyText(output.value, outputStatus));
  get('eq-download').addEventListener('click', () => {
    const text = output.value || currentCodes();
    if (!text) {
      setStatus(outputStatus, '没有可导出的内容。', true);
      return;
    }
    const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toLocaleDateString('sv-SE');
    link.download = `EQ单字拼音域代码_${date}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(outputStatus, 'TXT 已导出。');
  });

  for (const input of [downValue, placeholder]) {
    input.addEventListener('input', () => {
      for (const { row, code } of reviewRows) code.textContent = makeCode(displayReading(row));
      if (reviewRows.length) updateOutput();
    });
  }
  toneType.addEventListener('change', () => {
    reviewRows.forEach(syncRow);
    if (reviewRows.length) updateOutput();
  });
  nonZh.addEventListener('change', () => {
    if (!rows.length) return;
    renderRows();
    showGenerationStatus();
  });
})();
