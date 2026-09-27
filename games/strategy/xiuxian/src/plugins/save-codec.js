import crypto from './crypto.js'

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

export function validateEditableSave(data) {
  if (!isObject(data) || !isObject(data.player) || !isObject(data.boss)) {
    throw new Error('存档需要包含 player 和 boss 两个对象。')
  }
  const player = data.player
  if (!isObject(player.props) || !isObject(player.equipment) || !isObject(player.achievement)) {
    throw new Error('player.props、equipment 和 achievement 必须是对象。')
  }
  for (const key of ['inventory', 'pets', 'wifes', 'npcs', 'shopData']) {
    if (!Array.isArray(player[key])) throw new Error(`player.${key} 必须是数组。`)
  }
  for (const key of ['age', 'level', 'health', 'maxHealth', 'attack', 'defense']) {
    if (typeof player[key] !== 'number' || !Number.isFinite(player[key])) {
      throw new Error(`player.${key} 必须是有限数字。`)
    }
  }
  if (typeof player.name !== 'string' || !player.name.trim()) {
    throw new Error('player.name 不能为空。')
  }
  return data
}

export function decodeSave(text) {
  let envelope
  try {
    envelope = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON 存档。')
  }
  if (!isObject(envelope) || typeof envelope.player !== 'string' || typeof envelope.boss !== 'string') {
    throw new Error('未找到游戏导出的加密 player 和 boss 数据。')
  }
  let data
  try {
    data = {
      player: crypto.decryption(envelope.player),
      boss: crypto.decryption(envelope.boss)
    }
  } catch {
    throw new Error('无法解密存档；请确认文件来自当前游戏。')
  }
  return { envelope, data: validateEditableSave(data) }
}

export function encodeSave(envelope, data) {
  validateEditableSave(data)
  if (!isObject(envelope)) throw new Error('请先读取原始存档。')
  return JSON.stringify({
    ...envelope,
    boss: crypto.encryption(data.boss),
    player: crypto.encryption(data.player)
  })
}
