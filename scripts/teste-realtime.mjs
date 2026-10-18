// Mede o tempo entre marcar um ponto e o público receber a mudança pelo realtime.
// node scripts/teste-realtime.mjs <senha-admin> <jogo-id>
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.trim().split('=')))
const [senha, jogo] = process.argv.slice(2)
const publico = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const marcador = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data: j } = await publico.from('jogos').select('*').eq('id', jogo).single()
let enviado = 0
const chegou = new Promise((ok) => {
  publico.channel('teste').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jogos', filter: `id=eq.${jogo}` }, (p) => {
    ok({ ms: Date.now() - enviado, sets: p.new.sets })
  }).subscribe(async (st) => {
    if (st !== 'SUBSCRIBED') return
    const set = Math.max(j.sets.length, 1)
    enviado = Date.now()
    const { error } = await marcador.rpc('marcador_lance', { p_senha: senha, p_jogo: jogo, p_set: set, p_lado: 'a', p_tipo: 'avulso', p_atleta: null })
    if (error) console.log('erro', error.message)
  })
})
const r = await Promise.race([chegou, new Promise((ok) => setTimeout(() => ok(null), 10000))])
console.log(r ? `público recebeu em ${r.ms} ms, placar ${JSON.stringify(r.sets)}` : 'NÃO chegou em 10 s')
await marcador.rpc('marcador_desfazer', { p_senha: senha, p_jogo: jogo })
process.exit(0)
