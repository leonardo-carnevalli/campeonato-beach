import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Maximize } from 'lucide-react'
import { estatisticas, useCampeonato, useLances, type Tudo } from '../lib/dados'
import {
  NOME_FASE, NOME_FUNDAMENTO, calcularPlacar, classificar, ehFolga, fasesMata, gruposDa, placarDoSetAtual, quadrasDoDia,
  regrasDoJogo, saldoPontos, saldoSets,
  type Categoria, type Jogo, type Lado,
} from '../lib/motor'
import { Carregando, Vazio, cx } from '../ui/ui'
import { hora, ladosDoJogo, nomeDaFase, type Base } from '../ui/jogo'
import { LogoPatrocinador, linkPublico, useQr } from './extras'
import { Bola, periodo } from './Publico'
import { useTema } from '../temas'
import { SeloVetor } from '../ui/Vetor'

// Tela cheia para TV ou projetor (16:9), no jeito dos placares de transmissão.
// Tudo é medido em em, com a fonte base em 1vw, para escalar com qualquer tela.
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

  const quadras = quadrasDoDia(tudo.jogos).slice(0, 6)
  const paineis = montarPaineis(tudo)
  const atual = paineis.length ? paineis[painel % paineis.length] : null
  const n = Math.max(quadras.length, 1)
  const { camp } = tudo

  return (
    <div className="telao-fundo relative flex h-[100dvh] cursor-none flex-col overflow-hidden bg-tinta text-white" style={{ fontSize: '1vw' }}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">{tema?.FundoTelao?.()}</div>

      <header className="flex shrink-0 items-center gap-[1.6em] px-[2.6em] pb-[1.2em] pt-[1.6em]">
        {tema?.logo ? <img src={tema.logo} alt="" className="h-[6em] w-[6em] shrink-0 object-contain drop-shadow-[0_0.4em_1em_rgba(0,0,0,.4)]" /> : <Bola className="h-[4.8em] w-[4.8em] shrink-0" />}
        <div className="min-w-0 flex-1">
          <h1 className={cx('largo truncate text-[3.4em] font-extrabold leading-[0.95]', tema?.titulo?.className)} style={tema?.titulo?.style}>{camp.nome}</h1>
          <p className="mt-[0.35em] text-[1.35em] text-white/60">
            {[camp.local, camp.data_inicio && periodo(camp.data_inicio, camp.data_fim)].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="text-right">
          <div className="placar text-[4.6em] leading-none text-sol">{agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        {qr && (
          <div className="flex items-center gap-[0.9em] rounded-[1.1em] bg-white/[0.08] p-[0.55em] pr-[1.1em] ring-1 ring-white/10">
            <img src={qr} alt="" className="h-[5.2em] w-[5.2em] rounded-[0.5em] bg-white p-[0.25em]" />
            <span className="w-[7.5em] text-[1.1em] font-semibold leading-tight text-white/85">Acompanhe pelo celular</span>
          </div>
        )}
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_31em] gap-[1.6em] px-[2.6em] pb-[1.4em]">
        <div className="flex min-h-0 flex-col gap-[1.3em]">
          <div className={cx('grid shrink-0 gap-[1.3em]', GRADE[n])}>
            {quadras.length === 0 && (
              <div className="grid h-[14em] place-items-center rounded-[1.6em] bg-white/[0.05] text-[2em] text-white/45">A programação ainda não saiu</div>
            )}
            {quadras.map((q) => (
              <Quadra key={q.quadra} nome={q.quadra} jogo={q.agora} proximo={q.proximo} base={tudo} tamanho={n === 1 ? 1.3 : n === 2 ? 1.05 : 0.8} />
            ))}
          </div>
          {n <= 3 && (
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-[1.3em]">
              <Destaques tudo={tudo} />
              <Proximos tudo={tudo} />
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[1.6em] bg-white/[0.06] ring-1 ring-white/10">
          {atual && (
            <>
              <div className="flex items-baseline gap-[0.8em] px-[1.7em] pt-[1.5em]">
                <h2 className={cx('largo text-[2em] font-extrabold', tema?.titulo?.className)} style={tema?.titulo?.style}>{atual.titulo}</h2>
                <span className="ml-auto truncate text-[1.1em] text-white/50">{atual.sub}</span>
              </div>
              <div key={painel} className="telao-entra min-h-0 flex-1 overflow-hidden px-[1.7em] pb-[1em] pt-[1em]">{atual.corpo}</div>
              <div className="mx-[1.7em] mb-[1.4em] flex gap-[0.4em]">
                {paineis.map((_, i) => (
                  <span key={i} className="h-[0.3em] flex-1 overflow-hidden rounded-full bg-white/10">
                    {i === painel % paineis.length && <span key={painel} className="telao-barra block h-full bg-sol" />}
                    {i < painel % paineis.length && <span className="block h-full w-full bg-white/35" />}
                  </span>
                ))}
              </div>
            </>
          )}
        </aside>
      </main>

      <Faixa base={tudo} />

      <button
        onClick={() => document.documentElement.requestFullscreen?.()}
        className="fixed bottom-[1em] right-[1em] z-10 flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm opacity-0 transition hover:opacity-100"
      >
        <Maximize size={16} /> Tela cheia
      </button>
    </div>
  )
}

const GRADE: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2', 5: 'grid-cols-3', 6: 'grid-cols-3',
}

// ---------- uma quadra, como o placar da TV ----------

function Quadra({ nome, jogo, proximo, base, tamanho }: { nome: string; jogo?: Jogo; proximo?: Jogo; base: Base; tamanho: number }) {
  const lados = jogo && ladosDoJogo(jogo, base)
  const p = jogo && lados ? calcularPlacar(regrasDoJogo(lados.cat, jogo.fase), jogo.sets) : null
  const atual = p ? placarDoSetAtual(p) : [0, 0]
  const prox = proximo && ladosDoJogo(proximo, base)
  const { lances } = useLances(jogo?.id)
  const ultimo = lances[lances.length - 1]
  const nomeAtleta = (id: string | null) => base.atletas.find((a) => a.id === id)?.nome

  // brilho rápido no lado que pontuou
  const antes = useRef<number[] | null>(null)
  const [brilho, setBrilho] = useState<{ lado: Lado; n: number } | null>(null)
  useEffect(() => {
    const ant = antes.current
    antes.current = [atual[0], atual[1]]
    if (!ant || !jogo) return
    if (atual[0] > ant[0]) setBrilho({ lado: 'a', n: Date.now() })
    else if (atual[1] > ant[1]) setBrilho({ lado: 'b', n: Date.now() })
  }, [atual[0], atual[1], jogo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const lance = ultimo && jogo && lados && (
    ultimo.tipo === 'ponto'
      ? `${ultimo.fundamento ? NOME_FUNDAMENTO[ultimo.fundamento] : 'Ponto'} de ${nomeAtleta(ultimo.atleta_id) ?? lados[ultimo.lado]?.nome}`
      : ultimo.tipo === 'erro'
        ? `${ultimo.fundamento === 'saque' ? 'Erro de saque' : 'Erro'} de ${nomeAtleta(ultimo.atleta_id) ?? '?'}`
        : `Ponto para ${lados[ultimo.lado]?.nome}`
  )

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.6em] bg-white/[0.06] ring-1 ring-white/10" style={{ fontSize: `${tamanho}em` }}>
      <div className="flex items-center gap-[0.9em] px-[1.5em] pt-[1.1em]">
        <h2 className="largo shrink-0 whitespace-nowrap text-[1.5em] font-extrabold">Quadra {nome}</h2>
        {jogo && p ? (
          <span className="flex shrink-0 items-center gap-[0.45em] whitespace-nowrap rounded-full bg-vivo px-[0.8em] py-[0.25em] text-[0.95em] font-bold">
            <span className="pulso h-[0.5em] w-[0.5em] rounded-full bg-white" /> {p.setAtual}º set
          </span>
        ) : (
          <span className="text-[1em] text-white/40">Livre</span>
        )}
      </div>
      {jogo && lados && <div className="px-[1.5em] pt-[0.2em] text-[1em] text-white/50">{lados.cat.nome}, {minuscula(nomeDaFase(jogo))}</div>}

      {jogo && lados && p ? (
        <div className="flex flex-col px-[1.4em] pb-[1em] pt-[0.8em]">
          <div className="overflow-hidden rounded-[1em] bg-black/25">
            {(['a', 'b'] as const).map((l, i) => {
              const t = lados[l]
              const lidera = atual[i] > atual[1 - i]
              const sets = i === 0 ? p.setsA : p.setsB
              const precisa = Math.floor(regrasDoJogo(lados.cat, jogo.fase).sets / 2) + 1
              return (
                <div key={l} className={cx('relative flex items-stretch', i === 1 && 'border-t border-white/10')}>
                  {brilho?.lado === l && <span key={brilho.n} className="telao-brilho pointer-events-none absolute inset-0 bg-white/10" />}
                  <span className={cx('w-[0.5em] shrink-0', l === 'a' ? 'bg-mar' : 'bg-sol')} />
                  <div className="flex min-h-[4.6em] min-w-0 flex-1 items-center gap-[0.7em] px-[0.9em] py-[0.55em]">
                    <span className="min-w-0 flex-1 text-[1.75em] font-bold leading-[1.1] [overflow-wrap:anywhere]">{t?.nome}</span>
                    {precisa > 1 && (
                      <span className="flex gap-[0.35em]">
                        {Array.from({ length: precisa }, (_, k) => (
                          <span key={k} className={cx('h-[0.8em] w-[0.8em] rounded-full', k < sets ? 'bg-sol' : 'bg-white/15')} />
                        ))}
                      </span>
                    )}
                    <span className="flex gap-[0.7em] text-[1.4em] text-white/40">
                      {jogo.sets.slice(0, p.setAtual - 1).map((s, k) => <span key={k} className="placar">{s[i]}</span>)}
                    </span>
                  </div>
                  <span
                    className={cx(
                      'placar grid w-[1.9em] shrink-0 place-items-center py-[0.15em] text-[3.2em] leading-none transition-colors duration-500',
                      lidera ? 'bg-sol text-tinta' : 'bg-white/[0.07] text-white',
                    )}
                  >
                    <span key={atual[i]} className="vira">{atual[i]}</span>
                  </span>
                </div>
              )
            })}
          </div>
          {lance && (
            <div key={ultimo.id} className="telao-entra mt-[0.7em] truncate text-[1.15em] text-white/65">
              <span className={cx('mr-[0.5em] inline-block h-[0.55em] w-[0.55em] rounded-full', ultimo.lado === 'a' ? 'bg-mar' : 'bg-sol')} />
              {lance}
            </div>
          )}
        </div>
      ) : prox && proximo ? (
        <div className="flex flex-col px-[1.4em] pb-[1.2em] pt-[0.8em]">
          <div className="text-[1.1em] font-bold text-sol">Próximo jogo{proximo.horario ? `, ${hora(proximo.horario, false)}` : ''}</div>
          <div className="mt-[0.2em] text-[1.9em] font-bold leading-tight">{prox.a?.nome ?? prox.rotuloA}</div>
          <div className="text-[1em] text-white/40">contra</div>
          <div className="text-[1.9em] font-bold leading-tight">{prox.b?.nome ?? prox.rotuloB}</div>
          <div className="mt-[0.3em] truncate text-[1em] text-white/45">{prox.cat.nome}, {minuscula(nomeDaFase(proximo))}</div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {jogo && prox && proximo && (
        <div className="mt-auto flex shrink-0 flex-wrap items-baseline gap-x-[0.8em] border-t border-white/10 px-[1.4em] py-[0.7em] text-[1.05em]">
          <span className="shrink-0 font-bold text-sol">A seguir{proximo.horario ? `, ${hora(proximo.horario, false)}` : ''}</span>
          <span className="text-white/75">{prox.a?.nome ?? prox.rotuloA} x {prox.b?.nome ?? prox.rotuloB}</span>
        </div>
      )}
    </section>
  )
}

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

// ---------- faixa de baixo: resultados correndo, patrocinadores e assinatura ----------

function Faixa({ base }: { base: Tudo }) {
  const fim = base.jogos
    .filter((j) => j.status === 'encerrado' && !ehFolga(j))
    .sort((x, y) => (y.horario ?? '').localeCompare(x.horario ?? ''))
    .slice(0, 10)
  const itens = fim.map((j) => {
    const { a, b } = ladosDoJogo(j, base)
    const placar = j.sets.length === 1 ? `${j.sets[0][0]} x ${j.sets[0][1]}` : `${j.sets_a} x ${j.sets_b}`
    return (
      <span key={j.id} className="flex shrink-0 items-center gap-[0.6em]">
        <span className={cx(j.vencedor === 'a' ? 'font-bold text-white' : 'text-white/60')}>{a?.nome}</span>
        <span className="placar rounded-[0.3em] bg-white/10 px-[0.5em] text-[1.2em] text-sol">{placar}</span>
        <span className={cx(j.vencedor === 'b' ? 'font-bold text-white' : 'text-white/60')}>{b?.nome}</span>
      </span>
    )
  })
  return (
    <footer className="flex h-[4.6em] shrink-0 items-center gap-[2em] border-t border-white/10 bg-black/25 px-[2.6em] text-[1.15em]">
      {itens.length > 0 && (
        <>
          <span className="shrink-0 font-bold text-sol">Resultados</span>
          <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
            <div className="telao-corre flex w-max gap-[3em]" style={{ animationDuration: `${Math.max(itens.length, 3) * 7}s` }}>
              {itens}
              {itens.map((it) => <span key={`d${it.key}`} className="flex shrink-0" aria-hidden>{it}</span>)}
            </div>
          </div>
        </>
      )}
      {itens.length === 0 && <div className="flex-1" />}
      {base.patrocinadores.length > 0 && (
        <div className="flex shrink-0 items-center gap-[1.4em] rounded-[0.8em] bg-white px-[1.2em] py-[0.5em]">
          {base.patrocinadores.slice(0, 4).map((p) => (
            <LogoPatrocinador key={p.id} p={p} className="h-[2.4em] max-w-[8em] text-[0.9em] text-tinta" />
          ))}
        </div>
      )}
      <SeloVetor className="shrink-0 text-[0.85em] text-white/45" />
    </footer>
  )
}

// ---------- painéis que passam na lateral ----------

function montarPaineis(tudo: Base & { categorias: Categoria[] }) {
  const out: { titulo: string; sub: string; corpo: ReactNode }[] = []
  for (const cat of tudo.categorias) {
    const times = tudo.times.filter((t) => t.categoria_id === cat.id)
    const grupos = gruposDa(times)
    if (!grupos.length) continue
    const passam = cat.formato === 'grupos' ? 0 : cat.mata.por_grupo
    const fonte = grupos.length > 2 ? 'text-[1em]' : grupos.length === 2 ? 'text-[1.15em]' : 'text-[1.3em]'
    out.push({
      titulo: 'Classificação',
      sub: cat.nome,
      corpo: (
        <div className="space-y-[1.1em]">
          {grupos.map((g) => {
            const linhas = classificar(times.filter((t) => t.grupo === g), tudo.jogos.filter((j) => j.categoria_id === cat.id && j.fase === 'grupo' && j.grupo === g), cat)
            return (
              <table key={g} className={cx('w-full', fonte)}>
                <thead>
                  <tr className="text-[0.75em] text-white/45">
                    <th className="pb-[0.3em] text-left font-bold text-sol">Grupo {g}</th>
                    <th className="w-[2.4em] font-medium">J</th>
                    <th className="w-[2.8em] font-medium">SS</th>
                    <th className="w-[3em] font-medium">SP</th>
                    <th className="w-[2.6em] font-bold text-white">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.time.id} className="border-t border-white/10">
                      <td className="max-w-0 py-[0.45em]">
                        <div className="flex items-center gap-[0.6em]">
                          <span className={cx('placar grid h-[1.45em] w-[1.45em] shrink-0 place-items-center rounded-[0.3em]', l.posicao <= passam ? 'bg-sol text-tinta' : 'text-white/45')}>{l.posicao}</span>
                          <span className="truncate font-semibold">{l.time.nome}</span>
                        </div>
                      </td>
                      <td className="text-center text-white/55">{l.jogos}</td>
                      <td className="text-center text-white/55">{sinal(saldoSets(l))}</td>
                      <td className="text-center text-white/55">{sinal(saldoPontos(l))}</td>
                      <td className="placar text-center text-[1.35em]">{l.pontos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          })}
          {passam > 0 && <p className="text-[0.95em] text-white/40">Os {passam} primeiros de cada grupo vão para o mata-mata.</p>}
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
        <div className="space-y-[1em] text-[1.05em]">
          {fasesMata(mata).map((f) => (
            <div key={f}>
              <div className="mb-[0.35em] text-[0.85em] font-bold text-white/45">{NOME_FASE[f]}</div>
              {mata.filter((j) => j.fase === f).sort((x, y) => x.ordem - y.ordem).map((j) => {
                const { a, b, rotuloA, rotuloB } = ladosDoJogo(j, tudo)
                return (
                  <div key={j.id} className="mb-[0.35em] rounded-[0.6em] bg-white/[0.06] px-[0.9em] py-[0.45em]">
                    {([[a, rotuloA, j.sets_a, 'a'], [b, rotuloB, j.sets_b, 'b']] as const).map(([t, r, s, l]) => (
                      <div key={l} className={cx('flex items-center gap-[0.5em]', j.status === 'encerrado' && j.vencedor !== l && 'text-white/45')}>
                        <span className={cx('min-w-0 flex-1 truncate', t ? 'font-semibold' : 'italic text-white/45')}>{t?.nome ?? r}</span>
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
  return out
}

const sinal = (n: number) => (n > 0 ? `+${n}` : String(n))

// ---------- embaixo das quadras ----------

function Bloco({ titulo, sub, children }: { titulo: string; sub?: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.6em] bg-white/[0.06] px-[1.6em] pb-[1em] pt-[1.3em] ring-1 ring-white/10">
      <div className="mb-[0.7em] flex items-baseline gap-[0.8em]">
        <h2 className="largo text-[1.5em] font-extrabold">{titulo}</h2>
        {sub && <span className="ml-auto text-[1em] text-white/45">{sub}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  )
}

type Estat = { atleta_id: string; pontos: number; erros: number; ataques: number; bloqueios: number; aces: number }

function Destaques({ tudo }: { tudo: Tudo }) {
  const [linhas, setLinhas] = useState<Estat[]>([])
  const total = tudo.jogos.reduce((s, j) => s + j.sets.flat().reduce((x, y) => x + y, 0), 0)
  useEffect(() => {
    const t = setTimeout(() => estatisticas(tudo.atletas.map((a) => a.id)).then(setLinhas), 600)
    return () => clearTimeout(t)
  }, [total, tudo.atletas])
  const top = [...linhas].filter((l) => l.pontos > 0).sort((x, y) => y.pontos - x.pontos || y.aces - x.aces).slice(0, 5)
  const lider = (k: 'aces' | 'bloqueios') => [...linhas].sort((x, y) => y[k] - x[k])[0]
  const atleta = (id: string) => tudo.atletas.find((a) => a.id === id)
  const time = (id: string) => tudo.times.find((t) => t.id === atleta(id)?.time_id)?.nome
  const ace = lider('aces')
  const bloq = lider('bloqueios')
  return (
    <Bloco titulo="Destaques do dia" sub="pontos marcados">
      {!top.length ? (
        <p className="text-[1.15em] text-white/45">Os atletas que mais pontuam aparecem aqui assim que a bola subir.</p>
      ) : (
        <div className="flex h-full gap-[1.2em]">
          <ol className="min-w-0 flex-1 text-[1.1em]">
            {top.map((l, i) => (
              <li key={l.atleta_id} className="flex items-center gap-[0.8em] border-t border-white/10 py-[0.4em] first:border-0 first:pt-0">
                <span className={cx('placar w-[1.1em] text-[1.3em]', i === 0 ? 'text-sol' : 'text-white/40')}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{atleta(l.atleta_id)?.nome}</span>
                  <span className="block truncate text-[0.78em] text-white/45">{time(l.atleta_id)}</span>
                </span>
                <span className="placar text-[1.6em]">{l.pontos}</span>
              </li>
            ))}
          </ol>
          <div className="flex w-[8.5em] shrink-0 flex-col gap-[0.8em]">
            {([['Mais aces', ace, 'aces'], ['Mais bloqueios', bloq, 'bloqueios']] as const).map(([rot, l, k]) => (
              <div key={rot} className="flex flex-1 flex-col justify-center rounded-[1em] bg-black/25 px-[0.9em] py-[0.6em]">
                <div className="text-[0.9em] text-white/50">{rot}</div>
                {l && l[k] > 0 ? (
                  <>
                    <div className="placar text-[2.4em] leading-none text-sol">{l[k]}</div>
                    <div className="truncate text-[1em] font-semibold">{atleta(l.atleta_id)?.nome}</div>
                  </>
                ) : <div className="mt-[0.3em] text-[1em] text-white/35">ainda ninguém</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Bloco>
  )
}

function Proximos({ tudo }: { tudo: Tudo }) {
  const proximos = tudo.jogos
    .filter((j) => j.status === 'agendado' && !ehFolga(j))
    .sort((x, y) => (x.horario ?? '9').localeCompare(y.horario ?? '9') || x.ordem - y.ordem)
    .slice(0, 6)
  return (
    <Bloco titulo="Próximos jogos" sub="programação">
      {!proximos.length ? <p className="text-[1.15em] text-white/45">Todos os jogos já foram para a quadra.</p> : (
        <div className="text-[1.1em]">
          {proximos.map((j) => {
            const { a, b, rotuloA, rotuloB, cat } = ladosDoJogo(j, tudo)
            return (
              <div key={j.id} className="flex items-center gap-[0.9em] border-t border-white/10 py-[0.4em] first:border-0 first:pt-0">
                <span className="placar w-[2.6em] shrink-0 text-[1.35em] text-sol">{hora(j.horario, false)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a?.nome ?? rotuloA} x {b?.nome ?? rotuloB}</span>
                  <span className="block truncate text-[0.8em] text-white/45">{cat.nome}</span>
                </span>
                {j.quadra && <span className="shrink-0 rounded-[0.4em] bg-white/10 px-[0.5em] text-[0.85em] font-bold">Q{j.quadra}</span>}
              </div>
            )
          })}
        </div>
      )}
    </Bloco>
  )
}
