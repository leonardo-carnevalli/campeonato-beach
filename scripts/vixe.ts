// Torneio de Vôlei da Arena Vixe (Turma do Fer), 24/10. Times simulados até fechar as inscrições.
// node --experimental-strip-types scripts/vixe.ts <senha-admin> <senha-do-marcador>
import { readFileSync } from 'node:fs'
import { jogosDosGrupos, montarChave, origensDosGrupos, REGRAS_PADRAO, type Categoria, type Time } from '../src/lib/motor.ts'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.trim().split('=') as [string, string]))
const [SENHA, MARCADOR] = process.argv.slice(2)
async function rpc(nome: string, args: Record<string, unknown>) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: 'POST', headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`${nome}: ${t}`)
  return t ? JSON.parse(t) : null
}
const salvar = (tabela: string, dados: unknown) => rpc('admin_salvar', { p_senha: SENHA, p_tabela: tabela, p_dados: dados })

const camp = await salvar('campeonatos', {
  nome: 'Torneio de Vôlei Arena Vixe', slug: 'arena-vixe', local: 'Arena Vixe', data_inicio: '2026-10-24', data_fim: '2026-10-24',
  horario: 'a partir das 14h', inscricao: 'R$ 50 uma categoria, R$ 40 a segunda',
  organizacao: 'Professor Fernando e Turma do Fer, vôlei de praia e quadra',
  descricao: 'Os times abaixo são uma simulação até fechar as inscrições.',
})
if (MARCADOR) await rpc('admin_senha_marcador', { p_senha: SENHA, p_campeonato: camp.id, p_nova: MARCADOR })

const GRUPOS = { ...REGRAS_PADRAO, sets: 1, pontos_set: 21 }
const MATA = { ...REGRAS_PADRAO, sets: 3, pontos_set: 15, pontos_desempate: 15 }
const categorias: [string, string[], number, number][] = [
  ['Quarteto misto iniciante', [
    'Pé na Areia: Ana, Bruno, Carla, Diego', 'Saque Torto: Eduarda, Felipe, Gabi, Henrique', 'Rede Baixa: Isa, João, Karen, Lucas',
    'Bola Fora: Mari, Nico, Olívia, Pedro', 'Areia Quente: Rafa, Sofia, Tiago, Vivi', 'Os Novatos: Wesley, Yasmin, Zé, Bia',
  ], 2, 2],
  ['Quarteto misto intermediário', [
    'Sol Nascente: Amanda, Caio, Duda, Enzo', 'Maré Cheia: Fernanda, Gustavo, Helena, Igor', 'Bloqueio Duplo: Júlia, Kauã, Larissa, Mateus',
    'Ace Certo: Natália, Otávio, Paula, Renan', 'Turma da Orla: Sabrina, Thiago, Úrsula, Vitor', 'Vai na Fé: Bruna, Daniel, Lívia, Marcos',
  ], 2, 2],
  ['Quarteto masculino', [
    'Vixe Maria: André, Bernardo, Cadu, Davi', 'Pancada Seca: Elias, Fábio, Gui, Heitor', 'Os Brabos: Ian, Jonas, Kleber, Léo',
    'Cortada Final: Murilo, Nando, Otto, Paulo',
  ], 1, 4],
]
let ordem = 0
const inicio = new Date('2026-10-24T14:00:00-03:00').getTime()
const todos: Record<string, unknown>[] = []
for (const [i, [nome, linhas, nGrupos, porGrupo]] of categorias.entries()) {
  const cat: Categoria = await salvar('categorias', {
    campeonato_id: camp.id, nome, tipo: 'quarteto', formato: 'grupos_mata', ordem: i,
    regras: GRUPOS, regras_mata: MATA, mata: { por_grupo: porGrupo, extras: 0, terceiro: false },
  })
  const ops: unknown[] = []
  const times: Time[] = linhas.map((l, k) => {
    const [n, resto] = l.split(':')
    const t = { id: crypto.randomUUID(), categoria_id: cat.id, nome: n.trim(), grupo: String.fromCharCode(65 + (k % nGrupos)), semente: k + 1 }
    ops.push({ op: 'salvar', tabela: 'times', dados: t })
    resto.split(',').forEach((a, o) => ops.push({ op: 'salvar', tabela: 'atletas', dados: { time_id: t.id, nome: a.trim(), ordem: o } }))
    return t
  })
  const grupos = [...new Set(times.map((t) => t.grupo!))].sort()
  for (const j of [...jogosDosGrupos(cat, times), ...montarChave(cat, origensDosGrupos(grupos, cat.mata), false)]) {
    j.ordem = ++ordem
    todos.push(j as Record<string, unknown>)
    ops.push({ op: 'salvar', tabela: 'jogos', dados: j })
  }
  await rpc('admin_lote', { p_senha: SENHA, p_ops: ops })
}
// 3 quadras, 25 minutos por jogo; grupos primeiro, mata-mata depois
const fase = (f: unknown) => ['grupo', 'quartas', 'semi', 'final'].indexOf(String(f))
todos.sort((a, b) => fase(a.fase) - fase(b.fase) || Number(a.rodada) - Number(b.rodada) || Number(a.ordem) - Number(b.ordem))
await rpc('admin_lote', {
  p_senha: SENHA,
  p_ops: todos.map((j, i) => ({ op: 'salvar', tabela: 'jogos', dados: { id: j.id, quadra: String((i % 3) + 1), horario: new Date(inicio + Math.floor(i / 3) * 25 * 60000).toISOString() } })),
})
console.log('pronto', camp.slug, camp.id, todos.length, 'jogos')
