import { transform } from 'sucrase'
import type { ComponentType } from 'react'

/** Compile only the local editor's draft; examples are never read from a URL. */
export function compileExample(source: string, modules: Record<string, unknown>): ComponentType {
  const { code } = transform(source, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'automatic',
    production: true,
    filePath: 'Example.tsx',
  })
  const module = { exports: {} as Record<string, unknown> }
  const require = (name: string) => {
    if (Object.hasOwn(modules, name)) return modules[name]
    throw new Error(`The live preview does not include "${name}". Use React, LarsUI, Lucide icons, or the example's local icons.`)
  }
  const evaluate = new Function('require', 'module', 'exports', `${code}\n//# sourceURL=larsui-live-example.js`)
  evaluate(require, module, module.exports)
  const Example = module.exports.Example ?? module.exports.default
  if (typeof Example !== 'function') {
    throw new Error('Export your preview component as Example or as the default export.')
  }
  return Example as ComponentType
}
