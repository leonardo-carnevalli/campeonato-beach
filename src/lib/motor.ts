// Regras do beach: placar por set, classificação dos grupos e chave do mata-mata.
// Sem dependências, para rodar nos testes (scripts/teste.ts).

export type Lado = 'a' | 'b'
export type Fase = 'grupo' | 'r32' | 'oitavas' | 'quartas' | 'semi' | 'final' | 'terceiro'
export type Status = 'agendado' | 'ao_vivo' | 'encerrado'

export interface Regras {
  sets: number // melhor de N
  pontos_set: number
  pontos_desempate: number
  diferenca: number
  teto: number | null
  vitoria: number
  derrota: number
  wo: number
}

export interface Mata {
  por_grupo: number
  extras: number
  terceiro: boolean
}

export interface Campeonato {
  id: string
  slug: string
  nome: string
  local: string | null
  data_inicio: string | null
  data_fim: string | null
  descricao: string | null
  publicado: boolean
}

export interface Categoria {
  id: string
  campeonato_id: string
  nome: string
  tipo: 'dupla' | 'quarteto'
  formato: 'grupos_mata' | 'grupos' | 'mata'
  regras: Regras
  regras_mata: Regras | null
  mata: Mata
  ordem: number
}

export interface Time {
  id: string
  categoria_id: string
  nome: string
  grupo: string | null
  semente: number | null
}

export interface Atleta {
  id: string
  time_id: string
  nome: string
  ordem: number
}

export interface Jogo {
  id: string
  categoria_id: string
  fase: Fase
  grupo: string | null
  rodada: number
  ordem: number
  time_a: string | null
  time_b: string | null
  origem_a: string | null
  origem_b: string | null
  quadra: string | null
  horario: string | null
  status: Status
  sets: [number, number][]
  sets_a: number
  sets_b: number
  vencedor: Lado | null
  wo: Lado | null
  placar_manual: boolean
}

export interface Lance {
  id: number
  jogo_id: string
  set_num: number
  lado: Lado
  tipo: 'ponto' | 'erro' | 'avulso'
  atleta_id: string | null
  criado_em: string
}

export const REGRAS_PADRAO: Regras = {
  sets: 3, pontos_set: 21, pontos_desempate: 15, diferenca: 2, teto: null, vitoria: 2, derrota: 1, wo: 0,
}

export const outro = (l: Lado): Lado => (l === 'a' ? 'b' : 'a')

export function regrasDoJogo(cat: Categoria, fase: Fase): Regras {
  return { ...REGRAS_PADRAO, ...(fase !== 'grupo' && cat.regras_mata ? cat.regras_mata : cat.regras) }
}

// ---------- placar ----------

export function alvoDoSet(r: Regras, n: number): number {
  return r.sets > 1 && n === r.sets ? r.pontos_desempate : r.pontos_set
}

export function setFechado(r: Regras, n: number, a: number, b: number): Lado | null {
  const alvo = alvoDoSet(r, n)
  const max = Math.max(a, b)
  if ((max >= alvo && Math.abs(a - b) >= r.diferenca) || (r.teto != null && max >= r.teto && a !== b)) {
    return a > b ? 'a' : 'b'
  }
  return null
}

export interface Placar {
  sets: [number, number][]
  setsA: number
  setsB: number
  vencedor: Lado | null
  setAtual: number // set em que entra o próximo ponto
}

// mesma conta do _recalcular do banco
export function calcularPlacar(r: Regras, sets: [number, number][]): Placar {
  const precisa = Math.floor(r.sets / 2) + 1
  let setsA = 0
  let setsB = 0
  sets.forEach(([a, b], i) => {
    const v = setFechado(r, i + 1, a, b)
    if (v === 'a') setsA++
    if (v === 'b') setsB++
  })
  const vencedor: Lado | null = setsA >= precisa ? 'a' : setsB >= precisa ? 'b' : null
  let setAtual = Math.max(sets.length, 1)
  const ultimo = sets[sets.length - 1]
  if (ultimo && setFechado(r, sets.length, ultimo[0], ultimo[1]) && !vencedor) setAtual = sets.length + 1
  return { sets, setsA, setsB, vencedor, setAtual: Math.min(setAtual, r.sets) }
}

export function setsDosLances(lances: Pick<Lance, 'set_num' | 'lado'>[]): [number, number][] {
  const n = lances.reduce((m, l) => Math.max(m, l.set_num), 0)
  const sets: [number, number][] = Array.from({ length: n }, () => [0, 0])
  for (const l of lances) sets[l.set_num - 1][l.lado === 'a' ? 0 : 1]++
  return sets
}

