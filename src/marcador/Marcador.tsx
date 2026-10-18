import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { ArrowLeftRight, List, MoreHorizontal, Undo2 } from 'lucide-react'
import { rpc, sb, senha, useCampeonato, useLances } from '../lib/dados'
import {
  NOME_FUNDAMENTO, calcularPlacar, horaDeTrocar, outro, regrasDoJogo, setsDosLances,
  type Atleta, type Campeonato, type Fundamento, type Jogo, type Lado, type Lance,
} from '../lib/motor'
import { Botao, Carregando, Folha, Topo, Vazio, aviso, confirmar, cx, entrada } from '../ui/ui'
import { CartaoJogo, ladosDoJogo, nomeDaFase } from '../ui/jogo'
import { useTema } from '../temas'
import { CreditoVetor } from '../ui/Vetor'

export function MarcadorInicio() {
  const [lista, setLista] = useState<Campeonato[] | null>(null)
  useEffect(() => {
    sb.from('campeonatos').select('*').order('data_inicio', { ascending: false }).then(({ data }) => setLista(data ?? []))
  }, [])
  return (
    <div className="mx-auto max-w-3xl pb-16">
      <Topo titulo="Marcador" sub="Escolha o campeonato" voltar="/" />
      <div className="space-y-2 p-3">
        {!lista ? <Carregando /> : lista.length === 0 ? <Vazio>Nenhum campeonato.</Vazio> : lista.map((c) => (
          <Link key={c.id} href={`/marcador/${c.id}`} className="block rounded-2xl bg-cartao p-4 font-bold">{c.nome}</Link>
        ))}
      </div>
    </div>
  )
}

export function EntrarComSenha({ titulo, sub, voltar, entrar }: { titulo: string; sub: string; voltar: string; entrar: (s: string) => Promise<boolean> }) {
  const [valor, setValor] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setOcupado(true)
    setErro('')
    try {
      if (!(await entrar(valor))) setErro('Senha incorreta.')
    } catch (er) {
      setErro((er as Error).message)
    }
    setOcupado(false)
  }
  return (
    <div className="mx-auto max-w-3xl">
      <Topo titulo={titulo} voltar={voltar} />
      <form onSubmit={enviar} className="mx-auto max-w-sm space-y-4 px-4 pt-14">
        <p className="text-cinza">{sub}</p>
        <input autoFocus type="password" className={entrada} placeholder="Senha" value={valor} onChange={(e) => setValor(e.target.value)} />
        {erro && <p className="text-sm font-semibold text-vivo">{erro}</p>}
        <Botao grande className="w-full" disabled={!valor || ocupado}>{ocupado ? 'Conferindo…' : 'Entrar'}</Botao>
      </form>
    </div>
  )
}

function useSenhaMarcador(campId: string) {
  const [ok, setOk] = useState(() => !!senha.marcador(campId))
  const entrar = async (s: string) => {
    const certo = await rpc<boolean>('marcador_entrar', { p_campeonato: campId, p_senha: s })
    if (certo) {
      senha.guardar('marcador', s, campId)
      setOk(true)
    }
    return certo
  }
  return { ok, entrar }
}

