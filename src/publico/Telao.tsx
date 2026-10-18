import { useEffect, useRef, useState } from 'react'
import { Maximize } from 'lucide-react'
import { useCampeonato } from '../lib/dados'
import {
  NOME_FASE, calcularPlacar, classificar, ehFolga, fasesMata, gruposDa, placarDoSetAtual, quadrasDoDia, regrasDoJogo, saldoPontos, saldoSets,
  type Categoria, type Jogo, type Lado,
} from '../lib/motor'
import { Carregando, Vazio, cx } from '../ui/ui'
import { hora, ladosDoJogo, nomeDaFase, type Base } from '../ui/jogo'
import { LogoPatrocinador, linkPublico, useQr } from './extras'
import { Bola } from './Publico'
import { useTema } from '../temas'
import { SeloVetor } from '../ui/Vetor'

// Tela cheia para TV ou projetor na arena (16:9). Tudo em vw para escalar com a tela.
export function Telao({ slug }: { slug: string }) {
  const { tudo } = useCampeonato({ slug })
  const [agora, setAgora] = useState(new Date())
  const [painel, setPainel] = useState(0)
  const qr = useQr(linkPublico(slug), 400)
  const tema = useTema(slug)
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 15000)
    const p = setInterval(() => setPainel((n) => n + 1), 12000)
    return () => {
      clearInterval(t)
      clearInterval(p)
    }
  }, [])
  if (tudo === undefined) return <Carregando />
  if (!tudo) return <Vazio>Campeonato não encontrado.</Vazio>

  const quadras = quadrasDoDia(tudo.jogos)
  const semQuadra = tudo.jogos.filter((j) => j.status === 'ao_vivo' && !j.quadra)
  const paineis = montarPaineis(tudo)
  const atual = paineis.length ? paineis[painel % paineis.length] : null

  return (
    <div className="telao-fundo relative flex h-[100dvh] cursor-none flex-col overflow-hidden bg-tinta text-white" style={{ fontSize: '1vw' }}>
      <header className="flex shrink-0 items-center gap-[1.5em] px-[2.5em] py-[1.4em]">
        {tema?.logo ? <img src={tema.logo} alt="" className="h-[5.5em] w-[5.5em] shrink-0 object-contain" /> : <Bola className="h-[4.5em] w-[4.5em] shrink-0" />}
        <div className="min-w-0 flex-1">
          <h1 className="largo truncate text-[3em] font-extrabold leading-none">{tudo.camp.nome}</h1>
          {tudo.camp.local && <p className="mt-[0.3em] text-[1.4em] text-white/60">{tudo.camp.local}</p>}
        </div>
        <div className="placar text-[4.2em] text-sol">{agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        {qr && (
          <div className="flex items-center gap-[0.8em] rounded-[1em] bg-white p-[0.5em] pr-[1em] text-tinta">
            <img src={qr} alt="" className="h-[5em] w-[5em]" />
            <span className="w-[7em] text-[1.1em] font-bold leading-tight">Acompanhe no celular</span>
          </div>
        )}
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_30em] gap-[1.5em] px-[2.5em] pb-[1.5em]">
        <div className={cx('grid min-h-0 auto-rows-fr gap-[1.2em]', GRADE[Math.min(Math.max(quadras.length, semQuadra.length, 1), 6)])}>
          {quadras.length === 0 && semQuadra.length === 0 && (
            <div className="grid place-items-center rounded-[1.5em] bg-white/5 text-[2em] text-white/50">Nenhum jogo em andamento</div>
          )}
          {quadras.slice(0, 6).map((q) => (
            <CartaoQuadra key={q.quadra} titulo={`Quadra ${q.quadra}`} jogo={q.agora} proximo={q.proximo} base={tudo} grande={quadras.length <= 2} />
          ))}
          {quadras.length === 0 && semQuadra.slice(0, 4).map((j) => (
            <CartaoQuadra key={j.id} titulo={nomeDaFase(j)} jogo={j} base={tudo} grande={semQuadra.length <= 2} />
          ))}
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[1.5em] bg-white text-tinta">
          {atual && (
            <>
              <div className="flex items-baseline justify-between px-[1.6em] pt-[1.4em]">
                <h2 className="largo text-[1.9em] font-extrabold">{atual.titulo}</h2>
                <span className="text-[1.1em] text-cinza">{atual.sub}</span>
              </div>
              <div key={painel} className="telao-entra min-h-0 flex-1 overflow-hidden px-[1.6em] pb-[1em] pt-[0.8em]">{atual.corpo}</div>
              <div className="h-[0.35em] bg-areia">
                <div key={`b${painel}`} className="telao-barra h-full bg-mar" />
              </div>
            </>
          )}
        </aside>
      </main>

      {tudo.patrocinadores.length > 0 && (
        <footer className="flex shrink-0 items-center gap-[2em] bg-white px-[2.5em] py-[1em] text-tinta">
          <span className="text-[1.2em] font-bold text-cinza">Patrocínio</span>
          <div className="flex flex-1 items-center justify-around gap-[2em]">
            {tudo.patrocinadores.map((p) => <LogoPatrocinador key={p.id} p={p} className="h-[3.6em] max-w-[14em] text-[1.4em]" />)}
          </div>
          <SeloVetor className="shrink-0 border-l border-linha pl-[2em] text-[0.95em] text-cinza" />
        </footer>
      )}
      {tudo.patrocinadores.length === 0 && (
        <footer className="flex shrink-0 justify-end px-[2.5em] pb-[1em] text-[0.95em] text-white/45">
          <SeloVetor />
        </footer>
      )}
      <button
        onClick={() => document.documentElement.requestFullscreen?.()}
        className="fixed bottom-[1em] right-[1em] flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm opacity-0 transition hover:opacity-100"
      >
        <Maximize size={16} /> Tela cheia
      </button>
    </div>
  )
}