// troca de lado: a cada 7 pontos somados (5 no set de desempate de 15)
export function horaDeTrocar(r: Regras, n: number, a: number, b: number): boolean {
  const total = a + b
  const passo = alvoDoSet(r, n) <= 15 ? 5 : 7
  return total > 0 && total % passo === 0
}

// ---------- classificação ----------

export interface Linha {
  time: Time
  jogos: number
  vitorias: number
  derrotas: number
  pontos: number
  setsPro: number
  setsContra: number
  pontosPro: number
  pontosContra: number
  posicao: number
}

export const saldoSets = (l: Linha) => l.setsPro - l.setsContra
export const saldoPontos = (l: Linha) => l.pontosPro - l.pontosContra

// critérios: pontos, vitórias, saldo de sets, saldo de pontos, pontos pró, confronto direto
export function classificar(times: Time[], jogos: Jogo[], cat: Categoria): Linha[] {
  const r = { ...REGRAS_PADRAO, ...cat.regras }
  const mapa = new Map<string, Linha>()
  for (const t of times) {
    mapa.set(t.id, {
      time: t, jogos: 0, vitorias: 0, derrotas: 0, pontos: 0,
      setsPro: 0, setsContra: 0, pontosPro: 0, pontosContra: 0, posicao: 0,
    })
  }
  const validos = jogos.filter(
    (j) => j.status === 'encerrado' && j.vencedor && j.time_a && j.time_b && mapa.has(j.time_a) && mapa.has(j.time_b),
  )
  for (const j of validos) {
    const A = mapa.get(j.time_a!)!
    const B = mapa.get(j.time_b!)!
    for (const [eu, ele, lado] of [[A, B, 'a'], [B, A, 'b']] as const) {
      void ele
      eu.jogos++
      const ganhou = j.vencedor === lado
      if (ganhou) {
        eu.vitorias++
        eu.pontos += r.vitoria
      } else {
        eu.derrotas++
        eu.pontos += j.wo ? r.wo : r.derrota
      }
      eu.setsPro += lado === 'a' ? j.sets_a : j.sets_b
      eu.setsContra += lado === 'a' ? j.sets_b : j.sets_a
      for (const [pa, pb] of j.sets) {
        eu.pontosPro += lado === 'a' ? pa : pb
        eu.pontosContra += lado === 'a' ? pb : pa
      }
    }
  }
  const confronto = (x: Linha, y: Linha) => {
    const j = validos.find(
      (j) => (j.time_a === x.time.id && j.time_b === y.time.id) || (j.time_a === y.time.id && j.time_b === x.time.id),
    )
    if (!j) return 0
    const venceu = j.vencedor === 'a' ? j.time_a : j.time_b
    return venceu === x.time.id ? -1 : 1
  }
  const linhas = [...mapa.values()].sort(
    (x, y) =>
      y.pontos - x.pontos ||
      y.vitorias - x.vitorias ||
      saldoSets(y) - saldoSets(x) ||
      saldoPontos(y) - saldoPontos(x) ||
      y.pontosPro - x.pontosPro ||
      confronto(x, y) ||
      (x.time.semente ?? 99) - (y.time.semente ?? 99) ||
      x.time.nome.localeCompare(y.time.nome),
  )
  linhas.forEach((l, i) => (l.posicao = i + 1))
  return linhas
}

export function gruposDa(times: Time[]): string[] {
  return [...new Set(times.map((t) => t.grupo).filter((g): g is string => !!g))].sort()
}

export function grupoTerminou(grupo: string, jogos: Jogo[]): boolean {
  const js = jogos.filter((j) => j.fase === 'grupo' && j.grupo === grupo)
  return js.length > 0 && js.every((j) => j.status === 'encerrado')
}

// ---------- geração ----------

let _uuid: () => string = () => crypto.randomUUID()
export function usarUuid(f: () => string) {
  _uuid = f
}

// todos contra todos (método do círculo)
export function todosContraTodos(ids: string[]): [string, string, number][] {
  const lista: (string | null)[] = [...ids]
  if (lista.length % 2) lista.push(null)
  const n = lista.length
  const jogos: [string, string, number][] = []
  for (let rodada = 0; rodada < n - 1; rodada++) {
    for (let i = 0; i < n / 2; i++) {
      const x = lista[i]
      const y = lista[n - 1 - i]
      if (x && y) jogos.push(rodada % 2 ? [y, x, rodada + 1] : [x, y, rodada + 1])
    }
    lista.splice(1, 0, lista.pop()!)
  }
  return jogos
}

