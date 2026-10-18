// Simula a tarde da Arena Vixe: os primeiros jogos encerrados e um jogo ao vivo em cada quadra.
// node --experimental-strip-types scripts/vixe-simular.ts <senha-admin>
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.trim().split('=') as [string, string]))
const SENHA = process.argv[2]
const H = { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
const get = async (q: string) => (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${q}`, { headers: H })).json()
async function rpc(nome: string, args: Record<string, unknown>) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/${nome}`, { method: 'POST', headers: H, body: JSON.stringify(args) })
  if (!r.ok) throw new Error(`${nome}: ${await r.text()}`)
}
const [camp] = await get('campeonatos?slug=eq.arena-vixe&select=id,categorias(id)')
const cats = camp.categorias.map((c: { id: string }) => c.id)
const jogos = (await get(`jogos?categoria_id=in.(${cats})&fase=eq.grupo&select=*&order=horario,quadra`)) as {
  id: string; time_a: string; time_b: string; quadra: string; status: string
}[]
const atletas = (await get(`atletas?select=id,time_id`)) as { id: string; time_id: string }[]
const de = (t: string) => atletas.filter((a) => a.time_id === t)

// rodada das 14h encerrada
const placares = [[[21, 17]], [[19, 21]], [[21, 15]]]
for (const [i, j] of jogos.slice(0, 3).entries()) await rpc('admin_placar', { p_senha: SENHA, p_jogo: j.id, p_sets: placares[i], p_status: 'encerrado' })

// rodada das 14h25 ao vivo, com lances de verdade
const alvo: [number, number][] = [[14, 11], [9, 12], [17, 16]]
const fund = ['ataque', null, 'bloqueio', null, 'ace', 'ataque', null]
for (const [i, j] of jogos.slice(3, 6).entries()) {
  await rpc('marcador_iniciar', { p_senha: SENHA, p_jogo: j.id, p_time_a: j.time_a, p_time_b: j.time_b })
  let [a, b] = [0, 0]
  let k = 0
  while (a < alvo[i][0] || b < alvo[i][1]) {
    const lado = (a < alvo[i][0] && (b >= alvo[i][1] || (k * 7 + i) % 3 !== 0)) ? 'a' : 'b'
    if (lado === 'a') a++
    else b++
    const erro = k % 5 === 4
    const quem = erro ? de(lado === 'a' ? j.time_b : j.time_a) : de(lado === 'a' ? j.time_a : j.time_b)
    await rpc('marcador_lance', {
      p_senha: SENHA, p_jogo: j.id, p_set: 1, p_lado: lado, p_tipo: erro ? 'erro' : 'ponto',
      p_atleta: quem[k % quem.length].id, p_fundamento: erro ? (k % 2 ? 'saque' : null) : fund[k % fund.length],
    })
    k++
  }
}
console.log('simulado')
