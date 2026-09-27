import assert from 'node:assert/strict'
import test from 'node:test'
import crypto from './crypto.js'
import { decodeSave, encodeSave } from './save-codec.js'

const player = {
  name: '玩家', age: 1, level: 0, health: 100, maxHealth: 100, attack: 10, defense: 10,
  props: { money: 3 }, equipment: {}, achievement: {},
  inventory: [], pets: [], wifes: [], npcs: [], shopData: []
}

test('editor output remains compatible with the game serializer', () => {
  const original = JSON.stringify({
    boss: crypto.encryption({ name: '首领' }),
    player: crypto.encryption(player),
    extra: 'preserved'
  })
  const { envelope, data } = decodeSave(original)
  assert.equal(data.player.props.money, 3)
  data.player.props.money = 99
  const rewritten = JSON.parse(encodeSave(envelope, data))
  assert.equal(crypto.decryption(rewritten.player).props.money, 99)
  assert.equal(crypto.decryption(rewritten.boss).name, '首领')
  assert.equal(rewritten.extra, 'preserved')
})

test('unrelated or corrupt files are rejected', () => {
  assert.throws(() => decodeSave('{"player":{},"boss":{}}'), /加密/)
  assert.throws(() => decodeSave('{"player":"bad","boss":"bad"}'), /无法解密/)
})
