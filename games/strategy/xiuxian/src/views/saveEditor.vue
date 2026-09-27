<template>
  <main class="save-editor">
    <header>
      <h1>存档编辑器</h1>
      <p>读取本游戏导出的加密 JSON，修改后下载可重新导入游戏的存档。文件只在当前浏览器中处理。</p>
    </header>

    <div class="save-editor-actions">
      <label class="save-editor-button save-editor-primary">
        选择导出的存档
        <input type="file" accept=".json,application/json" @change="openFile" aria-label="选择导出的存档文件">
      </label>
      <button type="button" class="save-editor-button" @click="openCurrent">读取当前浏览器存档</button>
      <button type="button" class="save-editor-button" @click="router.push('/home')">返回游戏</button>
    </div>
    <p class="save-editor-status" :class="{ error: statusError }" role="status">{{ status }}</p>

    <template v-if="envelope">
      <section class="save-editor-panel" aria-labelledby="quick-edit-title">
        <h2 id="quick-edit-title">常用属性</h2>
        <div class="save-editor-fields">
          <label>名字<input type="text" :value="parsed.data?.player.name ?? ''" :disabled="!!parsed.error" @change="setName"></label>
          <label>境界等级<input type="number" min="0" step="1" :value="parsed.data?.player.level ?? ''" :disabled="!!parsed.error" @change="setNumber(['level'], $event)"></label>
          <label>灵石<input type="number" min="0" step="1" :value="parsed.data?.player.props.money ?? ''" :disabled="!!parsed.error" @change="setNumber(['props', 'money'], $event)"></label>
          <label>境界点<input type="number" min="0" step="1" :value="parsed.data?.player.points ?? ''" :disabled="!!parsed.error" @change="setNumber(['points'], $event)"></label>
          <label>攻击<input type="number" min="0" step="1" :value="parsed.data?.player.attack ?? ''" :disabled="!!parsed.error" @change="setNumber(['attack'], $event)"></label>
          <label>防御<input type="number" min="0" step="1" :value="parsed.data?.player.defense ?? ''" :disabled="!!parsed.error" @change="setNumber(['defense'], $event)"></label>
        </div>
      </section>

      <section class="save-editor-panel" aria-labelledby="json-edit-title">
        <h2 id="json-edit-title">完整数据</h2>
        <p>可直接编辑解密后的 player 和 boss。建议先保留原文件备份；删除游戏需要的字段可能导致导入后无法游玩。</p>
        <label class="save-editor-json-label" for="save-editor-json">解密后的 JSON</label>
        <textarea id="save-editor-json" v-model="editorText" spellcheck="false" rows="18" autocomplete="off"></textarea>
        <p class="save-editor-validation" :class="{ error: parsed.error }" role="status">{{ parsed.error || 'JSON 格式与主要游戏字段检查通过。' }}</p>
        <div class="save-editor-actions">
          <button type="button" class="save-editor-button" :disabled="!!parsed.error" @click="formatJson">格式化 JSON</button>
          <button type="button" class="save-editor-button save-editor-primary" :disabled="!!parsed.error" @click="downloadSave">下载加密存档</button>
        </div>
        <p>下载后回到游戏设置，选择“导入存档”即可使用。编辑器不会自动覆盖当前游戏存档。</p>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { saveAs } from 'file-saver'
import { decodeSave, encodeSave, validateEditableSave } from '@/plugins/save-codec'

const router = useRouter()
const envelope = ref(null)
const editorText = ref('')
const sourceName = ref('存档')
const status = ref('请选择导出的存档，或读取当前浏览器存档。')
const statusError = ref(false)

const parsed = computed(() => {
  try {
    return { data: validateEditableSave(JSON.parse(editorText.value)), error: '' }
  } catch (error) {
    return { data: null, error: error instanceof SyntaxError ? 'JSON 格式有误，请检查标点、引号和逗号。' : error.message }
  }
})

function load(text, name) {
  try {
    const result = decodeSave(text)
    envelope.value = result.envelope
    editorText.value = JSON.stringify(result.data, null, 2)
    sourceName.value = name.replace(/\.json$/i, '') || '存档'
    status.value = `已读取 ${name}。可编辑属性或完整 JSON。`
    statusError.value = false
  } catch (error) {
    envelope.value = null
    editorText.value = ''
    status.value = error.message
    statusError.value = true
  }
}