function CartaoQuadra({ titulo, jogo, proximo, base, grande }: { titulo: string; jogo?: Jogo; proximo?: Jogo; base: Base; grande: boolean }) {
  const lados = jogo && ladosDoJogo(jogo, base)
  const p = jogo && lados && calcularPlacar(regrasDoJogo(lados.cat, jogo.fase), jogo.sets)
  const atual = p ? placarDoSetAtual(p) : [0, 0]
  const prox = proximo && ladosDoJogo(proximo, base)
  const escala = grande ? 1.15 : 0.9
  const antes = useRef<[number, number] | null>(null)
  const [brilho, setBrilho] = useState<{ lado: Lado; n: number } | null>(null)
  useEffect(() => {
    const ant = antes.current
    antes.current = [atual[0], atual[1]]
    if (!ant || !jogo) return
    if (atual[0] > ant[0]) setBrilho({ lado: 'a', n: Date.now() })
    else if (atual[1] > ant[1]) setBrilho({ lado: 'b', n: Date.now() })
  }, [atual[0], atual[1], jogo?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[1.5em] bg-white/[0.06]" style={{ fontSize: `${escala}em` }}>
      {brilho && (
        <div key={brilho.n} className={cx('telao-brilho pointer-events-none absolute inset-0 rounded-[1.5em] ring-[0.25em] ring-inset', brilho.lado === 'a' ? 'ring-mar' : 'ring-sol')} />
      )}
      <div className="flex items-center gap-[1em] px-[1.4em] pt-[1.1em]">
        <h2 className="largo shrink-0 whitespace-nowrap text-[1.6em] font-extrabold">{titulo}</h2>
        {jogo ? (
          <span className="flex shrink-0 items-center gap-[0.5em] whitespace-nowrap text-[1.1em] font-bold text-vivo">
            <span className="pulso h-[0.6em] w-[0.6em] rounded-full bg-vivo" /> {p!.setAtual}º set
          </span>
        ) : <span className="text-[1.1em] text-white/40">Livre</span>}
        {jogo && <span className="ml-auto min-w-0 truncate text-[1em] text-white/50">{lados!.cat.nome}, {nomeDaFase(jogo).charAt(0).toLowerCase() + nomeDaFase(jogo).slice(1)}</span>}
      </div>
      {jogo && lados && p ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-[0.2em] px-[1.4em]">
          {(['a', 'b'] as const).map((l, i) => (
            <div key={l} className="flex items-center gap-[1em]">
              <span className={cx('h-[2.2em] w-[0.45em] shrink-0 rounded-full', l === 'a' ? 'bg-mar' : 'bg-sol')} />
              <span className="min-w-0 flex-1 truncate text-[1.9em] font-bold">{(l === 'a' ? lados.a : lados.b)?.nome}</span>
              <span className="flex gap-[0.6em] text-[1.4em] text-white/45">
                {jogo.sets.slice(0, p.setAtual - 1).map((s, k) => <span key={k} className="placar">{s[i]}</span>)}
              </span>
              <span className="placar grid h-[1.6em] w-[1.6em] place-items-center rounded-[0.3em] bg-white/10 text-[1.8em]">{i === 0 ? p.setsA : p.setsB}</span>
              <span key={atual[i]} className="placar vira w-[1.6em] text-right text-[3.6em] leading-none">{atual[i]}</span>
            </div>
          ))}
        </div>
      ) : prox && proximo ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center px-[1.4em]">
          <div className="text-[1.1em] font-bold text-sol">Próximo jogo{proximo.horario ? `, ${hora(proximo.horario, false)}` : ''}</div>
          <div className="mt-[0.3em] truncate text-[2em] font-bold">{prox.a?.nome ?? prox.rotuloA}</div>
          <div className="text-[1.1em] text-white/40">contra</div>
          <div className="truncate text-[2em] font-bold">{prox.b?.nome ?? prox.rotuloB}</div>
          <div className="mt-[0.4em] truncate text-[1em] text-white/50">{prox.cat.nome}, {nomeDaFase(proximo).charAt(0).toLowerCase() + nomeDaFase(proximo).slice(1)}</div>
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {jogo && prox && proximo && (
        <div className="mt-auto flex shrink-0 items-center gap-[0.8em] border-t border-white/10 px-[1.4em] py-[0.7em] text-[1.15em]">
          <span className="font-bold text-sol">A seguir{proximo.horario ? `, ${hora(proximo.horario, false)}` : ''}</span>
          <span className="truncate text-white/80">{prox.a?.nome ?? prox.rotuloA} x {prox.b?.nome ?? prox.rotuloB}</span>
        </div>
      )}
    </section>
  )
}

// quantas quadras cabem lado a lado
const GRADE: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2', 5: 'grid-cols-3', 6: 'grid-cols-3',
}

