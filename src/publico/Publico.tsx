import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'wouter'
import { Share2, Tv } from 'lucide-react'
import { estatisticas, sb, useCampeonato, useSeguidos } from '../lib/dados'
import {
  classificar, fasesMata, gruposDa, saldoPontos, saldoSets, NOME_FASE,
  type Campeonato, type Categoria, type Jogo,
} from '../lib/motor'
import { Abas, Carregando, Vazio, cx } from '../ui/ui'
import { CartaoJogo, ladosDoJogo, type Base } from '../ui/jogo'
import { BotaoArte, BotaoSeguir, Compartilhar, Instalar, Patrocinadores, Quadras, instalado, ultimoCampeonato } from './extras'
import { CreditoVetor } from '../ui/Vetor'
import { useTema } from '../temas'

export function Inicio() {
  const [lista, setLista] = useState<Campeonato[] | null>(null)
  const [, navegar] = useLocation()
  useEffect(() => {
    const ultimo = ultimoCampeonato()
    if (instalado() && ultimo) navegar(`/c/${ultimo}`, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    sb.from('campeonatos').select('*').order('data_inicio', { ascending: false }).then(({ data }) => setLista(data ?? []))
  }, [])
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <div className="pb-6 pt-10">
        <Bola className="mb-5 h-14 w-14" />
        <h1 className="largo text-4xl font-extrabold leading-none">Campeonatos de beach vôlei</h1>
        <p className="mt-2 text-cinza">Resultados, tabela e chave atualizados ponto a ponto.</p>
      </div>
      {!lista ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio>Nenhum campeonato publicado ainda.</Vazio>
      ) : (
        <div className="space-y-3">
          {lista.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="block rounded-2xl bg-cartao p-4 transition active:scale-[0.99]">
              <div className="text-lg font-bold">{c.nome}</div>
              <div className="text-sm text-cinza">
                {c.local}{c.local && c.data_inicio && ', '}{c.data_inicio && periodo(c.data_inicio, c.data_fim)}
              </div>
            </Link>
          ))}
        </div>
      )}
      <CreditoVetor />
    </div>
  )
}

type Aba = 'jogos' | 'tabela' | 'chave' | 'atletas' | 'torneio'

