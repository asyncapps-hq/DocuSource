'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const Ctx = createContext({ enabled: true, setEnabled: (_: boolean) => {} })

export function MotionProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const off = params.get('motion') === 'off' || reduced || localStorage.getItem('ds_motion') === 'off'
    setEnabledState(!off)
    document.documentElement.dataset.motion = off ? 'off' : 'on'
  }, [])
  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v)
    localStorage.setItem('ds_motion', v ? 'on' : 'off')
    document.documentElement.dataset.motion = v ? 'on' : 'off'
  }, [])
  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMotion() {
  return useContext(Ctx)
}
