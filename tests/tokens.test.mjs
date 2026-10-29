import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'
import postcss from 'postcss'

async function loadStyles(url, files = new Map()) {
  if (files.has(url.href)) return files
  const css = await readFile(url, 'utf8')
  files.set(url.href, css)
  for (const [, path] of css.matchAll(/@import\s+'([^']+)'/g)) {
    await loadStyles(new URL(path, url), files)
  }
  return files
}

function rootTokens(files) {
  const values = new Map()
  for (const css of files.values()) {
    for (const [, block] of css.matchAll(/:root\s*\{([^{}]*)\}/g)) {
      for (const [, name, value] of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
        assert.equal(values.has(name), false, `Duplicate token: ${name}`)
        values.set(name, value.trim())
      }
    }
  }
  return values
}

const files = await loadStyles(new URL('../src/tokens/index.css', import.meta.url))
const siteFiles = await loadStyles(new URL('../src/tokens/site/index.css', import.meta.url))
const defaults = rootTokens(files)
const siteDefaults = rootTokens(new Map([...files, ...siteFiles]))

function resolveToken(name, parents = [], values = defaults) {
  assert.equal(parents.includes(name), false, `Circular token reference: ${[...parents, name].join(' → ')}`)
  assert.ok(values.has(name), `Missing token: ${name}`)
  return values.get(name).replace(/var\((--[\w-]+)(?:,\s*[^)]+)?\)/g, (_, reference) =>
    resolveToken(reference, [...parents, name], values),
  )
}

function assertStyle(slug, { size, leading, weight, tracking = '0em', mono = false }, values = defaults) {
  assert.equal(resolveToken(`--text-${slug}`, [], values), `${size}px`, slug)
  assert.equal(resolveToken(`--leading-${slug}`, [], values), `${leading}px`, slug)
  assert.equal(resolveToken(`--font-weight-${slug}`, [], values), String(weight), slug)
  assert.equal(resolveToken(`--tracking-${slug}`, [], values), tracking, slug)
  assert.match(resolveToken(`--font-${slug}`, [], values), mono ? /Paper Mono/ : /Inter/, slug)
}

test('shared and site token entry points have no duplicate, missing or circular references', () => {
  for (const values of [defaults, siteDefaults]) {
    for (const name of values.keys()) resolveToken(name, [], values)
  }
})

test('core sizes expose a continuous 4px scale and preserve existing spacing/radius aliases', async () => {
  const sizes = [...defaults.keys()].filter(name => name.startsWith('--size-'))
  assert.deepEqual(sizes, Array.from({ length: 25 }, (_, index) => `--size-${index * 4}`))
  for (let size = 0; size <= 96; size += 4) {
    assert.equal(resolveToken(`--size-${size}`), `${size}px`)
  }
  for (let step = 1; step <= 6; step++) {
    assert.equal(defaults.get(`--spacing-${step}`), `var(--size-${step * 4})`)
  }
  for (const [role, size] of [['sm', 4], ['md', 8], ['lg', 12], ['xl', 16], ['2xl', 20]]) {
    assert.equal(defaults.get(`--radius-${role}`), `var(--size-${size})`)
  }
  assert.equal(resolveToken('--radius-xs'), 'calc(4px / 2)')
  assert.equal(resolveToken('--radius-full'), '999px')
  assert.equal(resolveToken('--radius-circle'), '50%')
  const compatibility = rootTokens(await loadStyles(new URL('../src/tokens/core/spacing.css', import.meta.url)))
  for (const name of ['--size-4', '--size-96', '--spacing-1', '--spacing-6', '--radius-sm', '--radius-full']) {
    assert.equal(resolveToken(name, [], compatibility), resolveToken(name))
  }
})

