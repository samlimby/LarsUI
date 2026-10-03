import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url))
const cssSideEffectImport = /^[ \t]*import[ \t]+(['"])[^'"\r\n]+\.css\1[ \t]*;?[ \t]*(?:\r?\n|$)/gm

async function stripCssImports(directory) {
  let removed = 0

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      removed += await stripCssImports(path)
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      const declaration = await readFile(path, 'utf8')
      const imports = declaration.match(cssSideEffectImport)
      if (!imports) continue

      await writeFile(path, declaration.replace(cssSideEffectImport, ''))
      removed += imports.length
    }
  }

  return removed
}

const removed = await stripCssImports(distDirectory)
console.log(`Removed ${removed} CSS side-effect imports from generated declarations.`)

// Allow strict TypeScript consumers to import the public stylesheet without Vite globals.
await writeFile(join(distDirectory, 'style.css.d.ts'), 'export {}\n')
