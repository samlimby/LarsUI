import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { EventEmitter, once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { readSiteMetadata, siteMetadata } from '../scripts/site-metadata.ts'

function repository(t) {
  const root = mkdtempSync(join(tmpdir(), 'larsui-metadata-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = (args, env = {}) => execFileSync('git', [
    '-C', root, '-c', 'user.name=Metadata Test', '-c', 'user.email=metadata@example.test',
    '-c', 'core.hooksPath=/dev/null', ...args,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } }).trim()
  git(['init', '--initial-branch=main'])
  const commit = date => git(['commit', '--allow-empty', '--no-gpg-sign', '-m', 'Metadata fixture'], {
    GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: date,
  })
  return { root, git, commit }
}

test('site metadata uses the latest commit timestamp, including its timezone', t => {
  const { root, commit } = repository(t)
  commit('2026-10-16T14:10:23+01:00')
  const first = readSiteMetadata(root, '2000-01-01T00:00:00.000Z')
  assert.match(first.commit, /^[\da-f]{40}$/)
  assert.equal(first.updatedAt, '2026-10-16T13:10:23.000Z')
  commit('2026-11-02T09:30:00Z')
  const next = readSiteMetadata(root, '2000-01-01T00:00:00.000Z')
  assert.notEqual(next.commit, first.commit)
  assert.equal(next.updatedAt, '2026-11-02T09:30:00.000Z')
})

test('the dev server refreshes metadata after commits and branch switches', async t => {
  const { root, git, commit } = repository(t)
  commit('2026-10-16T14:10:23+01:00')
  const plugin = siteMetadata()
  plugin.configResolved({ root })
  const events = new EventEmitter()
  let invalidated = 0
  plugin.configureServer({
    moduleGraph: { getModuleById: () => ({}), invalidateModule: () => { invalidated++ } },
    ws: { send: message => events.emit('reload', message) },
  })
  t.after(() => plugin.closeBundle())
  const updated = once(events, 'reload', { signal: AbortSignal.timeout(5000) })
  commit('2026-11-02T09:30:00Z')
  assert.deepEqual((await updated)[0], { type: 'full-reload' })
  assert.match(plugin.load('\0virtual:larsui-site-metadata'), /2026-11-02T09:30:00.000Z/)
  git(['branch', 'previous', 'HEAD~1'])
  const switched = once(events, 'reload', { signal: AbortSignal.timeout(5000) })
  git(['checkout', 'previous'])
  await switched
  assert.match(plugin.load('\0virtual:larsui-site-metadata'), /2026-10-16T13:10:23.000Z/)
  assert.equal(invalidated, 2)
})

test('source archives fall back to the build timestamp without Git', t => {
  const root = mkdtempSync(join(tmpdir(), 'larsui-archive-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  assert.deepEqual(readSiteMetadata(root, '2026-10-17T12:00:00.000Z'), {
    commit: null, updatedAt: '2026-10-17T12:00:00.000Z',
  })
})
