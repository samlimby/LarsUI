import { execFileSync } from 'node:child_process'
import { unwatchFile, watchFile } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const MODULE_ID = 'virtual:larsui-site-metadata'
const RESOLVED_MODULE_ID = `\0${MODULE_ID}`

function git(root: string, args: string[]) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}

export function readSiteMetadata(root: string, fallbackDate: string) {
  try {
    const [commit, committedAt] = git(root, ['log', '-1', '--format=%H%n%cI']).split('\n')
    return { commit, updatedAt: new Date(committedAt).toISOString() }
  } catch {
    // Source archives may omit .git; use this build's date in that case.
    return { commit: null, updatedAt: fallbackDate }
  }
}

export function siteMetadata(): Plugin {
  let root = process.cwd()
  const fallbackDate = new Date().toISOString()
  const watched = new Set<string>()
  const stopWatching = () => {
    for (const path of watched) unwatchFile(path, refresh)
    watched.clear()
  }
  let refresh = () => {}

  return {
    name: 'larsui-site-metadata',
    configResolved(config) { root = config.root },
    resolveId(id) { if (id === MODULE_ID) return RESOLVED_MODULE_ID },
    load(id) {
      if (id === RESOLVED_MODULE_ID) {
        return `export const siteUpdatedAt = ${JSON.stringify(readSiteMetadata(root, fallbackDate).updatedAt)}`
      }
    },
    configureServer(server) {
      let previous = readSiteMetadata(root, fallbackDate)
      const watchGitFiles = () => {
        try {
          let ref = ''
          try { ref = git(root, ['symbolic-ref', '-q', 'HEAD']) } catch { /* Detached HEAD. */ }
          const paths = new Set(['HEAD', 'packed-refs', ...(ref ? [ref] : [])]
            .map(path => resolve(root, git(root, ['rev-parse', '--git-path', path]))))
          for (const path of watched) {
            if (!paths.has(path)) { unwatchFile(path, refresh); watched.delete(path) }
          }
          for (const path of paths) {
            if (!watched.has(path)) {
              watchFile(path, { interval: 500, persistent: false }, refresh)
              watched.add(path)
            }
          }
        } catch { /* Source archives have no Git files to watch. */ }
      }
      refresh = () => {
        watchGitFiles()
        const next = readSiteMetadata(root, fallbackDate)
        if (next.commit === previous.commit && next.updatedAt === previous.updatedAt) return
        previous = next
        const module = server.moduleGraph.getModuleById(RESOLVED_MODULE_ID)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }
      watchGitFiles()
      server.httpServer?.once('close', stopWatching)
    },
    closeBundle: stopWatching,
  }
}
