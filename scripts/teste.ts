// Testes do motor: npm run teste
import assert from 'node:assert/strict'
import {
  calcularPlacar, classificar, jogosDosGrupos, lerTimes, montarChave, origensDosGrupos, ordemDaChave,
  resolverOrigem, setsDosLances, timesDoJogo, REGRAS_PADRAO,
  type Categoria, type Jogo, type Time,
} from '../src/lib/motor.ts'

let n = 0
const ok = (nome: string, f: () => void) => { f(); n++; console.log('ok', nome) }

const cat: Categoria = {
  id: 'c', campeonato_id: 'x', nome: 'Masc', tipo: 'dupla', formato: 'grupos_mata',
  regras: REGRAS_PADRAO, regras_mata: null, mata: { por_grupo: 2, extras: 0, terceiro: true }, ordem: 0,
}

ok('set de 21 precisa de 2 de diferença', () => {
  let p = calcularPlacar(REGRAS_PADRAO, [[21, 20]])
  assert.equal(p.setsA, 0); assert.equal(p.setAtual, 1)
  p = calcularPlacar(REGRAS_PADRAO, [[23, 21]])
  assert.equal(p.setsA, 1); assert.equal(p.setAtual, 2)
})
ok('tie-break de 15 e vencedor', () => {
  const p = calcularPlacar(REGRAS_PADRAO, [[21, 18], [19, 21], [15, 13]])
  assert.equal(p.vencedor, 'a'); assert.equal(p.setsA, 2); assert.equal(p.setsB, 1)
  assert.equal(calcularPlacar(REGRAS_PADRAO, [[21, 18], [19, 21], [14, 13]]).vencedor, null)
})
ok('set único com teto', () => {
  const r = { ...REGRAS_PADRAO, sets: 1, pontos_set: 18, teto: 21 }
  assert.equal(calcularPlacar(r, [[21, 20]]).vencedor, 'a')
  assert.equal(calcularPlacar(r, [[18, 17]]).vencedor, null)
})
ok('lances viram sets', () => {
  assert.deepEqual(setsDosLances([{ set_num: 1, lado: 'a' }, { set_num: 1, lado: 'b' }, { set_num: 2, lado: 'b' }]), [[1, 1], [0, 1]])
})
ok('ler times', () => {
  assert.deepEqual(lerTimes('João / Pedro\nOs Brabos: Ana, Bia, Cris e Duda'), [
    { nome: 'João / Pedro', atletas: ['João', 'Pedro'] },
    { nome: 'Os Brabos', atletas: ['Ana', 'Bia', 'Cris', 'Duda'] },
  ])
})
ok('ordem da chave', () => {
  assert.deepEqual(ordemDaChave(8), [1, 8, 4, 5, 2, 7, 3, 6])
})

let seq = 0
const uid = () => `00000000-0000-0000-0000-${String(++seq).padStart(12, '0')}`
const times: Time[] = ['A', 'A', 'A', 'B', 'B', 'B'].map((g, i) => ({ id: uid(), categoria_id: 'c', nome: `T${i + 1}`, grupo: g, semente: null }))
const base = (j: Partial<Jogo>): Jogo => ({
  id: uid(), categoria_id: 'c', fase: 'grupo', grupo: null, rodada: 1, ordem: 0, time_a: null, time_b: null,
  origem_a: null, origem_b: null, quadra: null, horario: null, status: 'agendado', sets: [], sets_a: 0, sets_b: 0,
  vencedor: null, wo: null, placar_manual: false, ...j,
})
const jogos: Jogo[] = jogosDosGrupos(cat, times).map(base)

ok('todos contra todos nos grupos', () => {
  assert.equal(jogos.length, 6)
  const pares = new Set(jogos.map((j) => [j.time_a, j.time_b].sort().join()))
  assert.equal(pares.size, 6)
})