export function jogosDosGrupos(cat: Categoria, times: Time[]): Partial<Jogo>[] {
  const out: Partial<Jogo>[] = []
  for (const g of gruposDa(times)) {
    const ids = times.filter((t) => t.grupo === g).map((t) => t.id)
    for (const [a, b, rodada] of todosContraTodos(ids)) {
      out.push({ id: _uuid(), categoria_id: cat.id, fase: 'grupo', grupo: g, rodada, time_a: a, time_b: b })
    }
  }
  // intercala os grupos: rodada 1 de todos, depois rodada 2...
  out.sort((x, y) => x.rodada! - y.rodada! || x.grupo!.localeCompare(y.grupo!))
  out.forEach((j, i) => (j.ordem = i + 1))
  return out
}

export const NOME_FASE: Record<Fase, string> = {
  grupo: 'Fase de grupos', r32: '16 avos', oitavas: 'Oitavas', quartas: 'Quartas', semi: 'Semifinal', final: 'Final',
  terceiro: '3º lugar',
}

const FASES_MATA: Fase[] = ['r32', 'oitavas', 'quartas', 'semi', 'final']

export function faseDoTamanho(tam: number): Fase {
  return ({ 2: 'final', 4: 'semi', 8: 'quartas', 16: 'oitavas', 32: 'r32' } as Record<number, Fase>)[tam] ?? 'r32'
}

// ordem padrão da chave: 1x8, 4x5, 2x7, 3x6
export function ordemDaChave(tam: number): number[] {
  let o = [1, 2]
  while (o.length < tam) {
    const n = o.length * 2 + 1
    o = o.flatMap((x) => [x, n - x])
  }
  return o
}

// sementes: 1º de cada grupo, 2º de cada grupo... depois os melhores da posição seguinte
export function origensDosGrupos(grupos: string[], m: Mata): string[] {
  const s: string[] = []
  for (let p = 1; p <= m.por_grupo; p++) for (const g of grupos) s.push(`G:${g}:${p}`)
  for (let k = 1; k <= m.extras; k++) s.push(`M:${m.por_grupo + 1}:${k}`)
  return s
}

// Monta a chave a partir das sementes (origens ou ids de time). Vazios viram BYE.
export function montarChave(cat: Categoria, sementes: string[], terceiro: boolean): Partial<Jogo>[] {
  let tam = 2
  while (tam < sementes.length) tam *= 2
  const ordem = ordemDaChave(tam)
  const out: Partial<Jogo>[] = []
  let anterior: Partial<Jogo>[] = []
  let rodada = 1
  for (let t = tam; t >= 2; t /= 2) {
    const fase = faseDoTamanho(t)
    const atual: Partial<Jogo>[] = []
    for (let i = 0; i < t / 2; i++) {
      const j: Partial<Jogo> = { id: _uuid(), categoria_id: cat.id, fase, rodada, ordem: i + 1 }
      if (t === tam) {
        const sa = sementes[ordem[i * 2] - 1]
        const sb = sementes[ordem[i * 2 + 1] - 1]
        j.origem_a = sa ?? 'BYE'
        j.origem_b = sb ?? 'BYE'
      } else {
        j.origem_a = `V:${anterior[i * 2].id}`
        j.origem_b = `V:${anterior[i * 2 + 1].id}`
      }
      atual.push(j)
    }
    out.push(...atual)
    if (t === 4 && terceiro) {
      out.push({
        id: _uuid(), categoria_id: cat.id, fase: 'terceiro', rodada: rodada + 1, ordem: 1,
        origem_a: `P:${atual[0].id}`, origem_b: `P:${atual[1].id}`,
      })
    }
    anterior = atual
    rodada++
  }
  return out
}

// ---------- resolução da chave ----------

export interface Contexto {
  cat: Categoria
  times: Time[]
  jogos: Jogo[]
}

const UUID = /^[0-9a-f-]{36}$/

export function rotuloOrigem(o: string | null, jogos: Jogo[]): string {
  if (!o) return 'A definir'
  if (o === 'BYE') return 'Folga'
  const [k, x, y] = o.split(':')
  if (k === 'G') return `${y}º do grupo ${x}`
  if (k === 'M') return `${y}º melhor ${x}º colocado`
  const j = jogos.find((j) => j.id === x)
  const nome = j ? (j.fase === 'grupo' ? `jogo ${j.ordem}` : `${NOME_FASE[j.fase]} ${j.ordem}`) : 'jogo'
  if (k === 'V') return `Vencedor ${nome}`
  if (k === 'P') return `Perdedor ${nome}`
  return o
}