test('component spacing and radii use shared tokens, allowing fixed 1px border compensation', async () => {
  const directory = new URL('../src/components/', import.meta.url)
  for (const filename of await readdir(directory)) {
    if (!filename.endsWith('.css')) continue
    const css = postcss.parse(await readFile(new URL(filename, directory), 'utf8'))
    css.walkDecls(declaration => {
      for (const [, reference] of declaration.value.matchAll(/var\((--(?:size|radius|spacing)-[\w-]+)/g)) {
        assert.ok(defaults.has(reference), `${filename} ${declaration.prop} uses unavailable token ${reference}`)
        resolveToken(reference)
      }
      if (!/^(?:(?:padding|margin)(?:-.+)?|(?:row-|column-)?gap|border-.*radius)$/.test(declaration.prop)) return
      // calc(var(--size-8) - 1px), for example, accounts for an input border.
      const withoutBorderCompensation = declaration.value.replace(/([+-])\s*1px\b/g, '$1 0')
      assert.doesNotMatch(withoutBorderCompensation, /(?:\d*\.)?\d+(?:px|rem|em|%)/,
        `${filename} ${declaration.prop} has a hardcoded spacing or radius value: ${declaration.value}`)
    })
  }
})

test('Paper color roles resolve through core palettes, including Display P3', async () => {
  const paperFile = new URL('../src/tokens/semantic/colors.css', import.meta.url)
  const paperRoles = rootTokens(new Map([[paperFile.href, await readFile(paperFile, 'utf8')]]))
  const roles = [...paperRoles.keys()]
  assert.equal(roles.length, 259)
  for (const name of roles) assert.match(paperRoles.get(name), /^var\(--radix-[\w-]+\)$/)
  assert.equal(resolveToken('--color-fg-high_emphasis'), '#202020')
  assert.equal(resolveToken('--color-bg-selection'), '#EDF2FE')
  assert.equal(resolveToken('--color-border-focus'), '#3E63DD')
  assert.equal(resolveToken('--color-border-selected'), '#8DA4EF')
  assert.equal(resolveToken('--color-fg-warning-icon'), '#AB6400')
  assert.equal(resolveToken('--color-bg-tag-yellow-p3'), 'color(display-p3 0.997 0.982 0.749)')
  assert.equal(resolveToken('--color-border-tag-yellow-p3-hover'), 'color(display-p3 0.811 0.689 0.313)')
})

test('component colors use library semantic roles without raw colors or palette references', async () => {
  const directory = new URL('../src/components/', import.meta.url)
  for (const filename of await readdir(directory)) {
    if (!filename.endsWith('.css')) continue
    const css = postcss.parse(await readFile(new URL(filename, directory), 'utf8'))
    css.walkDecls(declaration => {
      assert.doesNotMatch(declaration.value, /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/i,
        `${filename} ${declaration.prop} has a raw color`)
      assert.doesNotMatch(declaration.value, /var\(--radix-/,
        `${filename} ${declaration.prop} bypasses semantic colors`)
      assert.doesNotMatch(declaration.value, /var\(--(?:lars-(?:text-|container|divider|line|active|copy-hover|accent|low-emphasis)|color-(?:high|mid|low)_emphasis|divider-)/,
        `${filename} ${declaration.prop} uses a legacy color alias`)
      for (const [, name] of declaration.value.matchAll(/var\((--color-[\w-]+)/g)) {
        assert.ok(defaults.has(name), `${filename} uses unavailable semantic color ${name}`)
        resolveToken(name)
      }
    })
  }
})

test('Chip semantic colors preserve the original light and dark palettes', async () => {
  const expected = [
    ['neutral', '#E8E8E8', '#838383', '#303030', '#B7B7B7'],
    ['information', '#D5EFFF', '#0588F0', '#173246', '#73C8FF'],
    ['warning', '#FFDFB5', '#EF5F00', '#3D2B15', '#FFAD42'],
    ['positive', '#D6F1DF', '#2B9A66', '#193B20', '#72DC7E'],
    ['error', '#FFDBDC', '#DC3E42', '#472126', '#FF8D85'],
  ]
  const css = postcss.parse(await readFile(new URL('../src/tokens/semantic/themes.css', import.meta.url), 'utf8'))
  const palettes = [defaults]
  css.walkRules(rule => {
    if (!rule.nodes.some(node => node.prop === '--color-bg-chip-neutral')) return
    const palette = new Map(defaults)
    rule.walkDecls(declaration => palette.set(declaration.prop, declaration.value))
    palettes.push(palette)
  })
  assert.equal(palettes.length, 4, 'Root, system dark, explicit dark and scoped light must cover Chip colors')
  for (const palette of palettes) {
    const dark = palette.get('color-scheme') === 'dark'
    for (const [variant, lightBg, lightFg, darkBg, darkFg] of expected) {
      assert.equal(resolveToken(`--color-bg-chip-${variant}`, [], palette), dark ? darkBg : lightBg, variant)
      assert.equal(resolveToken(`--color-fg-chip-${variant}`, [], palette), dark ? darkFg : lightFg, variant)
    }
  }
})

test('explicit, system and inverse themes resolve complete semantic palettes', async () => {
  const css = postcss.parse(await readFile(new URL('../src/tokens/semantic/themes.css', import.meta.url), 'utf8'))
  const rules = []
  css.walkRules(rule => {
    const declarations = new Map()
    rule.walkDecls(declaration => declarations.set(declaration.prop, declaration.value))
    rules.push({ selector: rule.selector, values: declarations, media: rule.parent.type === 'atrule' })
    const palette = new Map([...defaults, ...declarations])
    for (const name of declarations.keys()) resolveToken(name, [], palette)
  })
  const explicitDark = rules.find(rule => rule.selector === "html[data-theme='dark'],\n.lars-page[data-theme='dark']")
  const systemDark = rules.find(rule => rule.media && rule.selector.startsWith(':root:not('))
  assert.deepEqual(explicitDark.values, systemDark.values)
  const dark = new Map([...defaults, ...explicitDark.values])
  assert.equal(resolveToken('--color-bg-base', [], dark), '#111111')
  assert.equal(resolveToken('--color-fg-high_emphasis', [], dark), '#EEEEEE')
  assert.equal(resolveToken('--color-bg-primary', [], dark), '#EEEEEE')
  assert.equal(resolveToken('--color-fg-on_primary', [], dark), '#111111')
  assert.equal(resolveToken('--color-bg-high_contrast-base', [], dark), '#111111')
  assert.equal(resolveToken('--color-bg-white', [], dark), '#FFFFFF')
  const inverseRules = rules.filter(rule => rule.selector.includes('.lars-button--high-contrast'))
  assert.equal(inverseRules.length, 4)
  assert.deepEqual(inverseRules[0].values, inverseRules[2].values)
  assert.deepEqual(inverseRules[1].values, inverseRules[3].values)
  const inverseDark = new Map([...defaults, ...inverseRules[0].values])
  assert.equal(resolveToken('--color-fg-secondary_default', [], inverseDark), '#FFFFFF')
  assert.equal(resolveToken('--color-fg-secondary_hover', [], inverseDark), '#FFFFFF')
})


test('component semantic palettes retain the original surfaces, labels and interaction colors', async () => {
  const css = postcss.parse(await readFile(new URL('../src/tokens/semantic/component-themes.css', import.meta.url), 'utf8'))
  const themes = []
  css.walkRules(rule => {
    const values = new Map(defaults)
    rule.walkDecls(declaration => values.set(declaration.prop, declaration.value))
    for (const name of values.keys()) resolveToken(name, [], values)
    if (rule.nodes.some(node => node.prop === '--color-bg-surface')) {
      themes.push({ values, dark: !rule.selector.includes("[data-theme='light']") || rule.selector.startsWith(':root:not(') })
    }
  })
  assert.equal(themes.length, 3, 'System dark, explicit dark and scoped light palettes')
  const palettes = [{ values: defaults, dark: false }, ...themes]
  // Original component values, plus the shared Input error feedback colors.
  const expected = [
    ['bg-surface', '#FCFCFC', '#242424'],
    ['bg-surface-subtle', '#F9F9F9', '#181818'],
    ['fg-text-primary', '#202020', '#F2F2F2'],
    ['fg-text-secondary', '#646464', '#A0A0A0'],
    ['border-surface', '#E0E0E0', '#323232'],
    ['border-surface-strong', '#D9D9D9', '#343434'],
    ['bg-action-hover', '#F0F0F0', '#303030'],
    ['border-component-focus', '#8DA4EF', '#3E5CBB'],
    ['bg-button-primary', '#202020', '#F2F2F2'],
    ['fg-button-primary', '#FCFCFC', '#181818'],
    ['bg-button-primary-hover', '#646464', '#D8D8D8'],
    ['bg-button-secondary', '#D9D9D9', '#383838'],
    ['fg-button-secondary', '#646464', '#C8C8C8'],
    ['bg-button-secondary-hover', '#CECECE', '#484848'],
    ['fg-button-secondary-hover', '#202020', '#FFFFFF'],
    ['bg-button-tertiary-hover', '#E0E0E0', '#2B2B2B'],
    ['bg-button-danger', '#F8BFC8', '#5A1C2C'],
    ['fg-button-danger', '#CA244D', '#FED2E1'],
    ['bg-button-danger-hover', '#EFACB8', '#74223A'],
    ['fg-button-danger-hover', '#64172B', '#FED2E1'],
    ['bg-button-primary-inverse', '#F2F2F2', '#202020'],
    ['fg-button-secondary-inverse', '#FFFFFF', '#646464'],
    ['border-button-focus-inverse', '#3A5BC7', '#8DA4EF'],
    ['bg-slider-track', '#E8E8E8', '#343434'],
    ['fg-slider', '#171717', '#F2F2F2'],
    ['bg-slider-tick', '#AEAEAE', '#707070'],
    ['bg-segment-selected', '#FCFCFC', '#222222'],
    ['bg-input', '#FFFFFF', '#111111'],
    ['fg-input-muted', '#646464', '#B4B4B4'],
    ['border-input-selected', '#8DA4EF', '#8DA4EF'],
    ['border-input-error', '#E54666', '#E54666'],
    ['fg-input-error', '#CA244D', '#FF949D'],
    ['bg-input-checkbox', '#FFFFFF', '#222222'],
    ['border-input-checkbox', '#8F8F8F', '#858585'],
    ['fg-composer-accent', '#1687D9', '#73D0FF'],
    ['fg-composer-warning', '#F76B15', '#F76B15'],
    ['fg-composer-error', '#CA244D', '#FED2E1'],
    ['bg-tooltip', '#EEEEEE', '#303030'],
    ['border-tooltip', 'COLOR-MIX(IN SRGB, #000000 6%, TRANSPARENT)', 'COLOR-MIX(IN SRGB, #FFFFFF 2%, TRANSPARENT)'],
    ['fg-tooltip', '#202020', '#F2F2F2'],
    ['bg-tooltip-inverse', '#303030', '#EEEEEE'],
    ['border-tooltip-inverse', 'COLOR-MIX(IN SRGB, #FFFFFF 2%, TRANSPARENT)', 'COLOR-MIX(IN SRGB, #000000 6%, TRANSPARENT)'],
    ['bg-table-search', '#F9F9F9', '#191919'],
    ['bg-table-floating-search', '#222222', '#191919'],
    ['border-table-checkbox', '#8F8F8F', '#858585'],
  ]
  for (const { values, dark } of palettes) {
    for (const [name, light, night] of expected) {
      assert.equal(resolveToken(`--color-${name}`, [], values).toUpperCase(), dark ? night : light, `${dark ? 'dark' : 'light'} ${name}`)
    }
    assert.equal(resolveToken('--color-fg-table-floating', [], values), '#EEEEEE')
    assert.equal(resolveToken('--color-fg-table-floating-search-icon', [], values), '#7C8481')
    assert.equal(resolveToken('--lars-focus-ring', [], values), dark ? '#3E5CBB' : '#8DA4EF')
    assert.equal(resolveToken('--color-bg-slider-fill', [], values).toUpperCase(), dark
      ? 'COLOR-MIX(IN SRGB, #FFFFFF 14%, TRANSPARENT)'
      : 'COLOR-MIX(IN SRGB, #171717 15%, TRANSPARENT)')
    assert.match(resolveToken('--color-bg-input-option-selected', [], values), /72%, transparent\)$/)
    assert.equal(resolveToken('--shadow-input-popup', [], values), resolveToken('--shadow-low_emphasis', [], values))
  }
})

test('the four shadow levels resolve through core black/white with increasing elevation', async () => {
  assert.equal(resolveToken('--color-bg-shadow'), '#000000')
  assert.equal(resolveToken('--color-bg-shadow-deep'), '#000000')
  assert.equal(resolveToken('--color-bg-shadow-soft'), 'color-mix(in srgb, #000000 6%, transparent)')
  assert.equal(resolveToken('--color-bg-shadow-drop'), 'color-mix(in srgb, #000000 18%, transparent)')
  for (const [role, percent, color] of [
    ['highlight-subtle', 1, '#FFFFFF'], ['highlight-soft', 2, '#FFFFFF'], ['highlight', 4, '#FFFFFF'],
    ['ring-subtle', 2, '#FFFFFF'], ['ring-soft', 4, '#FFFFFF'], ['ring', 6, '#FFFFFF'],
    ['', 14, '#000000'], ['strong', 18, '#000000'],
  ]) {
    assert.equal(resolveToken(`--color-border-shadow${role ? `-${role}` : ''}`),
      `color-mix(in srgb, ${color} ${percent}%, transparent)`)
  }

  const names = [...defaults.keys()].filter(name => /^--shadow-.*_emphasis$/.test(name))
  assert.deepEqual(names, ['--shadow-min_emphasis', '--shadow-low_emphasis', '--shadow-mid_emphasis', '--shadow-high_emphasis'])
  const css = postcss.parse(await readFile(new URL('../src/tokens/semantic/shadows.css', import.meta.url), 'utf8'))
  css.walkDecls(declaration => {
    assert.doesNotMatch(declaration.value, /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?)\(|var\(--radix-/i,
      `${declaration.prop} must use semantic color roles`)
  })
  for (const [index, name] of names.entries()) {
    const layers = postcss.list.comma(resolveToken(name))
    assert.equal(layers.length, [1, 2, 4, 6][index], name)
    assert.ok(layers.every(layer => layer.includes('#000000 6%')), name)
    if (index > 0) {
      assert.deepEqual(layers.slice(0, [1, 2, 4][index - 1]), postcss.list.comma(resolveToken(names[index - 1])))
    }
  }
  assert.match(resolveToken('--shadow-low_emphasis'), /1px 1px -0.5px/)
  assert.match(resolveToken('--shadow-mid_emphasis'), /6px 6px -3px/)
  assert.match(resolveToken('--shadow-high_emphasis'), /24px 24px -12px/)
})

test('system, explicit and nested theme scopes select matching shadow recipes and component aliases', async () => {
  const css = postcss.parse(await readFile(new URL('../src/tokens/semantic/shadows.css', import.meta.url), 'utf8'))
  const rules = []
  css.walkRules(rule => {
    const values = new Map()
    rule.walkDecls(declaration => values.set(declaration.prop, declaration.value))
    rules.push({ selector: rule.selector, values, media: rule.parent.type === 'atrule' })
  })
  const system = rules.find(rule => rule.media)
  const dark = rules.find(rule => rule.selector === "[data-theme='dark']")
  const light = rules.find(rule => rule.selector === "[data-theme='light']")
  const normalized = values => new Map([...values].map(([name, value]) => [name, value.replace(/\s+/g, ' ')]))
  assert.deepEqual(normalized(system.values), normalized(dark.values))
  for (const [name, value] of light.values) assert.equal(value, defaults.get(name))
  const aliases = rules.find(rule => rule.selector.includes("[data-theme='light'],")).values
  const contracts = [
    ['--shadow-composer', '--shadow-high_emphasis'],
    ['--shadow-popup', '--shadow-mid_emphasis'],
    ['--shadow-floating-toolbar', '--shadow-mid_emphasis'],
    ['--shadow-input-popup', '--shadow-low_emphasis'],
  ]
  const night = new Map([...defaults, ...dark.values, ...aliases])
  const nestedLight = new Map([...night, ...light.values, ...aliases])
  for (const palette of [defaults, night, nestedLight]) {
    for (const [alias, level] of contracts) {
      assert.equal(resolveToken(alias, [], palette), resolveToken(level, [], palette))
    }
  }
  for (const [index, name] of [...light.values.keys()].entries()) {
    const layers = postcss.list.comma(resolveToken(name, [], night))
    assert.equal(layers.length, [1, 3, 6, 8][index])
    assert.equal(layers.filter(layer => layer.startsWith('inset')).length, index === 0 ? 1 : 2)
    assert.ok(layers[0].includes(`#FFFFFF ${[2, 1, 2, 4][index]}%`))
    if (index > 0) {
      assert.ok(layers[1].includes(`#FFFFFF ${[0, 2, 4, 6][index]}%`))
      assert.ok(layers.at(-1).includes('#000000 18%'))
    }
    if (index > 1) assert.ok(layers[2].includes(`#000000 ${index === 2 ? 14 : 18}%`))
    assert.equal(resolveToken(name, [], nestedLight), resolveToken(name))
  }
})

test('library typography exposes the consolidated Paper body, heading, shortcut and chip styles', () => {
  const weights = { regular: 400, medium: 500, semibold: 600, bold: 700 }
  for (const [sizeName, size, leading] of [['xs', 10, 12], ['sm', 12, 16], ['md', 14, 18], ['lg', 16, 20]]) {
    for (const [weightName, weight] of Object.entries(weights)) {
      if (sizeName === 'md' && weightName === 'bold') continue
      assertStyle(`body-${sizeName}-${weightName}`, { size, leading, weight })
    }
  }
  assertStyle('shortcut-sm-medium', { size: 12, leading: 12, weight: 500 })
  for (const [sizeName, size, leading] of [['sm', 12, 16], ['md', 14, 18], ['lg', 16, 16]]) {
    assertStyle(`code-${sizeName}-semibold-tag`, { size, leading, weight: 600, tracking: '0.05em', mono: true })
  }
  for (const [sizeName, size, leading] of [['sm', 16, 24], ['md', 24, 32], ['lg', 32, 40]]) {
    for (const [weightName, weight] of [['medium', 500], ['semibold', 600]]) {
      const slug = `heading-${sizeName}-${weightName}`
      assertStyle(slug, { size, leading, weight, tracking: sizeName === 'md' ? '-0.02em' : '0em' })
    }
  }
})

test('site-only typography is available to the demo and absent from the library', () => {
  const siteStyles = []
  for (const [slug, size, leading, weight, mono] of [
    ['code-sm-regular', 12, 18, 400, true],
    ['command-sm-450', 12, 16, 450, true],
    ['command-md-450', 13, 20, 450, true],
    ['metadata-xs-450', 9, 16, 450, false],
  ]) {
    siteStyles.push(slug)
    assertStyle(slug, { size, leading, weight, mono }, siteDefaults)
  }
  for (const slug of siteStyles) {
    for (const prefix of ['font', 'text', 'leading', 'font-weight', 'tracking']) {
      assert.equal(defaults.has(`--${prefix}-${slug}`), false, `Site token leaked into library: ${slug}`)
    }
  }
  for (const name of ['--text-9', '--text-13', '--font-weight-450']) {
    assert.equal(defaults.has(name), false, `Site primitive leaked into library: ${name}`)
  }
})

test('components resolve typography using only library tokens', async () => {
  const directory = new URL('../src/components/', import.meta.url)
  for (const filename of await readdir(directory)) {
    if (!filename.endsWith('.css')) continue
    const css = await readFile(new URL(filename, directory), 'utf8')
    for (const [, property, value] of css.matchAll(/\b(font-family|font-size|font-weight|line-height|letter-spacing)\s*:\s*([^;{}]+)[;}]/g)) {
      for (const [, reference] of value.matchAll(/var\((--[\w-]+)/g)) {
        assert.ok(defaults.has(reference), `${filename} ${property} uses unavailable library token ${reference}`)
        resolveToken(reference)
      }
    }
  }
})

test('existing emphasis and typography compatibility names resolve to the consolidated values', () => {
  assert.equal(resolveToken('--divider-mid_emphasis'), resolveToken('--color-border-mid_emphasis'))
  assert.equal(resolveToken('--color-high_emphasis'), resolveToken('--color-fg-high_emphasis'))
  assert.equal(resolveToken('--high_contrast-mid_emphasis'), '#B4B4B4')
  assert.equal(resolveToken('--text-action'), '12px')
  assert.equal(resolveToken('--text-action-lg'), '14px')
  assert.equal(resolveToken('--text-caption'), '10px')
  assert.equal(resolveToken('--text-menu'), '12px')
  assert.equal(resolveToken('--text-numeric-lg'), '14px')
  assert.equal(resolveToken('--font-weight-tag'), '600')
  assert.equal(resolveToken('--leading-body'), '16px')
  assert.equal(resolveToken('--leading-label-lg'), '18px')
  assert.equal(resolveToken('--leading-tag-lg'), '20px')
  assert.equal(resolveToken('--tracking-metadata'), '0em')
  assert.equal(resolveToken('--leading-prompt'), '18px')
  assert.equal(resolveToken('--spacing-6'), '24px')
  assert.equal(resolveToken('--radius-full'), '999px')
})

test('the published stylesheet includes library tokens and fonts without site typography', async () => {
  const built = await readFile(new URL('../dist/style.css', import.meta.url), 'utf8')
  for (const name of defaults.keys()) assert.ok(built.includes(`${name}:`), `Token missing from package: ${name}`)
  assert.doesNotMatch(built, /@import\s/)
  assert.doesNotMatch(built, /--lars-page:/, 'Demo-only theme overrides must stay out of the library')
  assert.doesNotMatch(built, /--(?:font|text|font-weight|leading|tracking)-(?:command-|metadata-xs-450|code-sm-regular)/)
  assert.doesNotMatch(built, /JetBrains|font-weight:650\b|font-variation-settings:[^;}]*650/)
  assert.ok(/font-family:[^;]*Paper Mono/.test(built), 'Paper Mono must be declared in the package stylesheet')
  assert.ok(/data:[^;]*woff2;base64,/.test(built), 'Fonts must be bundled without external requests')
  const licenses = await readFile(new URL('../dist/FONT-LICENSES.txt', import.meta.url), 'utf8')
  for (const face of ['paper-mono', 'inter']) {
    const original = await readFile(new URL(`../src/assets/fonts/${face}/OFL.txt`, import.meta.url), 'utf8')
    assert.ok(licenses.includes(original.trim()), `Published package must retain the full ${face} license`)
  }
})
