import { useLances, useCampeonato, useNoite } from '../lib/dados'
import { NOME_FUNDAMENTO, atletaDaPartida, calcularPlacar, placarDoSetAtual, resumoDestaque, regrasDoJogo, type Lado } from '../lib/motor'
import { BotaoArte, BotaoSeguir } from './extras'
import { useTema } from '../temas'
import { CreditoVetor } from '../ui/Vetor'
import { AoVivo, BotaoNoite, Carregando, Topo, Vazio, cx } from '../ui/ui'
import { hora, ladosDoJogo, nomeDaFase } from '../ui/jogo'

export function JogoPublico({ slug, id }: { slug: string; id: string }) {
  const { tudo } = useCampeonato({ slug })
  const { lances } = useLances(id)
  useTema(slug)
  const { noite, alternar } = useNoite()
  if (tudo === undefined) return <Carregando />
  const jogo = tudo?.jogos.find((j) => j.id === id)
  if (!tudo || !jogo) return <div className="p-6"><Vazio>Jogo não encontrado.</Vazio></div>

  const { cat, a, b, rotuloA, rotuloB } = ladosDoJogo(jogo, tudo)
  const p = calcularPlacar(regrasDoJogo(cat, jogo.fase), jogo.sets)
  const atual = placarDoSetAtual(p)
  const nomeAtleta = (aid: string | null) => tudo.atletas.find((x) => x.id === aid)?.nome
  const atletasDe = (tid?: string) => tudo.atletas.filter((x) => x.time_id === tid)
  const destaque = jogo.status === 'encerrado' && !jogo.wo ? atletaDaPartida({ ...jogo, time_a: a?.id ?? null, time_b: b?.id ?? null }, lances, tudo.atletas) : null

  const lado = (l: Lado) => {
    const t = l === 'a' ? a : b
    const venceu = jogo.status === 'encerrado' && jogo.vencedor === l
    return (
      <div className="min-w-0 flex-1 text-center">
        <div className={cx('estreito line-clamp-2 min-h-[2.5em] text-lg font-bold leading-tight', !t && 'italic text-white/60')}>
          {t?.nome ?? (l === 'a' ? rotuloA : rotuloB)}
        </div>
        <div className={cx('placar mt-2 text-7xl', venceu && 'text-sol')}>{l === 'a' ? p.setsA : p.setsB}</div>
        <div className="mt-1 text-xs text-white/60">sets</div>
      </div>
    )
  }

  const estat = (tid?: string) =>
    atletasDe(tid).map((x) => ({
      x,
      pontos: lances.filter((l) => l.atleta_id === x.id && l.tipo === 'ponto').length,
      erros: lances.filter((l) => l.atleta_id === x.id && l.tipo === 'erro').length,
    }))

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <Topo titulo={`${cat.nome} · ${nomeDaFase(jogo)}`} sub={[jogo.quadra && `Quadra ${jogo.quadra}`, hora(jogo.horario)].filter(Boolean).join(' · ')} voltar={`/c/${slug}`} direita={<BotaoNoite noite={noite} alternar={alternar} />} />
      <div className="bg-mar px-4 pb-6 pt-5 text-white">
        <div className="mb-4 flex justify-center">
          {jogo.status === 'ao_vivo' ? <AoVivo /> : (
            <span className="text-sm font-semibold text-white/70">
              {jogo.status === 'encerrado' ? `Encerrado${jogo.wo ? ' · W.O.' : ''}` : 'Ainda não começou'}
            </span>
          )}
        </div>
        <div className="flex items-start gap-2">
          {lado('a')}
          <div className="placar pt-16 text-3xl text-white/40">×</div>
          {lado('b')}
        </div>
        {jogo.status === 'ao_vivo' && (
          <div className="mx-auto mt-5 flex w-fit items-center gap-4 rounded-2xl bg-white/10 px-5 py-3">
            <span className="text-sm text-white/60">{p.setAtual}º set</span>
            <span key={`a${atual[0]}`} className="placar vira text-4xl">{atual[0]}</span>
            <span className="text-white/40">–</span>
            <span key={`b${atual[1]}`} className="placar vira text-4xl">{atual[1]}</span>
          </div>
        )}
        {jogo.sets.length > 0 && (
          <div className="mt-4 flex justify-center gap-2">
            {jogo.sets.map((s, i) => (
              <span key={i} className="rounded-lg bg-white/10 px-2.5 py-1 text-sm">
                <span className="placar text-base">{s[0]}-{s[1]}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5 px-3 pt-5">
        {destaque && (
          <section className="sobe flex items-center gap-4 overflow-hidden rounded-2xl bg-cartao p-4">
            <div className="placar grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sol text-3xl text-tinta">{destaque.pontos}</div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-mar">Atleta da partida</div>
              <div className="largo truncate text-xl font-extrabold leading-tight">{destaque.atleta.nome}</div>
              <div className="truncate text-sm text-cinza">
                {tudo.times.find((t) => t.id === destaque.atleta.time_id)?.nome}, {resumoDestaque(destaque)}
              </div>
            </div>
          </section>
        )}
        {jogo.status === 'encerrado' && a && b && (
          <BotaoArte camp={tudo.camp} base={tudo} arte={{ tipo: 'resultado', jogo, destaque }} rotulo="Imagem do resultado para o Instagram" />
        )}
        {(a || b) && (
          <section className="grid grid-cols-2 gap-2">
            {[a, b].map((t, i) => (
              <div key={i} className="rounded-2xl bg-cartao p-3">
                <div className="mb-1 flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{t?.nome}</span>
                  <BotaoSeguir time={t} pequeno />
                </div>
                {estat(t?.id).map(({ x, pontos, erros }) => (
                  <div key={x.id} className="flex items-baseline gap-2 py-1 text-sm">
                    <span className="min-w-0 flex-1 truncate">{x.nome}</span>
                    <span className="placar text-lg">{pontos}</span>
                    <span className="w-8 text-right text-xs text-cinza">{erros} err</span>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {lances.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-[15px] font-bold text-tinta">Lance a lance</h2>
            <div className="overflow-hidden rounded-2xl bg-cartao">
              {[...lances].reverse().slice(0, 60).map((l, i, arr) => {
                const parcial = lances.filter((x) => x.set_num === l.set_num && x.id <= l.id)
                const pa = parcial.filter((x) => x.lado === 'a').length
                const pb = parcial.length - pa
                const quem = l.lado === 'a' ? a?.nome : b?.nome
                const novoSet = i === 0 || arr[i - 1].set_num !== l.set_num
                return (
                  <div key={l.id}>
                    {novoSet && <div className="bg-areia px-4 py-1.5 text-xs font-bold text-cinza">{l.set_num}º set</div>}
                    <div className="flex items-center gap-3 border-t border-linha px-4 py-2 text-sm first:border-0">
                      <span className={cx('h-2 w-2 shrink-0 rounded-full', l.lado === 'a' ? 'bg-mar' : 'bg-sol')} />
                      <span className="min-w-0 flex-1 truncate">
                        {l.tipo === 'ponto' && <>{l.fundamento ? NOME_FUNDAMENTO[l.fundamento] : 'Ponto'} de <b>{nomeAtleta(l.atleta_id) ?? quem}</b></>}
                        {l.tipo === 'erro' && <>{l.fundamento === 'saque' ? 'Erro de saque' : 'Erro'} de <b>{nomeAtleta(l.atleta_id) ?? 'adversário'}</b> · ponto {quem}</>}
                        {l.tipo === 'avulso' && <>Ponto <b>{quem}</b></>}
                      </span>
                      <span className="placar text-base text-cinza">{pa}-{pb}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
      <CreditoVetor links={false} />
    </div>
  )
}