export function Publico({ slug }: { slug: string }) {
  const { tudo, erro } = useCampeonato({ slug })
  const [busca, setBusca] = useSearchParams()
  const [compartilhando, setCompartilhando] = useState(false)
  const tema = useTema(slug)
  const aba = (busca.get('aba') as Aba) || 'jogos'
  const catId = busca.get('cat') || ''
  const mudar = (k: string, v: string) =>
    setBusca((b) => {
      const n = new URLSearchParams(b)
      if (v) n.set(k, v)
      else n.delete(k)
      return n
    }, { replace: true })

  if (tudo === undefined) return <Carregando />
  if (!tudo) return <div className="p-6"><Vazio>{erro || 'Campeonato não encontrado.'}</Vazio></div>

  const { camp, categorias } = tudo
  const cat = categorias.find((c) => c.id === catId)
  const base: Base = tudo
  const temChave = tudo.jogos.some((j) => j.fase !== 'grupo')
  const temGrupo = tudo.jogos.some((j) => j.fase === 'grupo')
  const abas: [Aba, string][] = [['jogos', 'Jogos']]
  if (temGrupo) abas.push(['tabela', 'Classificação'])
  if (temChave) abas.push(['chave', 'Chave'])
  abas.push(['atletas', 'Atletas'])
  if (tema?.cartaz) abas.push(['torneio', 'Torneio'])

  const compartilhar = () => setCompartilhando(true)

  return (
    <div className="mx-auto max-w-3xl pb-16">
      {tema?.Topo ? tema.Topo({ camp, categorias, compartilhar }) : <header className="relative overflow-hidden bg-mar px-4 pb-6 pt-8 text-white">
        <Bola className="pointer-events-none absolute -right-20 -top-10 h-64 w-64 opacity-95" />
        <div className="relative max-w-[78%]">
          <h1 className="largo text-[2rem] font-extrabold leading-[1.02]">{camp.nome}</h1>
          {camp.local && <p className="mt-3 font-semibold">{camp.local}</p>}
          {camp.data_inicio && <p className="text-sm text-white/75">{periodo(camp.data_inicio, camp.data_fim)}</p>}
          {camp.descricao && <p className="mt-3 text-sm text-white/85">{camp.descricao}</p>}
        </div>
        <button onClick={compartilhar} className="relative mt-5 flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-mar transition active:scale-95">
          <Share2 size={16} /> Compartilhar
        </button>
      </header>}

      <div className="sticky top-0 z-10 space-y-2 border-b border-linha bg-cartao/95 px-3 pt-1 pb-2.5 backdrop-blur">
        <Abas abas={abas} atual={aba} mudar={(a) => mudar('aba', a)} />
        {categorias.length > 1 && (
          <div className="sem-barra -mx-3 flex gap-1.5 overflow-x-auto px-3">
            {(aba === 'jogos' || aba === 'atletas') && (
              <Chip ativo={!cat} onClick={() => mudar('cat', '')}>Todas</Chip>
            )}
            {categorias.map((c, i) => (
              <Chip
                key={c.id}
                ativo={cat ? cat.id === c.id : (aba === 'tabela' || aba === 'chave') && i === 0}
                onClick={() => mudar('cat', c.id)}
              >
                {c.nome}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 pt-4">
        {aba === 'jogos' && <Jogos base={base} cat={cat} slug={camp.slug} />}
        {aba === 'tabela' && <Tabela base={base} cat={cat ?? categorias[0]} seguir />}
        {aba === 'chave' && <Chave base={tudo} cat={cat ?? categorias[0]} camp={camp} />}
        {aba === 'atletas' && <Atletas base={base} cat={cat} />}
        {aba === 'torneio' && tema?.cartaz && (
          <div className="space-y-3">
            <img src={tema.cartaz} alt={`Cartaz do ${camp.nome}`} className="w-full rounded-2xl" />
            {camp.descricao && <p className="px-1 text-sm text-cinza">{camp.descricao}</p>}
          </div>
        )}
        <Instalar camp={camp} />
        <Patrocinadores lista={tudo.patrocinadores} />
        <div className="mt-6 text-center">
          <Link href={`/c/${camp.slug}/telao`} className="inline-flex items-center gap-2 text-sm font-semibold text-mar"><Tv size={16} /> Abrir no telão</Link>
        </div>
      </div>
      <Compartilhar camp={camp} aberta={compartilhando} fechar={() => setCompartilhando(false)} />
      <CreditoVetor />
    </div>
  )
}

function Chip({ ativo, ...p }: { ativo: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={cx('h-8 shrink-0 rounded-full border px-3 text-sm font-medium', ativo ? 'border-mar bg-mar text-white' : 'border-linha bg-cartao text-cinza')}
    />
  )
}

function Jogos({ base, cat, slug }: { base: Base; cat?: Categoria; slug: string }) {
  const [quadra, setQuadra] = useState('')
  const { ids: seguindo } = useSeguidos()
  const todos = base.jogos.filter((j) => (!cat || j.categoria_id === cat.id))
  const quadras = [...new Set(todos.map((j) => j.quadra).filter(Boolean))].sort() as string[]
  const jogos = todos.filter((j) => !quadra || j.quadra === quadra)
  const ordem = (x: Jogo, y: Jogo) =>
    (x.horario ?? '9').localeCompare(y.horario ?? '9') || x.ordem - y.ordem
  const vivos = jogos.filter((j) => j.status === 'ao_vivo').sort(ordem)
  const proximos = jogos.filter((j) => j.status === 'agendado').sort(ordem)
  const fim = jogos.filter((j) => j.status === 'encerrado').sort((x, y) => -ordem(x, y))
  const varias = base.categorias.length > 1 && !cat

  const seguidos = jogos.filter((j) => j.status !== 'encerrado' && [j.time_a, j.time_b].some((t) => seguindo.includes(t ?? '')))
  if (!todos.length) return <Vazio>A tabela de jogos ainda não saiu.</Vazio>
  const lista = (titulo: string, js: Jogo[]) =>
    js.length > 0 && (
      <section className="mb-6">
        <h2 className="mb-2 px-1 text-[15px] font-bold text-tinta">{titulo}</h2>
        <div className="space-y-2">
          {js.map((j) => (
            <CartaoJogo key={j.id} jogo={j} base={base} href={`/c/${slug}/jogo/${j.id}`} mostrarCategoria={varias} />
          ))}
        </div>
      </section>
    )
  return (
    <>
      {quadras.length > 1 && (
        <div className="sem-barra -mx-3 mb-4 flex gap-1.5 overflow-x-auto px-3">
          <Chip ativo={!quadra} onClick={() => setQuadra('')}>Todas as quadras</Chip>
          {quadras.map((q) => (
            <Chip key={q} ativo={quadra === q} onClick={() => setQuadra(q)}>Quadra {q}</Chip>
          ))}
        </div>
      )}
      {!quadra && <Quadras base={{ ...base, jogos: todos }} slug={slug} />}
      {lista('Suas duplas', seguidos.sort(ordem))}
      {lista('Agora', vivos)}
      {lista('Próximos', proximos)}
      {lista('Resultados', fim)}
    </>
  )
}

export function Tabela({ base, cat, seguir }: { base: Base; cat: Categoria; seguir?: boolean }) {
  const times = base.times.filter((t) => t.categoria_id === cat.id)
  const jogos = base.jogos.filter((j) => j.categoria_id === cat.id && j.fase === 'grupo')
  const grupos = gruposDa(times)
  const passam = cat.formato === 'grupos' ? 0 : cat.mata.por_grupo
  if (!grupos.length) return <Vazio>Os grupos ainda não foram montados.</Vazio>
  return (
    <div className="space-y-5">
      {grupos.map((g) => {
        const linhas = classificar(times.filter((t) => t.grupo === g), jogos.filter((j) => j.grupo === g), cat)
        return (
          <section key={g} className="overflow-hidden rounded-2xl bg-cartao">
            <h2 className="px-4 pb-1 pt-3 font-bold">Grupo {g}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-cinza">
                  <th className="w-8 py-2 pl-4 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">Time</th>
                  <th className="w-8 py-2 text-center font-medium">J</th>
                  <th className="w-8 py-2 text-center font-medium">V</th>
                  <th className="w-10 py-2 text-center font-medium" title="Saldo de sets">SS</th>
                  <th className="w-11 py-2 text-center font-medium" title="Saldo de pontos">SP</th>
                  <th className="w-11 py-2 pr-4 text-center font-bold text-tinta">Pts</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.time.id} className="border-t border-linha">
                    <td className="py-2.5 pl-4">
                      <span className={cx('placar mr-1 inline-grid h-6 w-6 place-items-center rounded-md text-base', l.posicao <= passam ? 'bg-mar text-white' : 'text-cinza')}>
                        {l.posicao}
                      </span>
                    </td>
                    <td className="max-w-0 py-1 pr-1">
                      <div className="flex items-center">
                        <span className="min-w-0 flex-1 truncate font-semibold">{l.time.nome}</span>
                        {seguir && <BotaoSeguir time={l.time} pequeno />}
                      </div>
                    </td>
                    <td className="text-center text-cinza">{l.jogos}</td>
                    <td className="text-center text-cinza">{l.vitorias}</td>
                    <td className="text-center text-cinza">{sinal(saldoSets(l))}</td>
                    <td className="text-center text-cinza">{sinal(saldoPontos(l))}</td>
                    <td className="placar pr-4 text-center text-lg">{l.pontos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
      <p className="px-1 text-xs leading-relaxed text-cinza">
        Vitória vale {cat.regras.vitoria} {cat.regras.vitoria === 1 ? 'ponto' : 'pontos'}, derrota {cat.regras.derrota}. Desempate: vitórias,
        saldo de sets (SS), saldo de pontos (SP), pontos feitos e confronto direto.
        {passam > 0 && ` Os ${passam} primeiros de cada grupo avançam${cat.mata.extras ? `, mais os ${cat.mata.extras} melhores ${cat.mata.por_grupo + 1}º colocados` : ''}.`}
      </p>
    </div>
  )
}

const sinal = (n: number) => (n > 0 ? `+${n}` : String(n))

function Chave({ base, cat, camp }: { base: Base & { patrocinadores: import('../lib/motor').Patrocinador[] }; cat: Categoria; camp: Campeonato }) {
  const slug = camp.slug
  const jogos = base.jogos.filter((j) => j.categoria_id === cat.id && j.fase !== 'grupo')
  const fases = fasesMata(jogos)
  if (!jogos.length) return <Vazio>A chave do mata-mata ainda não saiu.</Vazio>
  const final = jogos.find((j) => j.fase === 'final')
  const lados = final && ladosDoJogo(final, base)
  const campeao = final?.status === 'encerrado' && final.vencedor && lados ? lados[final.vencedor] : undefined
  return (
    <div className="space-y-6">
      {campeao && (
        <div className="rounded-2xl bg-sol px-4 py-5 text-center">
          <div className="text-sm font-bold">Campeão, {cat.nome}</div>
          <div className="largo mt-1 text-3xl font-extrabold">{campeao.nome}</div>
          <div className="mx-auto mt-4 max-w-xs">
            <BotaoArte camp={camp} base={base} arte={{ tipo: 'campeao', time: campeao, categoria: cat.nome }} rotulo="Imagem do campeão para o Instagram" />
          </div>
        </div>
      )}
      {fases.map((f) => (
        <section key={f}>
          <h2 className="mb-2 px-1 text-[15px] font-bold text-tinta">{NOME_FASE[f]}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {jogos
              .filter((j) => j.fase === f)
              .sort((x, y) => x.ordem - y.ordem)
              .map((j) => (
                <CartaoJogo key={j.id} jogo={j} base={base} href={`/c/${slug}/jogo/${j.id}`} />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Atletas({ base, cat }: { base: Base; cat?: Categoria }) {
  const [stats, setStats] = useState<Map<string, { pontos: number; erros: number; ataques: number; bloqueios: number; aces: number }> | null>(null)
  const atletas = useMemo(() => {
    const times = new Set(base.times.filter((t) => !cat || t.categoria_id === cat.id).map((t) => t.id))
    return base.atletas.filter((a) => times.has(a.time_id))
  }, [base.times, base.atletas, cat])
  const placarTotal = base.jogos.reduce((s, j) => s + j.sets.flat().reduce((x, y) => x + y, 0), 0)
  useEffect(() => {
    estatisticas(atletas.map((a) => a.id)).then((r) => setStats(new Map(r.map((x) => [x.atleta_id, x]))))
  }, [atletas, placarTotal])
  if (!stats) return <Carregando />
  const linhas = atletas
    .map((a) => ({ a, t: base.times.find((t) => t.id === a.time_id), ...(stats.get(a.id) ?? { pontos: 0, erros: 0, ataques: 0, bloqueios: 0, aces: 0 }) }))
    .sort((x, y) => y.pontos - x.pontos || x.erros - y.erros || x.a.nome.localeCompare(y.a.nome))
  if (!linhas.some((l) => l.pontos || l.erros)) return <Vazio>Os pontos dos atletas aparecem aqui assim que os jogos começarem.</Vazio>
  return (
    <div className="overflow-hidden rounded-2xl bg-cartao">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-cinza">
            <th className="w-10 py-2.5 pl-4 text-left font-medium">#</th>
            <th className="py-2.5 text-left font-medium">Atleta</th>
            <th className="w-14 py-2.5 text-center font-bold text-tinta">Pontos</th>
            <th className="w-14 py-2.5 pr-4 text-center font-medium">Erros</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={l.a.id} className="border-t border-linha">
              <td className="placar py-2.5 pl-4 text-base text-cinza">{i + 1}</td>
              <td className="max-w-0 py-2.5 pr-2">
                <div className="truncate font-semibold">{l.a.nome}</div>
                <div className="truncate text-xs text-cinza">
                  {[l.t?.nome, l.ataques && `${l.ataques} ataque${l.ataques > 1 ? 's' : ''}`, l.bloqueios && `${l.bloqueios} bloqueio${l.bloqueios > 1 ? 's' : ''}`, l.aces && `${l.aces} ace${l.aces > 1 ? 's' : ''}`].filter(Boolean).join(', ')}
                </div>
              </td>
              <td className="placar text-center text-xl">{l.pontos}</td>
              <td className="pr-4 text-center text-cinza">{l.erros}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export function periodo(ini: string, fim: string | null) {
  const [, m1, d1] = ini.split('-').map(Number)
  if (!fim || fim === ini) return `${d1} de ${MESES[m1 - 1]}`
  const [, m2, d2] = fim.split('-').map(Number)
  if (m1 === m2) return `${d1} a ${d2} de ${MESES[m1 - 1]}`
  return `${d1} de ${MESES[m1 - 1]} a ${d2} de ${MESES[m2 - 1]}`
}

// a bola de beach: gomos curvos em azul, amarelo e branco
export function Bola({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs><clipPath id="bola"><circle cx="50" cy="50" r="48" /></clipPath></defs>
      <g clipPath="url(#bola)">
        <rect width="100" height="100" fill="#ffd21f" />
        <path d="M-10 30 C 25 10, 60 20, 110 -5 L 110 -20 L -10 -20 Z" fill="#ffffff" />
        <path d="M-10 52 C 30 30, 70 40, 110 18 L 110 0 C 60 22, 25 12, -10 32 Z" fill="#0b48c9" />
        <path d="M20 110 C 30 70, 55 50, 110 45 L 110 70 C 70 72, 45 85, 42 110 Z" fill="#ffffff" />
        <path d="M-10 70 C 5 60, 15 75, 20 110 L -10 110 Z" fill="#0b48c9" />
      </g>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#082f8a" strokeWidth="2.5" />
    </svg>
  )
}