export function MarcadorJogos({ campId }: { campId: string }) {
  const { ok, entrar } = useSenhaMarcador(campId)
  const { tudo } = useCampeonato({ id: campId })
  useTema(tudo?.camp.slug)
  const [cat, setCat] = useState('')
  const [quadra, setQuadra] = useState('')
  if (!ok) return <EntrarComSenha titulo="Marcador" sub="Digite a senha do marcador deste campeonato." voltar="/marcador" entrar={entrar} />
  if (tudo === undefined) return <Carregando />
  if (!tudo) return <Vazio>Campeonato não encontrado.</Vazio>
  const jogos = tudo.jogos.filter((j) => (!cat || j.categoria_id === cat) && (!quadra || j.quadra === quadra))
  const quadras = [...new Set(tudo.jogos.map((j) => j.quadra).filter(Boolean))].sort() as string[]
  const ord = (x: Jogo, y: Jogo) => (x.horario ?? '9').localeCompare(y.horario ?? '9') || x.ordem - y.ordem
  const grupo = (titulo: string, js: Jogo[]) => js.length > 0 && (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-[15px] font-bold text-tinta">{titulo}</h2>
      <div className="space-y-2">
        {js.map((j) => <CartaoJogo key={j.id} jogo={j} base={tudo} href={`/marcador/${campId}/jogo/${j.id}`} mostrarCategoria={tudo.categorias.length > 1} />)}
      </div>
    </section>
  )
  return (
    <div className="mx-auto max-w-3xl pb-16">
      <Topo
        titulo={tudo.camp.nome}
        sub="Marcador · toque no jogo para marcar"
        voltar="/marcador"
        direita={<button className="text-sm text-cinza" onClick={() => { senha.sair('marcador', campId); location.reload() }}>Sair</button>}
      />
      <div className="flex gap-2 p-3">
        {tudo.categorias.length > 1 && (
          <select className={entrada} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {tudo.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        {quadras.length > 1 && (
          <select className={entrada} value={quadra} onChange={(e) => setQuadra(e.target.value)}>
            <option value="">Todas as quadras</option>
            {quadras.map((q) => <option key={q} value={q}>Quadra {q}</option>)}
          </select>
        )}
      </div>
      <div className="px-3">
        {!tudo.jogos.length && <Vazio>Nenhum jogo cadastrado ainda.</Vazio>}
        {grupo('Em andamento', jogos.filter((j) => j.status === 'ao_vivo').sort(ord))}
        {grupo('Próximos', jogos.filter((j) => j.status === 'agendado').sort(ord))}
        {grupo('Encerrados', jogos.filter((j) => j.status === 'encerrado').sort(ord).reverse())}
      </div>
      <CreditoVetor links={false} />
    </div>
  )
}

// ---------- marcar um jogo ----------

export function Marcar({ campId, id }: { campId: string; id: string }) {
  const { ok, entrar } = useSenhaMarcador(campId)
  if (!ok) return <EntrarComSenha titulo="Marcador" sub="Digite a senha do marcador deste campeonato." voltar="/marcador" entrar={entrar} />
  return <Mesa campId={campId} id={id} />
}

type Novo = Omit<Lance, 'id' | 'criado_em'> & { id: number; criado_em: string }

function Mesa({ campId, id }: { campId: string; id: string }) {
  const { tudo, recarregar: recarregarTudo } = useCampeonato({ id: campId })
  useTema(tudo?.camp.slug)
  const { lances, recarregar } = useLances(id)
  const [pendentes, setPendentes] = useState<Novo[]>([])
  const [removidos, setRemovidos] = useState<Set<number>>(new Set())
  const [invertido, setInvertido] = useState(false)
  const [verLances, setVerLances] = useState(false)
  const [menu, setMenu] = useState(false)
  const [editando, setEditando] = useState<Lance | null>(null)
  const [pulso, setPulso] = useState<Lado | null>(null)
  const [comTipo, setComTipo] = useState(() => {
    try { return localStorage.getItem('beach:tipo') !== 'nao' } catch { return true }
  })
  const mudarTipo = (v: boolean) => {
    setComTipo(v)
    try { localStorage.setItem('beach:tipo', v ? 'sim' : 'nao') } catch { /* sem armazenamento */ }
  }
  const fila = useRef<Promise<unknown>>(Promise.resolve())
  const [, navegar] = useLocation()
  const s = senha.marcador(campId)

  const mostrados = useMemo(
    () => [...lances.filter((l) => !removidos.has(l.id)), ...pendentes.filter((p) => !removidos.has(p.id))],
    [lances, pendentes, removidos],
  )

  if (tudo === undefined) return <Carregando />
  const jogo = tudo?.jogos.find((j) => j.id === id)
  if (!tudo || !jogo) return <Vazio>Jogo não encontrado.</Vazio>

  const { cat, a, b, rotuloA, rotuloB } = ladosDoJogo(jogo, tudo)
  const r = regrasDoJogo(cat, jogo.fase)
  const sets = jogo.placar_manual || jogo.wo ? jogo.sets : setsDosLances(mostrados)
  const p = calcularPlacar(r, sets)
  const n = p.setAtual
  const atual = sets[n - 1] ?? [0, 0]
  const encerrado = jogo.status === 'encerrado'
  const time = { a, b }
  const atletas = (l: Lado) => tudo.atletas.filter((x) => x.time_id === time[l]?.id)
  const nomeAtleta = (aid: string | null) => tudo.atletas.find((x) => x.id === aid)?.nome

  const enfileirar = (f: () => Promise<unknown>) => {
    fila.current = fila.current.then(f).catch((e) => {
      aviso((e as Error).message, true)
      setPendentes([])
      setRemovidos(new Set())
      recarregar()
      recarregarTudo()
    })
  }

  const marcar = (lado: Lado, tipo: Lance['tipo'], atleta: Atleta | null, fundamento: Fundamento | null = null) => {
    if (encerrado) return aviso('Jogo encerrado. Reabra no menu para corrigir.', true)
    if (p.vencedor) return aviso('Jogo decidido. Encerre ou desfaça o último ponto.', true)
    if (navigator.vibrate) navigator.vibrate(25)
    const novo: Novo = { id: -Date.now() - Math.random(), jogo_id: id, set_num: n, lado, tipo, atleta_id: atleta?.id ?? null, fundamento, criado_em: new Date().toISOString() }
    setPendentes((ps) => [...ps, novo])
    setPulso(lado)
    setTimeout(() => setPulso(null), 260)
    aviso(`${descr(novo)}${tipo === 'erro' ? `, ponto para ${time[lado]?.nome}` : ''}`)
    enfileirar(async () => {
      await rpc('marcador_lance', { p_senha: s, p_jogo: id, p_set: novo.set_num, p_lado: lado, p_tipo: tipo, p_atleta: novo.atleta_id, p_fundamento: fundamento })
      await recarregar()
      setPendentes((ps) => ps.filter((x) => x.id !== novo.id))
    })
  }

  const desfazer = () => {
    const ultimo = mostrados[mostrados.length - 1]
    if (!ultimo) return
    setRemovidos((rs) => new Set(rs).add(ultimo.id))
    aviso('Último ponto desfeito')
    enfileirar(async () => {
      await rpc('marcador_desfazer', { p_senha: s, p_jogo: id })
      await recarregar()
      setPendentes((ps) => ps.filter((x) => x.id !== ultimo.id))
      setRemovidos((rs) => {
        const nv = new Set(rs)
        nv.delete(ultimo.id)
        return nv
      })
    })
  }

  const acao = async (f: () => Promise<unknown>, msg?: string) => {
    try {
      await f()
      if (msg) aviso(msg)
      await Promise.all([recarregar(), recarregarTudo()])
    } catch (e) {
      aviso((e as Error).message, true)
    }
  }

  const iniciar = () => acao(() => rpc('marcador_iniciar', { p_senha: s, p_jogo: id, p_time_a: a?.id, p_time_b: b?.id }), 'Jogo começou')
  const status = (st: string) => acao(() => rpc('marcador_status', { p_senha: s, p_jogo: id, p_status: st }), st === 'encerrado' ? 'Jogo encerrado' : 'Jogo reaberto')

  const lados: Lado[] = invertido ? ['b', 'a'] : ['a', 'b']
  const ultimo = mostrados[mostrados.length - 1]
  const descr = (l: Pick<Lance, 'tipo' | 'lado' | 'atleta_id' | 'fundamento'>) =>
    l.tipo === 'ponto' ? `${l.fundamento ? NOME_FUNDAMENTO[l.fundamento] : 'Ponto'} de ${nomeAtleta(l.atleta_id) ?? time[l.lado]?.nome}`
      : l.tipo === 'erro' ? `${l.fundamento === 'saque' ? 'Erro de saque' : 'Erro'} de ${nomeAtleta(l.atleta_id) ?? '?'}`
      : `Ponto ${time[l.lado]?.nome ?? ''}`

  const parcialAte = (i: number) => {
    const ate = mostrados.slice(0, i + 1).filter((x) => x.set_num === mostrados[i].set_num)
    const pa = ate.filter((x) => x.lado === 'a').length
    return { pa, pb: ate.length - pa }
  }

  const fimDeSet = n > 1 && atual[0] + atual[1] === 0 && !p.vencedor ? sets[n - 2] : null
  const trocar = !p.vencedor && !fimDeSet && horaDeTrocar(r, n, atual[0], atual[1])

  // ainda não começou
  if (jogo.status === 'agendado' && !mostrados.length) {
    return (
      <div className="mx-auto max-w-3xl">
        <Topo titulo={`${cat.nome} · ${nomeDaFase(jogo)}`} sub={jogo.quadra ? `Quadra ${jogo.quadra}` : undefined} voltar={`/marcador/${campId}`} />
        <div className="space-y-4 p-4 pt-8 text-center">
          <div className="text-xl font-bold">{a?.nome ?? rotuloA}</div>
          <div className="text-cinza">contra</div>
          <div className="text-xl font-bold">{b?.nome ?? rotuloB}</div>
          <p className="text-sm text-cinza">
            {r.sets === 1 ? 'Set único' : `Melhor de ${r.sets} sets`} de {r.pontos_set} pontos
            {r.sets > 1 && `, desempate de ${r.pontos_desempate}`}{r.teto ? `, teto de ${r.teto}` : ''}.
          </p>
          {a && b ? (
            <Botao grande className="w-full" onClick={iniciar}>Começar jogo</Botao>
          ) : (
            <Vazio>Os dois times ainda não estão definidos. Aguarde os jogos anteriores terminarem.</Vazio>
          )}
          {a && b && (
            <Botao variante="fantasma" onClick={() => setMenu(true)}>W.O.</Botao>
          )}
        </div>
        <MenuJogo aberto={menu} fechar={() => setMenu(false)} jogo={jogo} nomes={{ a: a?.nome, b: b?.nome }} senhaM={s} depois={() => { recarregarTudo(); recarregar() }} status={status} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col">
      <Topo
        titulo={`${cat.nome} · ${nomeDaFase(jogo)}`}
        sub={[jogo.quadra && `Quadra ${jogo.quadra}`, `${n}º set`].filter(Boolean).join(' · ')}
        voltar={`/marcador/${campId}`}
        direita={
          <div className="flex">
            <button onClick={() => setInvertido((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full active:bg-linha" aria-label="Trocar lados"><ArrowLeftRight size={20} /></button>
            <button onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center rounded-full active:bg-linha" aria-label="Mais"><MoreHorizontal size={22} /></button>
          </div>
        }
      />

      {/* placar */}
      <div className="grid grid-cols-2 gap-px bg-linha">
        {lados.map((l) => (
          <div key={l} className={cx('px-3 pb-4 pt-3 text-center', l === 'a' ? 'bg-mar text-white' : 'bg-sol text-tinta')}>
            <div className={cx('truncate text-sm font-bold', l === 'a' ? 'text-white/85' : 'text-tinta/80')}>{time[l]?.nome}</div>
            <div className={cx('placar my-1 text-[5.5rem]', pulso === l && 'estoura')}>{atual[l === 'a' ? 0 : 1]}</div>
            <div className="flex items-center justify-center gap-1.5 text-xs opacity-75">
              <span>sets</span>
              <span className="placar text-lg opacity-100">{l === 'a' ? p.setsA : p.setsB}</span>
              {sets.slice(0, n - 1).length > 0 && (
                <span className="ml-1">({sets.slice(0, n - 1).map((x) => x[l === 'a' ? 0 : 1]).join(' · ')})</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* avisos do jogo */}
      {(encerrado || p.vencedor || fimDeSet || trocar) && (
        <div className={cx('px-4 py-3 text-center text-sm font-semibold', encerrado ? 'bg-tinta text-white' : p.vencedor ? 'bg-sol' : 'bg-cartao')}>
          {encerrado ? (
            <>Jogo encerrado · {time[jogo.vencedor!]?.nome} venceu {p.setsA}-{p.setsB}</>
          ) : p.vencedor ? (
            <div className="space-y-2">
              <div>{time[p.vencedor]?.nome} venceu {p.setsA}-{p.setsB}. Confirme para valer na tabela.</div>
              <Botao className="w-full" onClick={() => status('encerrado')}>Encerrar jogo</Botao>
            </div>
          ) : fimDeSet ? (
            <>Fim do {n - 1}º set: {fimDeSet[0]} a {fimDeSet[1]}. O próximo ponto já conta no {n}º set.</>
          ) : (
            <span className="inline-flex items-center gap-2"><ArrowLeftRight size={16} /> Troca de lado ({atual[0] + atual[1]} pontos)</span>
          )}
        </div>
      )}

      {/* botões dos atletas */}
      <div className="grid flex-1 grid-cols-2 gap-2 p-2">
        {lados.map((l) => (
          <div key={l} className="flex flex-col gap-2">
            {atletas(l).map((x) => (
              <div key={x.id} className="rounded-2xl bg-cartao p-2">
                <div className="mb-1.5 truncate px-1 text-sm font-bold">{x.nome}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    disabled={encerrado}
                    onClick={() => marcar(l, 'ponto', x)}
                    className={cx('h-16 rounded-xl text-base font-bold transition active:scale-95 disabled:opacity-30', l === 'a' ? 'bg-mar text-white' : 'bg-sol text-tinta')}
                  >
                    Ponto
                  </button>
                  <button
                    disabled={encerrado}
                    onClick={() => marcar(outro(l), 'erro', x)}
                    className="h-16 rounded-xl border-2 border-linha text-base font-bold text-cinza transition active:scale-95 disabled:opacity-30"
                  >
                    Erro
                  </button>
                </div>
                {comTipo && (
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    {(['ataque', 'bloqueio', 'ace', 'saque'] as Fundamento[]).map((f) => (
                      <button
                        key={f}
                        disabled={encerrado}
                        onClick={() => (f === 'saque' ? marcar(outro(l), 'erro', x, f) : marcar(l, 'ponto', x, f))}
                        className={cx(
                          'h-8 rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-30',
                          f === 'saque' ? 'border border-linha text-cinza' : l === 'a' ? 'bg-mar-claro text-mar' : 'bg-sol-claro text-tinta',
                        )}
                      >
                        {f === 'saque' ? 'Erro de saque' : NOME_FUNDAMENTO[f]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button
              disabled={encerrado}
              onClick={() => marcar(l, 'avulso', null)}
              className="h-12 rounded-xl border border-dashed border-linha text-sm font-semibold text-cinza active:bg-cartao disabled:opacity-30"
            >
              +1 sem atleta
            </button>
          </div>
        ))}
      </div>

      {/* rodapé */}
      <div className="sticky bottom-0 flex gap-2 border-t border-linha bg-areia p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Botao variante="secundario" className="min-w-0 flex-1" disabled={!ultimo || encerrado} onClick={desfazer}>
          <Undo2 size={18} className="shrink-0" />
          <span className="truncate">{ultimo ? `Desfazer: ${descr(ultimo)}` : 'Desfazer'}</span>
        </Botao>
        <Botao variante="secundario" onClick={() => setVerLances(true)} aria-label="Lances"><List size={18} /> {mostrados.length}</Botao>
      </div>

      <Folha aberta={verLances} fechar={() => setVerLances(false)} titulo="Lances do jogo">
        {!mostrados.length ? <Vazio>Nenhum ponto marcado.</Vazio> : (
          <div className="overflow-hidden rounded-2xl bg-cartao">
            {mostrados.map((l, i) => ({ l, ...parcialAte(i) })).reverse().map(({ l, pa, pb }) => {
              return (
                <button
                  key={l.id}
                  disabled={l.id < 0 || encerrado}
                  onClick={() => setEditando(l as Lance)}
                  className="flex w-full items-center gap-3 border-t border-linha px-4 py-3 text-left text-sm first:border-0 active:bg-areia"
                >
                  <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', l.lado === 'a' ? 'bg-mar' : 'bg-sol')} />
                  <span className="min-w-0 flex-1 truncate">{descr(l)}</span>
                  <span className="text-xs text-cinza">{l.set_num}º set</span>
                  <span className="placar w-12 text-right text-base">{pa}-{pb}</span>
                </button>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-cinza">Toque num lance para corrigir quem fez o ponto ou o erro.</p>
      </Folha>

      <Folha aberta={!!editando} fechar={() => setEditando(null)} titulo="Corrigir lance">
        {editando && (
          <div className="space-y-2">
            {editando.tipo !== 'avulso' && editando.atleta_id && (
              <div className="rounded-2xl bg-cartao p-3">
                <div className="mb-2 text-sm font-bold">Tipo do ponto</div>
                <div className="flex flex-wrap gap-1.5">
                  {[null, ...(editando.tipo === 'ponto' ? ['ataque', 'bloqueio', 'ace'] : ['saque'])].map((f) => (
                    <Botao key={f ?? 'nenhum'} variante={(editando.fundamento ?? null) === f ? 'primario' : 'secundario'} className="h-9 text-sm"
                      onClick={() => acao(async () => {
                        await rpc('marcador_editar_lance', { p_senha: s, p_lance: editando.id, p_lado: editando.lado, p_tipo: editando.tipo, p_atleta: editando.atleta_id, p_fundamento: f })
                        setEditando(null)
                      }, 'Lance corrigido')}>
                      {f ? (f === 'saque' ? 'Erro de saque' : NOME_FUNDAMENTO[f as Fundamento]) : 'Sem tipo'}
                    </Botao>
                  ))}
                </div>
              </div>
            )}
            {(['a', 'b'] as Lado[]).map((l) => (
              <div key={l} className="rounded-2xl bg-cartao p-2">
                <div className={cx('px-2 py-1 text-sm font-bold', l === 'a' ? 'text-mar' : 'text-tinta')}>{time[l]?.nome}</div>
                {atletas(l).map((x) => (
                  <div key={x.id} className="grid grid-cols-2 gap-1.5 p-1">
                    {(['ponto', 'erro'] as const).map((tipo) => {
                      const lado = tipo === 'ponto' ? l : outro(l)
                      const igual = editando.tipo === tipo && editando.atleta_id === x.id
                      return (
                        <Botao key={tipo} variante={igual ? 'primario' : 'secundario'} onClick={() => acao(async () => {
                          await rpc('marcador_editar_lance', { p_senha: s, p_lance: editando.id, p_lado: lado, p_tipo: tipo, p_atleta: x.id })
                          setEditando(null)
                        }, 'Lance corrigido')}>
                          <span className="truncate">{tipo === 'ponto' ? 'Ponto' : 'Erro'} {x.nome}</span>
                        </Botao>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
            <Botao variante="perigo" className="w-full" onClick={() => acao(async () => {
              await rpc('marcador_apagar_lance', { p_senha: s, p_lance: editando.id })
              setEditando(null)
            }, 'Lance apagado')}>Apagar este lance</Botao>
          </div>
        )}
      </Folha>

      <MenuJogo aberto={menu} fechar={() => setMenu(false)} jogo={jogo} nomes={{ a: a?.nome, b: b?.nome }} senhaM={s} comTipo={comTipo} mudarTipo={mudarTipo}
        depois={() => { recarregarTudo(); recarregar() }} status={status} sair={() => navegar(`/marcador/${campId}`)} />
    </div>
  )
}

function MenuJogo({ aberto, fechar, jogo, nomes, senhaM, depois, status, comTipo, mudarTipo }: {
  aberto: boolean; fechar: () => void; jogo: Jogo; nomes: { a?: string; b?: string }; senhaM: string
  depois: () => void; status: (s: string) => void; sair?: () => void
  comTipo?: boolean; mudarTipo?: (v: boolean) => void
}) {
  const wo = async (v: Lado | null) => {
    if (v && !confirmar(`Dar vitória por W.O. para ${nomes[v]}? Os pontos marcados serão apagados.`)) return
    try {
      await rpc('marcador_wo', { p_senha: senhaM, p_jogo: jogo.id, p_vencedor: v })
      aviso(v ? 'W.O. registrado' : 'W.O. desfeito')
      fechar()
      depois()
    } catch (e) {
      aviso((e as Error).message, true)
    }
  }
  return (
    <Folha aberta={aberto} fechar={fechar} titulo="Jogo">
      <div className="space-y-2">
        {mudarTipo && (
          <label className="flex items-start gap-3 rounded-2xl bg-cartao p-3">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={!!comTipo} onChange={(e) => mudarTipo(e.target.checked)} />
            <span>
              <span className="block font-semibold">Mostrar tipo do ponto</span>
              <span className="block text-sm text-cinza">Botões menores de ataque, bloqueio, ace e erro de saque. É opcional: cada um já marca o ponto e entra nas estatísticas dos atletas.</span>
            </span>
          </label>
        )}
        {jogo.status === 'encerrado' && !jogo.wo && (
          <Botao variante="secundario" className="w-full" onClick={() => { status('ao_vivo'); fechar() }}>Reabrir para corrigir</Botao>
        )}
        {jogo.status === 'ao_vivo' && (
          <Botao variante="secundario" className="w-full" onClick={() => { status('agendado'); fechar() }} disabled={jogo.sets.length > 0}>
            Voltar para "não começou"
          </Botao>
        )}
        {jogo.wo ? (
          <Botao variante="secundario" className="w-full" onClick={() => wo(null)}>Desfazer W.O.</Botao>
        ) : (
          <>
            <Botao variante="secundario" className="w-full" onClick={() => wo('a')}>W.O.: vitória de {nomes.a}</Botao>
            <Botao variante="secundario" className="w-full" onClick={() => wo('b')}>W.O.: vitória de {nomes.b}</Botao>
          </>
        )}
      </div>
    </Folha>
  )
}