// devolve o id do time, ou null se ainda não dá para saber
export function resolverOrigem(o: string | null, ctx: Contexto, visitados = new Set<string>()): string | null {
  if (!o || o === 'BYE') return null
  if (UUID.test(o)) return o
  const [k, x, y] = o.split(':')
  if (k === 'G') {
    if (!grupoTerminou(x, ctx.jogos)) return null
    const tab = classificar(ctx.times.filter((t) => t.grupo === x), ctx.jogos.filter((j) => j.grupo === x), ctx.cat)
    return tab[Number(y) - 1]?.time.id ?? null
  }
  if (k === 'M') {
    const grupos = gruposDa(ctx.times)
    if (!grupos.every((g) => grupoTerminou(g, ctx.jogos))) return null
    const pos = Number(x)
    const linhas = grupos
      .map((g) => classificar(ctx.times.filter((t) => t.grupo === g), ctx.jogos.filter((j) => j.grupo === g), ctx.cat))
      .map((tab) => tab[pos - 1])
      .filter(Boolean)
    // grupos de tamanhos diferentes: compara por média
    const media = (l: Linha) => (l.jogos ? 1 / l.jogos : 0)
    linhas.sort(
      (p, q) =>
        q.pontos * media(q) - p.pontos * media(p) ||
        q.vitorias * media(q) - p.vitorias * media(p) ||
        saldoSets(q) * media(q) - saldoSets(p) * media(p) ||
        saldoPontos(q) * media(q) - saldoPontos(p) * media(p),
    )
    return linhas[Number(y) - 1]?.time.id ?? null
  }
  if (k === 'V' || k === 'P') {
    if (visitados.has(x)) return null
    visitados.add(x)
    const j = ctx.jogos.find((j) => j.id === x)
    if (!j) return null
    const [a, b] = timesDoJogo(j, ctx, visitados)
    // folga: quem está sozinho passa
    if (j.origem_a === 'BYE' || j.origem_b === 'BYE') {
      const so = j.origem_a === 'BYE' ? b : a
      return k === 'V' ? so : null
    }
    if (j.status !== 'encerrado' || !j.vencedor) return null
    const venc = j.vencedor === 'a' ? a : b
    const perd = j.vencedor === 'a' ? b : a
    return k === 'V' ? venc : perd
  }
  return null
}

export function timesDoJogo(j: Jogo, ctx: Contexto, visitados = new Set<string>()): [string | null, string | null] {
  if (j.fase === 'grupo') return [j.time_a, j.time_b]
  return [
    j.time_a ?? resolverOrigem(j.origem_a, ctx, new Set(visitados)),
    j.time_b ?? resolverOrigem(j.origem_b, ctx, new Set(visitados)),
  ]
}

export const ehFolga = (j: Jogo) => j.origem_a === 'BYE' || j.origem_b === 'BYE'

export function fasesMata(jogos: Jogo[]): Fase[] {
  const tem = new Set(jogos.map((j) => j.fase))
  return [...FASES_MATA, 'terceiro' as Fase].filter((f) => tem.has(f))
}

// ---------- programação ----------

// distribui horários em sequência pelas quadras
export function distribuirHorarios(
  jogos: Jogo[], inicio: Date, minutos: number, quadras: string[],
): { id: string; horario: string; quadra: string }[] {
  const ordem = [...jogos].sort((x, y) => faseIdx(x.fase) - faseIdx(y.fase) || x.rodada - y.rodada || x.ordem - y.ordem)
  return ordem.map((j, i) => ({
    id: j.id,
    quadra: quadras[i % quadras.length],
    horario: new Date(inicio.getTime() + Math.floor(i / quadras.length) * minutos * 60000).toISOString(),
  }))
}

export function faseIdx(f: Fase): number {
  return ['grupo', 'r32', 'oitavas', 'quartas', 'semi', 'terceiro', 'final'].indexOf(f)
}

// "João / Pedro" ou "Os Brabos: João, Pedro"
export function lerTimes(texto: string): { nome: string; atletas: string[] }[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const dois = l.indexOf(':')
      const corpo = dois >= 0 ? l.slice(dois + 1) : l
      const atletas = corpo.split(/\s*(?:\/|,|;|\s+e\s+|\s+&\s+)\s*/i).map((s) => s.trim()).filter(Boolean)
      const nome = dois >= 0 ? l.slice(0, dois).trim() : atletas.join(' / ')
      return { nome, atletas }
    })
}

// ---------- estatísticas ----------

export interface LinhaAtleta {
  atleta: Atleta
  time: Time | undefined
  pontos: number
  erros: number
}

export function rankingAtletas(atletas: Atleta[], times: Time[], lances: Lance[]): LinhaAtleta[] {
  const m = new Map<string, LinhaAtleta>()
  for (const a of atletas) m.set(a.id, { atleta: a, time: times.find((t) => t.id === a.time_id), pontos: 0, erros: 0 })
  for (const l of lances) {
    const x = l.atleta_id ? m.get(l.atleta_id) : undefined
    if (!x) continue
    if (l.tipo === 'ponto') x.pontos++
    if (l.tipo === 'erro') x.erros++
  }
  return [...m.values()].sort((p, q) => q.pontos - p.pontos || p.erros - q.erros || p.atleta.nome.localeCompare(q.atleta.nome))
}
