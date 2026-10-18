import { createClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import type { Atleta, Campeonato, Categoria, Jogo, Lance, Time } from './motor'

export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

// ---------- senhas (ficam só nesta aba) ----------

const chave = (papel: string, id = '') => `beach:${papel}:${id}`
export const senha = {
  admin: () => sessionStorage.getItem(chave('admin')) ?? '',
  marcador: (camp: string) => sessionStorage.getItem(chave('marcador', camp)) ?? senha.admin(),
  guardar: (papel: 'admin' | 'marcador', valor: string, camp?: string) => sessionStorage.setItem(chave(papel, camp), valor),
  sair: (papel: 'admin' | 'marcador', camp?: string) => sessionStorage.removeItem(chave(papel, camp)),
}

export async function rpc<T = unknown>(nome: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(nome, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const admin = {
  salvar: <T,>(tabela: string, dados: Record<string, unknown>) =>
    rpc<T>('admin_salvar', { p_senha: senha.admin(), p_tabela: tabela, p_dados: dados }),
  apagar: (tabela: string, id: string) =>
    rpc('admin_lote', { p_senha: senha.admin(), p_ops: [{ op: 'apagar', tabela, id }] }),
  lote: (ops: unknown[]) => rpc('admin_lote', { p_senha: senha.admin(), p_ops: ops }),
}

// ---------- carregar um campeonato inteiro ----------

export interface Tudo {
  camp: Campeonato
  categorias: Categoria[]
  times: Time[]
  atletas: Atleta[]
  jogos: Jogo[]
}

async function lista<T>(q: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function carregar(filtro: { slug?: string; id?: string }, viaAdmin = false): Promise<Tudo | null> {
  let camp: Campeonato | undefined
  if (viaAdmin) {
    const todos = await rpc<Campeonato[]>('admin_campeonatos', { p_senha: senha.admin() })
    camp = todos.find((c) => c.id === filtro.id || c.slug === filtro.slug)
  } else {
    const q = sb.from('campeonatos').select('*')
    const r = await lista<Campeonato>(filtro.id ? q.eq('id', filtro.id) : q.eq('slug', filtro.slug!))
    camp = r[0]
  }
  if (!camp) return null
  const categorias = await lista<Categoria>(sb.from('categorias').select('*').eq('campeonato_id', camp.id).order('ordem').order('criado_em'))
  const ids = categorias.map((c) => c.id)
  const [times, jogos] = await Promise.all([
    lista<Time>(sb.from('times').select('*').in('categoria_id', ids).order('criado_em')),
    lista<Jogo>(sb.from('jogos').select('*').in('categoria_id', ids).order('ordem')),
  ])
  const atletas = times.length
    ? await lista<Atleta>(sb.from('atletas').select('*').in('time_id', times.map((t) => t.id)).order('ordem'))
    : []
  return { camp, categorias, times, atletas, jogos }
}

// Mantém o campeonato atualizado: jogos chegam pelo realtime; o resto recarrega ao voltar para a aba.
export function useCampeonato(filtro: { slug?: string; id?: string }, viaAdmin = false) {
  const [tudo, setTudo] = useState<Tudo | null | undefined>(undefined)
  const [erro, setErro] = useState('')
  const recarregar = useCallback(async () => {
    try {
      setTudo(await carregar(filtro, viaAdmin))
      setErro('')
    } catch (e) {
      setErro((e as Error).message)
    }
  }, [filtro.slug, filtro.id, viaAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    recarregar()
    const volta = () => document.visibilityState === 'visible' && recarregar()
    document.addEventListener('visibilitychange', volta)
    const canal = sb
      .channel(`jogos-${filtro.slug ?? filtro.id}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, (p) => {
        setTudo((t) => {
          if (!t) return t
          if (p.eventType === 'DELETE') return { ...t, jogos: t.jogos.filter((j) => j.id !== (p.old as Jogo).id) }
          const novo = p.new as Jogo
          if (!t.categorias.some((c) => c.id === novo.categoria_id)) return t
          const tem = t.jogos.some((j) => j.id === novo.id)
          return { ...t, jogos: tem ? t.jogos.map((j) => (j.id === novo.id ? novo : j)) : [...t.jogos, novo] }
        })
      })
      .subscribe()
    // garantia caso o realtime caia
    const tic = setInterval(() => document.visibilityState === 'visible' && recarregar(), 30000)
    return () => {
      document.removeEventListener('visibilitychange', volta)
      clearInterval(tic)
      sb.removeChannel(canal)
    }
  }, [recarregar]) // eslint-disable-line react-hooks/exhaustive-deps

  return { tudo, erro, recarregar, setTudo }
}

export function useLances(jogoId: string | undefined) {
  const [lances, setLances] = useState<Lance[]>([])
  const recarregar = useCallback(async () => {
    if (!jogoId) return
    setLances(await lista<Lance>(sb.from('lances').select('*').eq('jogo_id', jogoId).order('id')))
  }, [jogoId])
  useEffect(() => {
    if (!jogoId) return
    recarregar()
    const canal = sb
      .channel(`lances-${jogoId}-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lances', filter: `jogo_id=eq.${jogoId}` }, (p) => {
        const novo = p.new as Lance
        setLances((ls) => (ls.some((l) => l.id === novo.id) ? ls : [...ls, novo].sort((x, y) => x.id - y.id)))
      })
      // o realtime não filtra DELETE; toda mudança de lance atualiza o jogo, então recarrega por ele
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jogos', filter: `id=eq.${jogoId}` }, () => {
        recarregar()
      })
      .subscribe()
    return () => {
      sb.removeChannel(canal)
    }
  }, [jogoId, recarregar])
  return { lances, setLances, recarregar }
}

export async function estatisticas(atletaIds: string[]) {
  if (!atletaIds.length) return []
  return lista<{ atleta_id: string; pontos: number; erros: number }>(
    sb.from('estatisticas_atletas').select('*').in('atleta_id', atletaIds),
  )
}
