import { Component, createContext, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'

type CompiledExample = { source: string; Component: ComponentType }
type PreviewError = { source: string; message: string }
type LiveExampleState = {
  code: string
  edited: boolean
  error: string | null
  compiled: CompiledExample | null
  onChange: (code: string) => void
  onReset: () => void
  onError: (source: string, error: Error) => void
}

const LiveExampleContext = createContext<LiveExampleState | null>(null)
export const useLiveExample = () => useContext(LiveExampleContext)

export function LiveExample({ code: generatedCode, children }: { code: string; children: ReactNode }) {
  const [draft, setDraft] = useState<{ original: string; code: string } | null>(null)
  const [compiled, setCompiled] = useState<CompiledExample | null>(null)
  const [error, setError] = useState<PreviewError | null>(null)
  // Changing Properties starts a fresh example; preview interactions do not touch the draft.
  const code = draft?.original === generatedCode ? draft.code : generatedCode
  const edited = code !== generatedCode

  useEffect(() => { setDraft(null) }, [generatedCode])

  useEffect(() => {
    if (!edited) {
      setCompiled(null)
      setError(null)
      return
    }
    let cancelled = false
    const timeout = window.setTimeout(async () => {
      try {
        // Download the compiler only after the first edit, outside the library bundle.
        const { createExample } = await import('./exampleRuntime')
        if (cancelled) return
        const Example = createExample(code)
        setCompiled({ source: code, Component: Example })
        setError(null)
      } catch (cause) {
        if (!cancelled) setError({ source: code, message: cause instanceof Error ? cause.message : String(cause) })
      }
    }, 150)
    return () => { cancelled = true; window.clearTimeout(timeout) }
  }, [code, edited])

  const currentError = error?.source === code ? error.message : null
  return <LiveExampleContext.Provider value={{
    code,
    edited,
    error: currentError,
    compiled: edited ? compiled : null,
    onChange: (next) => setDraft({ original: generatedCode, code: next }),
    onReset: () => { setDraft(null); setCompiled(null); setError(null) },
    onError: (source, cause) => setError({ source, message: cause.message }),
  }}>{children}</LiveExampleContext.Provider>
}

class PreviewBoundary extends Component<{
  children: ReactNode
  fallback: ReactNode
  onError: (error: Error) => void
}, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { this.props.onError(error) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function PreviewCommitted({ onCommit }: { onCommit: () => void }) {
  useEffect(onCommit, [onCommit])
  return null
}

/** Keep the original layout until edited, and retain the last successful example on errors. */
export function LivePreview({ children, className }: { children: ReactNode; className?: string }) {
  const live = useLiveExample()
  const lastGood = useRef<ComponentType | null>(null)
  useEffect(() => { if (!live?.edited) lastGood.current = null }, [live?.edited])
  if (!live?.compiled) return children
  const { Component: Example, source } = live.compiled
  const LastGood = lastGood.current
  return <PreviewBoundary key={source} onError={(error) => live.onError(source, error)}
    fallback={LastGood ? <div className={className}><LastGood /></div> : children}>
    <div className={className} data-live-preview="true">
      <Example />
      <PreviewCommitted onCommit={() => { lastGood.current = Example }} />
    </div>
  </PreviewBoundary>
}