async function openFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    status.value = '文件超过 10 MB，请选择游戏导出的原始存档。'
    statusError.value = true
    return
  }
  try {
    load(await file.text(), file.name)
  } catch {
    status.value = '读取文件失败，请重新选择存档。'
    statusError.value = true
  }
}

function openCurrent() {
  const saved = localStorage.getItem('vuex')
  if (saved) load(saved, '当前浏览器存档.json')
  else {
    status.value = '当前浏览器没有游戏存档；请先游玩或选择导出的文件。'
    statusError.value = true
  }
}

function setName(event) {
  const data = parsed.value.data
  if (!data) return
  data.player.name = event.target.value
  editorText.value = JSON.stringify(data, null, 2)
}

function setNumber(path, event) {
  const data = parsed.value.data
  if (!data) return
  const number = Number(event.target.value)
  if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) {
    status.value = '请输入不小于 0 的整数。'
    statusError.value = true
    event.target.value = path.length === 1 ? data.player[path[0]] : data.player[path[0]][path[1]]
    return
  }
  if (path.length === 1) data.player[path[0]] = number
  else data.player[path[0]][path[1]] = number
  editorText.value = JSON.stringify(data, null, 2)
  statusError.value = false
  status.value = '修改已写入下方 JSON；下载后才会生成新存档。'
}

function formatJson() {
  if (parsed.value.data) editorText.value = JSON.stringify(parsed.value.data, null, 2)
}

function downloadSave() {
  try {
    const contents = encodeSave(envelope.value, parsed.value.data)
    saveAs(new Blob([contents], { type: 'application/json;charset=utf-8' }), `${sourceName.value}-已编辑.json`)
    status.value = '已生成加密存档。回到游戏设置中导入下载的文件。'
    statusError.value = false
  } catch (error) {
    status.value = error.message
    statusError.value = true
  }
}
</script>

<style scoped>
.save-editor { max-width: 100%; text-align: left; font: 14px/1.6 system-ui, sans-serif; }
.save-editor h1 { margin: 0 0 4px; font-size: 25px; }
.save-editor h2 { margin: 0 0 12px; font-size: 18px; }
.save-editor p { margin: 8px 0 16px; }
.save-editor-actions { display: flex; flex-wrap: wrap; gap: 9px; margin: 16px 0; }
.save-editor-button { position: relative; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 7px 14px; border: 1px solid #aeb7c5; border-radius: 8px; background: #fff; color: #25344a; cursor: pointer; font: inherit; }
.save-editor-button:disabled { cursor: not-allowed; opacity: .5; }
.save-editor-primary { border-color: #4374c1; background: #4374c1; color: #fff; }
.save-editor-button input[type=file] { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; }
.save-editor-button:focus-within, .save-editor-button:focus-visible, .save-editor input:focus-visible, .save-editor textarea:focus-visible { outline: 2px solid #568ced; outline-offset: 2px; }
.save-editor-status, .save-editor-validation { min-height: 22px; color: #2f6d43; }
.save-editor .error { color: #c34343; }
.save-editor-panel { margin: 20px 0; padding: 17px; border: 1px solid #cbd3dd; border-radius: 10px; background: rgba(255,255,255,.82); }
.save-editor-fields { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
.save-editor-fields label { display: grid; gap: 4px; }
.save-editor input:not([type=file]), .save-editor textarea { box-sizing: border-box; width: 100%; padding: 9px; border: 1px solid #aeb7c5; border-radius: 6px; background: #fff; color: #1b2736; font: inherit; user-select: text; }
.save-editor-json-label { display: block; margin-bottom: 6px; font-weight: 600; }
.save-editor textarea { min-height: 320px; resize: vertical; font: 12px/1.5 ui-monospace, Consolas, monospace; }
:global(html.dark) .save-editor-panel { border-color: #4a5260; background: #20242b; }
:global(html.dark) .save-editor-button { border-color: #657188; background: #303945; color: #eef2f7; }
:global(html.dark) .save-editor-primary { background: #4374c1; border-color: #4374c1; }
:global(html.dark) .save-editor input:not([type=file]), :global(html.dark) .save-editor textarea { border-color: #657188; background: #151b22; color: #eef2f7; }
@media (max-width: 540px) { .save-editor-fields { grid-template-columns: 1fr; } .save-editor-panel { padding: 12px; } }
</style>