const encerra = (j: Jogo, sets: [number, number][]) => {
  const p = calcularPlacar(REGRAS_PADRAO, sets)
  Object.assign(j, { status: 'encerrado', sets, sets_a: p.setsA, sets_b: p.setsB, vencedor: p.vencedor })
}
const jogo = (x: Time, y: Time) => jogos.find((j) => (j.time_a === x.id && j.time_b === y.id) || (j.time_a === y.id && j.time_b === x.id))!
const ganha = (x: Time, y: Time, sets: [number, number][]) => {
  const j = jogo(x, y)
  encerra(j, j.time_a === x.id ? sets : sets.map(([a, b]) => [b, a] as [number, number]))
}
// grupo A: T1 ganha tudo; T2 e T3 empatam em pontos, T2 com saldo de sets melhor
ganha(times[0], times[1], [[21, 15], [21, 15]])
ganha(times[0], times[2], [[21, 10], [21, 10]])
ganha(times[1], times[2], [[21, 19], [21, 19]])
// grupo B
ganha(times[3], times[4], [[21, 19], [19, 21], [15, 10]])
ganha(times[4], times[5], [[21, 19], [21, 19]])
ganha(times[5], times[3], [[21, 19], [21, 19]])

ok('classificação por pontos e saldo', () => {
  const a = classificar(times.slice(0, 3), jogos.filter((j) => j.grupo === 'A'), cat)
  assert.deepEqual(a.map((l) => l.time.nome), ['T1', 'T2', 'T3'])
  assert.equal(a[0].pontos, 4); assert.equal(a[2].pontos, 2)
  // grupo B: todos com 1 vitória (3 pontos). T5 tem saldo de sets +1, T6 +1, T4 -1: decide saldo de pontos
  const b = classificar(times.slice(3), jogos.filter((j) => j.grupo === 'B'), cat)
  assert.equal(b[2].time.nome, 'T4')
})

ok('chave cruzada com 3º lugar', () => {
  const chave = montarChave(cat, origensDosGrupos(['A', 'B'], cat.mata), true).map(base)
  assert.deepEqual(chave.map((j) => j.fase), ['semi', 'semi', 'terceiro', 'final'])
  assert.equal(chave[0].origem_a, 'G:A:1'); assert.equal(chave[0].origem_b, 'G:B:2')
  const ctx = { cat, times, jogos: [...jogos, ...chave] }
  const [a, b] = timesDoJogo(chave[0], ctx)
  assert.equal(a, times[0].id)
  assert.ok(b)
  encerra(chave[0], [[21, 10], [21, 10]])
  encerra(chave[1], [[10, 21], [10, 21]])
  const [fa] = timesDoJogo(chave[3], ctx)
  assert.equal(fa, times[0].id)
  const [ta] = timesDoJogo(chave[2], ctx)
  assert.equal(ta, b)
})

ok('folga na chave', () => {
  const ids = times.slice(0, 3).map((t) => t.id)
  const chave = montarChave(cat, ids, false).map(base)
  assert.equal(chave.length, 3)
  const ctx = { cat, times, jogos: chave }
  // semente 1 joga contra folga e já está na final
  assert.equal(chave[0].origem_b, 'BYE')
  assert.equal(resolverOrigem(`V:${chave[0].id}`, ctx), ids[0])
})

console.log(`\n${n} testes passaram`)

import { atletaDaPartida } from '../src/lib/motor.ts'
ok('atleta da partida', () => {
  const at = [{ id: 'x', time_id: 'ta', nome: 'Ana', ordem: 0 }, { id: 'y', time_id: 'tb', nome: 'Bia', ordem: 0 }]
  const j = base({ time_a: 'ta', time_b: 'tb', vencedor: 'b', status: 'encerrado' })
  const l = (atleta_id: string, tipo: 'ponto' | 'erro', fundamento: 'ace' | null = null) =>
    ({ id: 1, jogo_id: j.id, set_num: 1, lado: 'a' as const, tipo, atleta_id, fundamento, criado_em: '' })
  // empate em pontos: Ana errou mais, então é a Bia
  const d = atletaDaPartida(j, [l('x', 'ponto'), l('x', 'ponto', 'ace'), l('x', 'erro'), l('y', 'ponto'), l('y', 'ponto')], at)
  assert.equal(d?.atleta.nome, 'Bia')
  assert.equal(atletaDaPartida(j, [], at), null)
})