// painéis que passam na lateral: grupos de cada categoria e últimos resultados
function montarPaineis(tudo: Base & { categorias: Categoria[] }) {
  const out: { titulo: string; sub: string; corpo: React.ReactNode }[] = []
  for (const cat of tudo.categorias) {
    const times = tudo.times.filter((t) => t.categoria_id === cat.id)
    for (const g of gruposDa(times)) {
      const linhas = classificar(times.filter((t) => t.grupo === g), tudo.jogos.filter((j) => j.categoria_id === cat.id && j.fase === 'grupo' && j.grupo === g), cat)
      const passam = cat.formato === 'grupos' ? 0 : cat.mata.por_grupo
      out.push({
        titulo: `Grupo ${g}`,
        sub: cat.nome,
        corpo: (
          <table className="w-full text-[1.25em]">
            <thead>
              <tr className="text-[0.75em] text-cinza">
                <th className="py-[0.4em] text-left font-medium">Time</th>
                <th className="w-[2.5em] font-medium">V</th>
                <th className="w-[2.8em] font-medium">SS</th>
                <th className="w-[3em] font-medium">SP</th>
                <th className="w-[2.5em] font-bold text-tinta">Pts</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.time.id} className="border-t border-linha">
                  <td className="max-w-0 py-[0.55em]">
                    <div className="flex items-center gap-[0.5em]">
                      <span className={cx('placar grid h-[1.4em] w-[1.4em] shrink-0 place-items-center rounded-[0.3em]', l.posicao <= passam ? 'bg-mar text-white' : 'text-cinza')}>{l.posicao}</span>
                      <span className="truncate font-semibold">{l.time.nome}</span>
                    </div>
                  </td>
                  <td className="text-center text-cinza">{l.vitorias}</td>
                  <td className="text-center text-cinza">{saldoSets(l) > 0 ? `+${saldoSets(l)}` : saldoSets(l)}</td>
                  <td className="text-center text-cinza">{saldoPontos(l) > 0 ? `+${saldoPontos(l)}` : saldoPontos(l)}</td>
                  <td className="placar text-center text-[1.3em]">{l.pontos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      })
    }
  }
  const proximos = tudo.jogos
    .filter((j) => j.status === 'agendado' && !ehFolga(j))
    .sort((x, y) => (x.horario ?? '9').localeCompare(y.horario ?? '9') || x.ordem - y.ordem)
    .slice(0, 7)
  if (proximos.length) {
    out.push({
      titulo: 'Próximos jogos',
      sub: 'programação',
      corpo: (
        <div className="space-y-[0.2em] text-[1.15em]">
          {proximos.map((j) => {
            const { a, b, rotuloA, rotuloB, cat } = ladosDoJogo(j, tudo)
            return (
              <div key={j.id} className="flex items-center gap-[0.8em] border-t border-linha py-[0.55em] first:border-0">
                <span className="placar w-[2.6em] text-[1.3em] text-mar">{hora(j.horario, false)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a?.nome ?? rotuloA} x {b?.nome ?? rotuloB}</span>
                  <span className="block truncate text-[0.8em] text-cinza">{cat.nome}{j.quadra ? `, quadra ${j.quadra}` : ''}</span>
                </span>
              </div>
            )
          })}
        </div>
      ),
    })
  }
  for (const cat of tudo.categorias) {
    const mata = tudo.jogos.filter((j) => j.categoria_id === cat.id && j.fase !== 'grupo' && !ehFolga(j))
    if (!mata.length) continue
    out.push({
      titulo: 'Mata-mata',
      sub: cat.nome,
      corpo: (
        <div className="space-y-[0.9em] text-[1.05em]">
          {fasesMata(mata).map((f) => (
            <div key={f}>
              <div className="mb-[0.3em] text-[0.85em] font-bold text-cinza">{NOME_FASE[f]}</div>
              {mata.filter((j) => j.fase === f).sort((x, y) => x.ordem - y.ordem).map((j) => {
                const { a, b, rotuloA, rotuloB } = ladosDoJogo(j, tudo)
                return (
                  <div key={j.id} className="mb-[0.3em] rounded-[0.6em] bg-areia px-[0.8em] py-[0.4em]">
                    {([[a, rotuloA, j.sets_a, 'a'], [b, rotuloB, j.sets_b, 'b']] as const).map(([t, r, s, l]) => (
                      <div key={l} className={cx('flex items-center gap-[0.5em]', j.status === 'encerrado' && j.vencedor !== l && 'text-cinza')}>
                        <span className={cx('min-w-0 flex-1 truncate', t ? 'font-semibold' : 'italic text-cinza')}>{t?.nome ?? r}</span>
                        {j.status !== 'agendado' && <span className="placar text-[1.2em]">{s}</span>}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ),
    })
  }
  const fim = tudo.jogos.filter((j) => j.status === 'encerrado').sort((x, y) => (y.horario ?? '').localeCompare(x.horario ?? '')).slice(0, 6)
  if (fim.length) {
    out.push({
      titulo: 'Resultados',
      sub: 'últimos jogos',
      corpo: (
        <div className="space-y-[0.7em] text-[1.15em]">
          {fim.map((j) => {
            const { a, b } = ladosDoJogo(j, tudo)
            return (
              <div key={j.id} className="border-t border-linha pt-[0.6em] first:border-0 first:pt-0">
                {([[a, j.sets_a, 'a'], [b, j.sets_b, 'b']] as const).map(([t, s, l]) => (
                  <div key={l} className={cx('flex items-center gap-[0.6em]', j.vencedor !== l && 'text-cinza')}>
                    <span className="min-w-0 flex-1 truncate font-semibold">{t?.nome}</span>
                    <span className="placar text-[1.4em]">{s}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ),
    })
  }
  return out
}
