import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

test('published field declarations preserve native refs and reject incompatible field props and selection values', () => {
  const fixture = fileURLToPath(new URL('./fixtures/fields.consumer.tsx', import.meta.url))
  const program = ts.createProgram([fixture], {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    types: ['react', 'react-dom'],
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  const output = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: name => name,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => '\n',
  })
  assert.equal(diagnostics.length, 0, output)
})
