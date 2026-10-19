import { useEffect, type CSSProperties, type ReactNode } from 'react'
import type { Campeonato, Categoria } from '../lib/motor'
import { vixe } from './vixe'

// Cada cliente ganha a página com a cara dele, feita pela Vetor. O motor é o mesmo; aqui só muda o visual.
export interface Tema {
  cores: Partial<Record<'areia' | 'tinta' | 'mar' | 'mar-escuro' | 'mar-claro' | 'sol' | 'sol-claro' | 'cinza' | 'linha', string>>
  logo?: string
  cartaz?: string
  // fundo e destaque das imagens para o Instagram
  arte?: { fundo: string; destaque: string }
  Topo?: (p: { camp: Campeonato; categorias: Categoria[]; compartilhar: () => void }) => ReactNode
  // letra dos títulos no telão
  titulo?: { className?: string; style?: CSSProperties }
  // enfeite de fundo do telão, atrás de tudo
  FundoTelao?: () => ReactNode
}

export const TEMAS: Record<string, Tema> = {
  'arena-vixe': vixe,
}

export const temaDe = (slug?: string): Tema | undefined => (slug ? TEMAS[slug] : undefined)

// subdomínio próprio: <sub>.vetoragencia.com.br mostra só aquele campeonato
const DOMINIOS: Record<string, string> = {
  arenavixe: 'arena-vixe',
}

export const campeonatoDoDominio = (): string | undefined => DOMINIOS[location.hostname.split('.')[0]]

// aplica as cores do cliente na página inteira (inclusive nas folhas que abrem por cima)
export function useTema(slug?: string) {
  const tema = temaDe(slug)
  useEffect(() => {
    if (!tema) return
    const raiz = document.documentElement
    const nomes = Object.keys(tema.cores) as (keyof Tema['cores'])[]
    for (const n of nomes) raiz.style.setProperty(`--color-${n}`, tema.cores[n]!)
    const meta = document.querySelector('meta[name="theme-color"]')
    const antes = meta?.getAttribute('content')
    if (tema.cores.tinta) meta?.setAttribute('content', tema.cores.tinta)
    return () => {
      for (const n of nomes) raiz.style.removeProperty(`--color-${n}`)
      if (antes) meta?.setAttribute('content', antes)
    }
  }, [tema])
  return tema
}
