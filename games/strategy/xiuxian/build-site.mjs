import { cpSync, copyFileSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, 'dist')

// Vite builds source.html so index.html can remain the checked-in static page.
// Replace only files owned by this game's generated build.
rmSync(path.join(here, 'assets'), { recursive: true, force: true })
cpSync(path.join(dist, 'assets'), path.join(here, 'assets'), { recursive: true })
copyFileSync(path.join(dist, 'source.html'), path.join(here, 'index.html'))
for (const name of ['LICENSE.txt', 'favicon.ico']) {
  copyFileSync(path.join(dist, name), path.join(here, name))
}
if (existsSync(path.join(dist, 'icons'))) {
  rmSync(path.join(here, 'icons'), { recursive: true, force: true })
  cpSync(path.join(dist, 'icons'), path.join(here, 'icons'), { recursive: true })
}
rmSync(dist, { recursive: true, force: true })
console.log('Published static game at games/strategy/xiuxian/index.html')
