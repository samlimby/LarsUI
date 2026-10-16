import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = process.argv[2]
if (!output) throw new Error('Pass the build output directory: dist or site-dist')

const fonts = new URL('../src/assets/fonts/', import.meta.url)
const [sources, paperMono, inter] = await Promise.all([
  readFile(new URL('FONT-SOURCES.md', fonts), 'utf8'),
  readFile(new URL('paper-mono/OFL.txt', fonts), 'utf8'),
  readFile(new URL('inter/OFL.txt', fonts), 'utf8'),
])

await writeFile(resolve(root, output, 'FONT-LICENSES.txt'), [
  'LarsUI bundled font sources and licenses',
  sources.trim(),
  'Paper Mono',
  paperMono.trim(),
  'Inter',
  inter.trim(),
  '',
].join('\n\n'))
console.log(`Copied font licenses to ${output}/FONT-LICENSES.txt`)
