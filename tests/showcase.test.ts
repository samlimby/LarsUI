import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { compileExample } from '../src/showcase/compileExample.ts'

const modules = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  'larsui/style.css': {},
  larsui: {
    Dropdown: ({ label, options, helperText, disabled }: { label: string; options: { label: string; value: string }[]; helperText: string; disabled: boolean }) =>
      React.createElement('label', null, label,
        React.createElement('select', { disabled }, options.map(({ label, value }) => React.createElement('option', { key: value, value }, label))),
        helperText),
  },
}

test('live TSX evaluates hooks, type annotations, arbitrary props, expressions and edited options', () => {
  const Example = compileExample(`
    import { useState } from 'react'
    import { Dropdown, type DropdownOption } from 'larsui'
    import 'larsui/style.css'
    const options: DropdownOption[] = [{ label: 'London', value: 'london' }]
    export function Example() {
      const [label] = useState<string>('Destination')
      return <Dropdown label={label + '!'} options={options} disabled helperText="Pick a city" />
    }
  `, modules)
  const html = renderToStaticMarkup(React.createElement(Example))
  assert.match(html, /Destination!/)
  assert.match(html, /<select disabled="">/)
  assert.match(html, /<option value="london">London<\/option>/)
  assert.match(html, /Pick a city/)
})

test('live TSX supports default exports and local SVG imports', () => {
  const Example = compileExample(`
    import icon from './iconLibrary/IconCheck.svg'
    export default function Preview() { return <img src={icon} alt="Done" /> }
  `, { ...modules, './iconLibrary/IconCheck.svg': '/assets/check.svg' })
  assert.match(renderToStaticMarkup(React.createElement(Example)), /src="\/assets\/check.svg"/)
})

test('invalid syntax, missing preview exports and unsupported imports give usable errors', () => {
  assert.throws(() => compileExample('export function Example() { return <div label="unfinished /> }', modules), /Unterminated|Unexpected/)
  assert.throws(() => compileExample('export const value = 42', modules), /Export your preview component/)
  assert.throws(() => compileExample("import { Widget } from 'unavailable'; export function Example() { return <Widget /> }", modules), /does not include "unavailable"/)
})
