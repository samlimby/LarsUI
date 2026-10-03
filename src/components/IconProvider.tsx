import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { AiComposerIcons } from './AiComposerIcon.js'

const IconContext = createContext<AiComposerIcons>({})

export type IconProviderProps = {
  /** Semantic icon overrides inherited by every AI Composer below this provider. */
  icons: AiComposerIcons
  children: ReactNode
}

/** Nested providers override only the supplied slots; individual component props take priority. */
export function IconProvider({ icons, children }: IconProviderProps) {
  const parent = useContext(IconContext)
  const value = useMemo(() => ({ ...parent, ...icons }), [parent, icons])
  return <IconContext.Provider value={value}>{children}</IconContext.Provider>
}

export function useProvidedIcons() {
  return useContext(IconContext)
}
