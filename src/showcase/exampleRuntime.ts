import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import * as Lucide from 'lucide-react'
import * as LarsUI from '../index'
import { compileExample } from './compileExample'

const modules: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  larsui: LarsUI,
  'larsui/style.css': {},
  'lucide-react': Lucide,
}
const icons = import.meta.glob('../iconLibrary/*.svg', { eager: true, query: '?url', import: 'default' })
for (const [path, url] of Object.entries(icons)) {
  modules[path.replace('../', './')] = url
}

export function createExample(source: string) {
  return compileExample(source, modules)
}
