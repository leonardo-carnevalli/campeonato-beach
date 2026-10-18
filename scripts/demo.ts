// Cria um campeonato de exemplo com jogos encerrados e um jogo ao vivo.
// node --experimental-strip-types scripts/demo.ts <senha-admin>
import { readFileSync } from 'node:fs'
import { jogosDosGrupos, montarChave, origensDosGrupos, REGRAS_PADRAO, type Categoria, type Time } from '../src/lib/motor.ts'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.split('=') as [string, string]))
const URL = env.VITE_SUPABASE_URL.trim()
const KEY = env.VITE_SUPABASE_ANON_KEY.trim()
const SENHA = process.argv[2]
if (!SENHA) throw new Error('passe a senha do admin')

async function rpc(nome: string, args: Record<string, unknown>) {
  const r = await fetch(`${URL}/rest/v1/rpc/${nome}`, {
    method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`${nome}: ${t}`)
  return t ? JSON.parse(t) : null
}
const salvar = (tabela: string, dados: unknown) => rpc('admin_salvar', { p_senha: SENHA, p_tabela: tabela, p_dados: dados })
const lote = (ops: unknown[]) => rpc('admin_lote', { p_senha: SENHA, p_ops: ops })

const camp = await salvar('campeonatos', {
  nome: 'Copa Verão de Beach Vôlei', slug: 'copa-verao', local: 'Arena Beach Center',
  data_inicio: '2026-10-24', data_fim: '2026-10-25', descricao: 'Exemplo para testar o sistema.',
})
await rpc('admin_senha_marcador', { p_senha: SENHA, p_campeonato: camp.id, p_nova: 'marca123' })

const NOMES_D = ['Rafa / Léo', 'Bruno / Thiago', 'Caio / Igor', 'Duda / Pedro', 'Gabriel / Vini', 'Lucas / Matheus', 'André / Felipe', 'Diego / Renan']
const NOMES_Q = ['Areia Fina: Ana, Bia, Carla, Dani', 'Pé na Areia: Edu, Fê, Gui, Helô', 'Sol e Rede: Ivo, Jú, Kadu, Lia', 'Maré Alta: Malu, Nando, Olívia, Paulo']

async function categoria(nome: string, tipo: 'dupla' | 'quarteto', linhas: string[], grupos: number) {
  const cat: Categoria = await salvar('categorias', {
    campeonato_id: camp.id, nome, tipo, formato: 'grupos_mata', regras: REGRAS_PADRAO, regras_mata: null,
    mata: { por_grupo: 2, extras: 0, terceiro: tipo === 'dupla' }, ordem: tipo === 'dupla' ? 0 : 1,
  })
  const times: Time[] = []
  const ops: unknown[] = []
  linhas.forEach((l, i) => {
    const [n, resto] = l.includes(':') ? l.split(':') : [l, l]
    const id = crypto.randomUUID()
    const t = { id, categoria_id: cat.id, nome: n.trim(), grupo: String.fromCharCode(65 + (i % grupos)), semente: i + 1 }
    times.push(t)
    ops.push({ op: 'salvar', tabela: 'times', dados: t })
    resto.split(/[,/]/).map((s) => s.trim()).forEach((a, k) => ops.push({ op: 'salvar', tabela: 'atletas', dados: { time_id: id, nome: a, ordem: k } }))
  })
  const jogos = jogosDosGrupos(cat, times)
  const chave = montarChave(cat, origensDosGrupos([...new Set(times.map((t) => t.grupo!))].sort(), cat.mata), cat.mata.terceiro)
  const inicio = new Date('2026-10-24T08:00:00-03:00').getTime()
  ;[...jogos, ...chave].forEach((j, i) => {
    j.ordem = j.ordem ?? i + 1
    j.quadra = String((i % 2) + 1)
    j.horario = new Date(inicio + Math.floor(i / 2) * 40 * 60000 + (tipo === 'quarteto' ? 3600000 : 0)).toISOString()
    ops.push({ op: 'salvar', tabela: 'jogos', dados: j })
  })
  await lote(ops)
  return { cat, jogos }
}

const d = await categoria('Masculino', 'dupla', NOMES_D, 2)
await categoria('Quarteto misto', 'quarteto', NOMES_Q, 1)

// resultados dos primeiros jogos
const resultados = [[[21, 17], [21, 19]], [[18, 21], [21, 16], [15, 12]], [[21, 14], [21, 18]], [[19, 21], [17, 21]], [[21, 19], [23, 25], [15, 11]]]
for (let i = 0; i < resultados.length; i++) {
  await rpc('admin_placar', { p_senha: SENHA, p_jogo: d.jogos[i].id, p_sets: resultados[i], p_status: 'encerrado' })
}

// um jogo ao vivo, ponto a ponto
const vivo = d.jogos[resultados.length]
const atletas = async (tid: string) => (await (await fetch(`${URL}/rest/v1/atletas?time_id=eq.${tid}&order=ordem`, { headers: { apikey: KEY } })).json()) as { id: string }[]
const aa = await atletas(vivo.time_a!)
const ab = await atletas(vivo.time_b!)
await rpc('marcador_iniciar', { p_senha: SENHA, p_jogo: vivo.id, p_time_a: vivo.time_a, p_time_b: vivo.time_b })
const seq = 'aabababbaaabbabaaabbaaba'
for (const [i, l] of [...seq].entries()) {
  const erro = i % 4 === 3
  const quem = l === 'a' ? (erro ? ab : aa) : (erro ? aa : ab)
  await rpc('marcador_lance', { p_senha: SENHA, p_jogo: vivo.id, p_set: 1, p_lado: l, p_tipo: erro ? 'erro' : 'ponto', p_atleta: quem[i % 2].id })
}
console.log('pronto:', camp.slug, camp.id)
