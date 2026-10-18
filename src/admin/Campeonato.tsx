import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { Pencil, Plus, Shuffle, Trash2 } from 'lucide-react'
import { admin, rpc, senha, useCampeonato, type Tudo } from '../lib/dados'
import {
  NOME_FASE, REGRAS_PADRAO, distribuirHorarios, ehFolga, faseIdx, gruposDa, jogosDosGrupos, lerTimes, montarChave,
  origensDosGrupos, regrasDoJogo, rotuloOrigem,
  type Atleta, type Categoria, type Jogo, type Regras, type Time,
} from '../lib/motor'
import { Abas, Botao, Campo, Carregando, Folha, Topo, Vazio, aviso, confirmar, cx, entrada } from '../ui/ui'
import { CartaoJogo, ladosDoJogo, nomeDaFase } from '../ui/jogo'
import { Tabela } from '../publico/Publico'
import { LinkExterno, slugDe, useAdmin } from './Admin'
import { EntrarComSenha } from '../marcador/Marcador'
import { AdminDivulgar, AdminPatrocinadores } from './Patrocinadores'

type Aba = 'categorias' | 'times' | 'tabela' | 'jogos' | 'ajustes'

export function AdminCampeonato({ id }: { id: string }) {
  const { ok, entrar } = useAdmin()
  if (!ok) return <EntrarComSenha titulo="Organização" sub="Digite a senha do administrador." voltar="/" entrar={entrar} />
  return <Painel id={id} />
}

function Painel({ id }: { id: string }) {
  const { tudo, recarregar } = useCampeonato({ id }, true)
  const [aba, setAba] = useState<Aba>('times')
  const [catId, setCatId] = useState('')
  useEffect(() => {
    if (tudo && !tudo.categorias.length) setAba('categorias')
  }, [tudo?.categorias.length]) // eslint-disable-line react-hooks/exhaustive-deps
  if (tudo === undefined) return <Carregando />
  if (!tudo) return <Vazio>Campeonato não encontrado.</Vazio>
  const cat = tudo.categorias.find((c) => c.id === catId) ?? tudo.categorias[0]
  const props = { tudo, recarregar, cat }
  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Topo titulo={tudo.camp.nome} sub="Organização" voltar="/admin" direita={<LinkExterno href={`/c/${tudo.camp.slug}`}>Público</LinkExterno>} />
      <div className="sticky top-14 z-10 space-y-2 border-b border-linha bg-areia/95 px-3 py-2.5 backdrop-blur">
        <Abas
          abas={[['categorias', 'Categorias'], ['times', 'Times'], ['tabela', 'Grupos e chave'], ['jogos', 'Jogos'], ['ajustes', 'Ajustes']]}
          atual={aba}
          mudar={setAba}
        />
        {tudo.categorias.length > 1 && ['times', 'tabela', 'jogos'].includes(aba) && (
          <select className={cx(entrada, 'h-10')} value={cat?.id} onChange={(e) => setCatId(e.target.value)}>
            {tudo.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>
      <div className="p-3">
        {aba === 'categorias' && <Categorias {...props} />}
        {aba !== 'categorias' && aba !== 'ajustes' && !cat && <Vazio>Crie uma categoria primeiro (ex.: Masculino, Feminino, Misto).</Vazio>}
        {aba === 'times' && cat && <Times {...props} cat={cat} />}
        {aba === 'tabela' && cat && <Montagem {...props} cat={cat} />}
        {aba === 'jogos' && cat && <Jogos {...props} cat={cat} />}
        {aba === 'ajustes' && <Ajustes {...props} />}
      </div>
    </div>
  )
}

interface P {
  tudo: Tudo
  recarregar: () => Promise<void>
  cat: Categoria
}

async function tentar(f: () => Promise<unknown>, msg?: string) {
  try {
    await f()
    if (msg) aviso(msg)
    return true
  } catch (e) {
    aviso((e as Error).message, true)
    return false
  }
}

// ---------- categorias ----------

const FORMATOS: Record<Categoria['formato'], string> = {
  grupos_mata: 'Grupos + mata-mata',
  grupos: 'Só grupos (todos contra todos)',
  mata: 'Só mata-mata',
}

function resumoRegras(r: Regras) {
  return `${r.sets === 1 ? 'set único' : `melhor de ${r.sets}`} de ${r.pontos_set}${r.sets > 1 ? ` (desempate ${r.pontos_desempate})` : ''}${r.teto ? `, teto ${r.teto}` : ''}`
}

function Categorias({ tudo, recarregar }: Omit<P, 'cat'> & { cat?: Categoria }) {
  const [editando, setEditando] = useState<Partial<Categoria> | null>(null)
  return (
    <div className="space-y-2">
      {tudo.categorias.map((c) => (
        <div key={c.id} className="flex items-start gap-3 rounded-2xl bg-cartao p-4">
          <div className="min-w-0 flex-1">
            <div className="font-bold">{c.nome}</div>
            <div className="text-sm text-cinza">
              {c.tipo === 'dupla' ? 'Duplas' : 'Quartetos'} · {FORMATOS[c.formato]} · {tudo.times.filter((t) => t.categoria_id === c.id).length} times
            </div>
            <div className="text-sm text-cinza">Grupos: {resumoRegras({ ...REGRAS_PADRAO, ...c.regras })}</div>
            {c.regras_mata && <div className="text-sm text-cinza">Mata-mata: {resumoRegras({ ...REGRAS_PADRAO, ...c.regras_mata })}</div>}
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-areia" onClick={() => setEditando(c)} aria-label="Editar"><Pencil size={16} /></button>
        </div>
      ))}
      <Botao className="w-full" onClick={() => setEditando({ tipo: 'dupla', formato: 'grupos_mata', regras: REGRAS_PADRAO, mata: { por_grupo: 2, extras: 0, terceiro: false }, regras_mata: null })}>
        <Plus size={18} /> Nova categoria
      </Botao>
      {editando && <FormCategoria inicial={editando} campId={tudo.camp.id} ordem={tudo.categorias.length} fechar={() => setEditando(null)} depois={recarregar} />}
    </div>
  )
}

function FormRegras({ r, mudar }: { r: Regras; mudar: (r: Regras) => void }) {
  const num = (k: keyof Regras, v: string) => mudar({ ...r, [k]: v === '' ? null : Number(v) })
  return (
    <div className="grid grid-cols-2 gap-2">
      <Campo rotulo="Sets">
        <select className={entrada} value={r.sets} onChange={(e) => num('sets', e.target.value)}>
          <option value={1}>Set único</option>
          <option value={3}>Melhor de 3</option>
          <option value={5}>Melhor de 5</option>
        </select>
      </Campo>
      <Campo rotulo="Pontos por set"><input type="number" className={entrada} value={r.pontos_set} onChange={(e) => num('pontos_set', e.target.value)} /></Campo>
      {r.sets > 1 && <Campo rotulo="Set de desempate"><input type="number" className={entrada} value={r.pontos_desempate} onChange={(e) => num('pontos_desempate', e.target.value)} /></Campo>}
      <Campo rotulo="Teto (opcional)" dica="Ex.: 25 encerra o set mesmo sem 2 de diferença">
        <input type="number" className={entrada} value={r.teto ?? ''} onChange={(e) => num('teto', e.target.value)} placeholder="sem teto" />
      </Campo>
    </div>
  )
}

function FormCategoria({ inicial, campId, ordem, fechar, depois }: { inicial: Partial<Categoria>; campId: string; ordem: number; fechar: () => void; depois: () => Promise<void> }) {
  const [c, setC] = useState(inicial)
  const r = { ...REGRAS_PADRAO, ...c.regras }
  const mata = c.mata ?? { por_grupo: 2, extras: 0, terceiro: false }
  const salvar = async () => {
    const ok = await tentar(() => admin.salvar('categorias', {
      ...(c.id ? { id: c.id } : { campeonato_id: campId, ordem }),
      nome: c.nome?.trim(), tipo: c.tipo, formato: c.formato, regras: r, regras_mata: c.regras_mata, mata,
    }), 'Categoria salva')
    if (ok) { await depois(); fechar() }
  }
  const apagar = async () => {
    if (!confirmar(`Apagar a categoria ${c.nome} com todos os times e jogos?`)) return
    if (await tentar(() => admin.apagar('categorias', c.id!), 'Categoria apagada')) { await depois(); fechar() }
  }
  return (
    <Folha aberta fechar={fechar} titulo={c.id ? 'Editar categoria' : 'Nova categoria'}>
      <div className="space-y-4">
        <Campo rotulo="Nome"><input className={entrada} value={c.nome ?? ''} onChange={(e) => setC({ ...c, nome: e.target.value })} placeholder="Masculino A, Feminino, Misto…" /></Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Tipo">
            <select className={entrada} value={c.tipo} onChange={(e) => setC({ ...c, tipo: e.target.value as Categoria['tipo'] })}>
              <option value="dupla">Duplas</option>
              <option value="quarteto">Quartetos</option>
            </select>
          </Campo>
          <Campo rotulo="Formato">
            <select className={entrada} value={c.formato} onChange={(e) => setC({ ...c, formato: e.target.value as Categoria['formato'] })}>
              {Object.entries(FORMATOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Campo>
        </div>
        <div>
          <h3 className="mb-2 text-[15px] font-bold text-tinta">{c.formato === 'mata' ? 'Regras dos jogos' : 'Fase de grupos'}</h3>
          <FormRegras r={r} mudar={(regras) => setC({ ...c, regras })} />
          {c.formato !== 'mata' && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Campo rotulo="Vitória vale"><input type="number" className={entrada} value={r.vitoria} onChange={(e) => setC({ ...c, regras: { ...r, vitoria: Number(e.target.value) } })} /></Campo>
              <Campo rotulo="Derrota vale"><input type="number" className={entrada} value={r.derrota} onChange={(e) => setC({ ...c, regras: { ...r, derrota: Number(e.target.value) } })} /></Campo>
              <Campo rotulo="W.O. vale"><input type="number" className={entrada} value={r.wo} onChange={(e) => setC({ ...c, regras: { ...r, wo: Number(e.target.value) } })} /></Campo>
            </div>
          )}
        </div>
        {c.formato === 'grupos_mata' && (
          <div>
            <h3 className="mb-2 text-[15px] font-bold text-tinta">Mata-mata</h3>
            <div className="grid grid-cols-2 gap-2">
              <Campo rotulo="Passam por grupo"><input type="number" min={1} className={entrada} value={mata.por_grupo} onChange={(e) => setC({ ...c, mata: { ...mata, por_grupo: Number(e.target.value) } })} /></Campo>
              <Campo rotulo="Melhores seguintes" dica={`Ex.: 2 = os 2 melhores ${mata.por_grupo + 1}º colocados`}>
                <input type="number" min={0} className={entrada} value={mata.extras} onChange={(e) => setC({ ...c, mata: { ...mata, extras: Number(e.target.value) } })} />
              </Campo>
            </div>
          </div>
        )}
        {c.formato !== 'grupos' && (
          <div className="space-y-3">
            <label className="flex items-center gap-3 font-medium">
              <input type="checkbox" className="h-5 w-5" checked={mata.terceiro} onChange={(e) => setC({ ...c, mata: { ...mata, terceiro: e.target.checked } })} />
              Disputa de 3º lugar
            </label>
            {c.formato === 'grupos_mata' && (
              <label className="flex items-center gap-3 font-medium">
                <input type="checkbox" className="h-5 w-5" checked={!!c.regras_mata} onChange={(e) => setC({ ...c, regras_mata: e.target.checked ? { ...r } : null })} />
                Mata-mata com regra de sets diferente
              </label>
            )}
            {c.regras_mata && <FormRegras r={{ ...REGRAS_PADRAO, ...c.regras_mata }} mudar={(regras_mata) => setC({ ...c, regras_mata })} />}
          </div>
        )}
        <Botao grande className="w-full" disabled={!c.nome?.trim()} onClick={salvar}>Salvar</Botao>
        {c.id && <Botao variante="fantasma" className="w-full text-vivo" onClick={apagar}><Trash2 size={16} /> Apagar categoria</Botao>}
      </div>
    </Folha>
  )
}

// ---------- times ----------

function Times({ tudo, recarregar, cat }: P) {
  const [modo, setModo] = useState<'um' | 'lista'>('um')
  const [editando, setEditando] = useState<Time | null>(null)
  const times = tudo.times.filter((t) => t.categoria_id === cat.id)
  const porTime = cat.tipo === 'dupla' ? 2 : 4

  const gravar = async (novos: { nome: string; atletas: string[] }[]) => {
    const ops: unknown[] = []
    novos.forEach((t, i) => {
      const tid = crypto.randomUUID()
      ops.push({ op: 'salvar', tabela: 'times', dados: { id: tid, categoria_id: cat.id, nome: t.nome, semente: times.length + i + 1 } })
      t.atletas.forEach((nome, k) => ops.push({ op: 'salvar', tabela: 'atletas', dados: { time_id: tid, nome, ordem: k } }))
    })
    const ok = await tentar(() => admin.lote(ops), novos.length === 1 ? `${novos[0].nome} adicionado` : `${novos.length} times adicionados`)
    if (ok) await recarregar()
    return ok
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-cartao p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-bold">{cat.tipo === 'dupla' ? 'Nova dupla' : 'Novo quarteto'}</h2>
          <div className="flex rounded-full bg-areia p-1 text-sm">
            {([['um', 'Um por vez'], ['lista', 'Colar lista']] as const).map(([k, n]) => (
              <button key={k} onClick={() => setModo(k)} className={cx('h-8 rounded-full px-3 font-semibold', modo === k ? 'bg-cartao shadow-sm' : 'text-cinza')}>{n}</button>
            ))}
          </div>
        </div>
        {modo === 'um' ? <UmTime porTime={porTime} gravar={gravar} /> : <ColarLista porTime={porTime} tipo={cat.tipo} gravar={gravar} />}
      </section>

      <section>
        <h2 className="mb-2 px-1 text-[15px] font-bold text-tinta">{times.length} times</h2>
        {!times.length ? <Vazio>Nenhum time ainda.</Vazio> : (
          <div className="overflow-hidden rounded-2xl bg-cartao">
            {times.map((t) => (
              <button key={t.id} onClick={() => setEditando(t)} className="flex w-full items-center gap-3 border-t border-linha px-4 py-3 text-left first:border-0 active:bg-areia">
                <span className="placar w-6 text-center text-lg text-cinza">{times.indexOf(t) + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{t.nome}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tudo.atletas.filter((a) => a.time_id === t.id && !t.nome.includes(a.nome)).map((a) => (
                      <span key={a.id} className="rounded-md bg-areia px-1.5 py-0.5 text-xs text-cinza">{a.nome}</span>
                    ))}
                  </div>
                </div>
                {t.grupo && <span className="rounded-md bg-mar-claro px-2 py-0.5 text-xs font-bold text-mar">Grupo {t.grupo}</span>}
                <Pencil size={15} className="text-cinza" />
              </button>
            ))}
          </div>
        )}
      </section>
      {editando && (
        <FormTime time={editando} atletas={tudo.atletas.filter((a) => a.time_id === editando.id)} fechar={() => setEditando(null)} depois={recarregar} />
      )}
    </div>
  )
}

// um campo por atleta; Enter passa para o próximo e, no último, já adiciona
function UmTime({ porTime, gravar }: { porTime: number; gravar: (t: { nome: string; atletas: string[] }[]) => Promise<boolean> }) {
  const vazio = () => Array.from({ length: porTime }, () => '')
  const [atletas, setAtletas] = useState(vazio)
  const [nome, setNome] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const campos = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => setAtletas(vazio()), [porTime]) // eslint-disable-line react-hooks/exhaustive-deps
  const preenchidos = atletas.map((a) => a.trim()).filter(Boolean)
  const nomeAuto = preenchidos.join(' / ')
  const pronto = preenchidos.length > 0
  const adicionar = async () => {
    if (!pronto || ocupado) return
    setOcupado(true)
    if (await gravar([{ nome: nome.trim() || nomeAuto, atletas: preenchidos }])) {
      setAtletas(vazio())
      setNome('')
      campos.current[0]?.focus()
    }
    setOcupado(false)
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); adicionar() }} className="space-y-2">
      <div className={cx('grid gap-2', porTime === 2 ? 'grid-cols-2' : 'grid-cols-2')}>
        {atletas.map((a, i) => (
          <label key={i} className="relative block">
            <span className="placar pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-mar">{i + 1}</span>
            <input
              ref={(el) => { campos.current[i] = el }}
              className={cx(entrada, 'pl-8')}
              value={a}
              placeholder={`Atleta ${i + 1}`}
              autoCapitalize="words"
              enterKeyHint={i === porTime - 1 ? 'done' : 'next'}
              onChange={(e) => setAtletas(atletas.map((x, k) => (k === i ? e.target.value : x)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && i < porTime - 1) {
                  e.preventDefault()
                  campos.current[i + 1]?.focus()
                }
              }}
            />
          </label>
        ))}
      </div>
      <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={nomeAuto ? `Nome do time (fica "${nomeAuto}")` : 'Nome do time (opcional)'} />
      <Botao className="w-full" disabled={!pronto || ocupado}>
        <Plus size={18} /> {pronto ? `Adicionar ${nome.trim() || nomeAuto}` : 'Adicionar time'}
      </Botao>
    </form>
  )
}

function ColarLista({ porTime, tipo, gravar }: { porTime: number; tipo: Categoria['tipo']; gravar: (t: { nome: string; atletas: string[] }[]) => Promise<boolean> }) {
  const [texto, setTexto] = useState('')
  const lidos = lerTimes(texto)
  const errados = lidos.filter((t) => t.atletas.length !== porTime).length
  return (
    <div className="space-y-2">
      <p className="text-sm text-cinza">
        Cole do WhatsApp ou da planilha, um time por linha. Separe os atletas com "/", vírgula ou "e".
        {tipo === 'quarteto' && ' Para dar nome ao time, escreva antes de dois-pontos.'}
      </p>
      <textarea
        className={cx(entrada, 'h-36 py-2 leading-relaxed')}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={tipo === 'dupla' ? 'João / Pedro\nAna e Bia\nCarlos, Diego' : 'Os Brabos: Ana, Bia, Cris, Duda\nTime Sol: Edu, Fábio, Gui, Hugo'}
      />
      {lidos.length > 0 && (
        <div className="space-y-1.5">
          {lidos.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-xl bg-areia px-3 py-2 text-sm">
              <b className="mr-1">{t.nome}</b>
              {t.atletas.map((a, k) => <span key={k} className="rounded-md bg-cartao px-2 py-0.5">{a}</span>)}
              {t.atletas.length !== porTime && <span className="font-semibold text-vivo">{t.atletas.length} de {porTime} atletas</span>}
            </div>
          ))}
        </div>
      )}
      {errados > 0 && <p className="text-sm text-vivo">{errados === 1 ? '1 time está' : `${errados} times estão`} com número de atletas diferente. Dá para adicionar assim e corrigir depois.</p>}
      <Botao className="w-full" disabled={!lidos.length} onClick={async () => { if (await gravar(lidos)) setTexto('') }}>
        <Plus size={18} /> Adicionar {lidos.length > 0 && (lidos.length === 1 ? '1 time' : `${lidos.length} times`)}
      </Botao>
    </div>
  )
}

function FormTime({ time, atletas, fechar, depois }: { time: Time; atletas: Atleta[]; fechar: () => void; depois: () => Promise<void> }) {
  const [nome, setNome] = useState(time.nome)
  const [lista, setLista] = useState(atletas.map((a) => ({ id: a.id as string | undefined, nome: a.nome })))
  const salvar = async () => {
    const ops: unknown[] = [{ op: 'salvar', tabela: 'times', dados: { id: time.id, nome: nome.trim() } }]
    lista.forEach((a, i) => {
      if (a.nome.trim()) ops.push({ op: 'salvar', tabela: 'atletas', dados: { ...(a.id ? { id: a.id } : { time_id: time.id }), nome: a.nome.trim(), ordem: i } })
      else if (a.id) ops.push({ op: 'apagar', tabela: 'atletas', id: a.id })
    })
    if (await tentar(() => admin.lote(ops), 'Time salvo')) { await depois(); fechar() }
  }
  const apagar = async () => {
    if (!confirmar(`Apagar ${time.nome}?`)) return
    if (await tentar(() => admin.apagar('times', time.id), 'Time apagado')) { await depois(); fechar() }
  }
  return (
    <Folha aberta fechar={fechar} titulo="Editar time">
      <div className="space-y-3">
        <Campo rotulo="Nome do time"><input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
        <div className="space-y-2">
          <span className="block text-sm font-semibold">Atletas</span>
          {lista.map((a, i) => (
            <input key={i} className={entrada} value={a.nome} placeholder="Nome (vazio apaga)"
              onChange={(e) => setLista(lista.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)))} />
          ))}
          <Botao variante="secundario" className="w-full" onClick={() => setLista([...lista, { id: undefined, nome: '' }])}><Plus size={16} /> Atleta</Botao>
        </div>
        <Botao grande className="w-full" onClick={salvar} disabled={!nome.trim()}>Salvar</Botao>
        <Botao variante="fantasma" className="w-full text-vivo" onClick={apagar}><Trash2 size={16} /> Apagar time</Botao>
      </div>
    </Folha>
  )
}

// ---------- grupos e chave ----------

function Montagem({ tudo, recarregar, cat }: P) {
  const times = tudo.times.filter((t) => t.categoria_id === cat.id)
  const jogos = tudo.jogos.filter((j) => j.categoria_id === cat.id)
  const grupos = gruposDa(times)
  const [nGrupos, setNGrupos] = useState(Math.max(grupos.length, Math.max(1, Math.round(times.length / 4))))
  const letras = Array.from({ length: nGrupos }, (_, i) => String.fromCharCode(65 + i))
  const jogosGrupo = jogos.filter((j) => j.fase === 'grupo')
  const jogosMata = jogos.filter((j) => j.fase !== 'grupo')
  const comecou = (js: Jogo[]) => js.some((j) => j.status !== 'agendado')

  const mudarGrupo = (t: Time, g: string) => tentar(async () => {
    await admin.salvar('times', { id: t.id, grupo: g || null })
    await recarregar()
  })

  const sortear = async () => {
    if (jogosGrupo.length && !confirmar('Sortear de novo muda os grupos. Os jogos dos grupos precisam ser gerados de novo. Continuar?')) return
    const embaralhados = [...times].sort(() => Math.random() - 0.5)
    const ops = embaralhados.map((t, i) => ({ op: 'salvar', tabela: 'times', dados: { id: t.id, grupo: letras[i % nGrupos] } }))
    if (await tentar(() => admin.lote(ops), 'Grupos sorteados')) await recarregar()
  }

  const gerarGrupos = async () => {
    if (comecou(jogosGrupo)) return aviso('Já tem jogo de grupo começado. Apague os jogos na aba Jogos se quiser refazer.', true)
    if (jogosGrupo.length && !confirmar('Isso troca os jogos dos grupos que já existem. Continuar?')) return
    const novos = jogosDosGrupos(cat, times)
    const ops = [
      ...jogosGrupo.map((j) => ({ op: 'apagar', tabela: 'jogos', id: j.id })),
      ...novos.map((dados) => ({ op: 'salvar', tabela: 'jogos', dados })),
    ]
    if (await tentar(() => admin.lote(ops), `${novos.length} jogos criados`)) await recarregar()
  }

  const gerarChave = async () => {
    if (comecou(jogosMata)) return aviso('O mata-mata já começou. Apague os jogos na aba Jogos se quiser refazer.', true)
    if (jogosMata.length && !confirmar('Isso troca a chave que já existe. Continuar?')) return
    const sementes = cat.formato === 'mata'
      ? [...times].sort((x, y) => (x.semente ?? 99) - (y.semente ?? 99)).map((t) => t.id)
      : origensDosGrupos(grupos, cat.mata)
    if (sementes.length < 2) return aviso('Precisa de pelo menos 2 classificados.', true)
    const novos = montarChave(cat, sementes, cat.mata.terceiro)
    const base = jogos.reduce((m, j) => Math.max(m, j.ordem), 0)
    const ops = [
      ...jogosMata.map((j) => ({ op: 'apagar', tabela: 'jogos', id: j.id })),
      // folga não tem jogo de verdade: entra mas o público só vê "avança direto"
      ...novos.map((dados) => ({ op: 'salvar', tabela: 'jogos', dados: { ...dados, ordem: dados.ordem, rodada: (dados.rodada ?? 1) + base } })),
    ]
    if (await tentar(() => admin.lote(ops), 'Chave montada')) await recarregar()
  }

  const primeira = jogosMata.filter((j) => !j.origem_a?.startsWith('V:') && !j.origem_a?.startsWith('P:'))
  const opcoesOrigem = cat.formato === 'mata'
    ? times.map((t) => [t.id, t.nome] as [string, string])
    : origensDosGrupos(grupos, { ...cat.mata, extras: cat.mata.extras + 4, por_grupo: cat.mata.por_grupo + 1 }).map((o) => [o, rotuloOrigem(o, jogos)] as [string, string])
  const mudarOrigem = (j: Jogo, lado: 'origem_a' | 'origem_b', v: string) => tentar(async () => {
    await admin.salvar('jogos', { id: j.id, [lado]: v })
    await recarregar()
  })

  return (
    <div className="space-y-5">
      {cat.formato !== 'mata' && (
        <section className="space-y-3 rounded-2xl bg-cartao p-4">
          <h2 className="font-bold">1. Grupos</h2>
          <div className="flex items-end gap-2">
            <Campo rotulo="Quantos grupos">
              <input type="number" min={1} max={16} className={cx(entrada, 'w-24')} value={nGrupos} onChange={(e) => setNGrupos(Math.max(1, Number(e.target.value)))} />
            </Campo>
            <Botao variante="secundario" onClick={sortear} disabled={!times.length}><Shuffle size={16} /> Sortear</Botao>
          </div>
          <p className="text-sm text-cinza">Ou escolha o grupo de cada time:</p>
          <div className="space-y-1.5">
            {times.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.nome}</span>
                <select className={cx(entrada, 'h-9 w-24')} value={t.grupo ?? ''} onChange={(e) => mudarGrupo(t, e.target.value)}>
                  <option value="">–</option>
                  {letras.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <Botao className="w-full" onClick={gerarGrupos} disabled={!grupos.length}>
            {jogosGrupo.length ? 'Gerar de novo os jogos dos grupos' : 'Gerar jogos dos grupos'}
          </Botao>
          {jogosGrupo.length > 0 && <p className="text-sm text-cinza">{jogosGrupo.length} jogos de grupo. Todos contra todos dentro de cada grupo.</p>}
        </section>
      )}

      {cat.formato !== 'grupos' && (
        <section className="space-y-3 rounded-2xl bg-cartao p-4">
          <h2 className="font-bold">{cat.formato === 'mata' ? 'Chave' : '2. Mata-mata'}</h2>
          <p className="text-sm text-cinza">
            {cat.formato === 'mata'
              ? 'Os times entram na ordem cadastrada (1º contra o último). Folgas vão para os primeiros.'
              : `Passam ${cat.mata.por_grupo} por grupo${cat.mata.extras ? ` + ${cat.mata.extras} melhores ${cat.mata.por_grupo + 1}º` : ''}. A chave se preenche sozinha quando os grupos terminam.`}
          </p>
          <Botao className="w-full" onClick={gerarChave} disabled={cat.formato === 'mata' ? times.length < 2 : !grupos.length}>
            {jogosMata.length ? 'Montar a chave de novo' : 'Montar a chave'}
          </Botao>
          {primeira.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Confrontos da 1ª rodada (dá para trocar):</p>
              {primeira.sort((x, y) => faseIdx(x.fase) - faseIdx(y.fase) || x.ordem - y.ordem).map((j) => (
                <div key={j.id} className="rounded-xl bg-areia p-2">
                  <div className="mb-1 px-1 text-xs font-semibold text-cinza">{NOME_FASE[j.fase]} {j.ordem}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['origem_a', 'origem_b'] as const).map((lado) => (
                      <select key={lado} className={cx(entrada, 'h-10 text-sm')} value={j[lado] ?? ''} onChange={(e) => mudarOrigem(j, lado, e.target.value)}>
                        <option value="BYE">Folga</option>
                        {opcoesOrigem.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                      </select>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {grupos.length > 0 && cat.formato !== 'mata' && (
        <section>
          <h2 className="mb-2 px-1 text-[15px] font-bold text-tinta">Classificação agora</h2>
          <Tabela base={tudo} cat={cat} />
        </section>
      )}
    </div>
  )
}

// ---------- jogos ----------

function Jogos({ tudo, recarregar, cat }: P) {
  const [editando, setEditando] = useState<Jogo | null>(null)
  const [distribuir, setDistribuir] = useState(false)
  const jogos = tudo.jogos
    .filter((j) => j.categoria_id === cat.id && !ehFolga(j))
    .sort((x, y) => faseIdx(x.fase) - faseIdx(y.fase) || x.rodada - y.rodada || x.ordem - y.ordem)
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Botao variante="secundario" className="flex-1" onClick={() => setDistribuir(true)} disabled={!jogos.length}>Distribuir horários e quadras</Botao>
        <Botao variante="secundario" onClick={() => window.open(`/marcador/${tudo.camp.id}`, '_blank')}>Marcador</Botao>
      </div>
      {!jogos.length && <Vazio>Gere os jogos em "Grupos e chave".</Vazio>}
      {jogos.map((j) => (
        <div key={j.id} className="relative">
          <CartaoJogo jogo={j} base={tudo} />
          <button onClick={() => setEditando(j)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-areia" aria-label="Editar jogo">
            <Pencil size={14} />
          </button>
        </div>
      ))}
      {editando && <FormJogo jogo={editando} tudo={tudo} fechar={() => setEditando(null)} depois={recarregar} />}
      {distribuir && <Distribuir jogos={jogos} fechar={() => setDistribuir(false)} depois={recarregar} />}
    </div>
  )
}

const paraLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function FormJogo({ jogo, tudo, fechar, depois }: { jogo: Jogo; tudo: Tudo; fechar: () => void; depois: () => Promise<void> }) {
  const { cat, a, b } = ladosDoJogo(jogo, tudo)
  const r = regrasDoJogo(cat, jogo.fase)
  const [quadra, setQuadra] = useState(jogo.quadra ?? '')
  const [horario, setHorario] = useState(paraLocal(jogo.horario))
  const [sets, setSets] = useState<[string, string][]>(() => {
    const s = jogo.sets.map(([x, y]) => [String(x), String(y)] as [string, string])
    while (s.length < r.sets) s.push(['', ''])
    return s
  })
  const salvar = async () => {
    if (await tentar(() => admin.salvar('jogos', { id: jogo.id, quadra: quadra || null, horario: horario ? new Date(horario).toISOString() : null }), 'Jogo salvo')) {
      await depois()
      fechar()
    }
  }
  const salvarPlacar = async () => {
    const lista = sets.filter(([x, y]) => x !== '' && y !== '').map(([x, y]) => [Number(x), Number(y)])
    if (lista.length && jogo.status !== 'encerrado' && !confirmar('Lançar este placar à mão e encerrar o jogo? Os pontos marcados no marcador serão apagados.')) return
    const ok = await tentar(async () => {
      if (jogo.fase !== 'grupo' && a && b) await admin.salvar('jogos', { id: jogo.id, time_a: a.id, time_b: b.id })
      await rpc('admin_placar', { p_senha: senha.admin(), p_jogo: jogo.id, p_sets: lista, p_status: lista.length ? 'encerrado' : 'agendado' })
    }, 'Placar salvo')
    if (ok) { await depois(); fechar() }
  }
  const apagar = async () => {
    if (!confirmar('Apagar este jogo?')) return
    if (await tentar(() => admin.apagar('jogos', jogo.id), 'Jogo apagado')) { await depois(); fechar() }
  }
  return (
    <Folha aberta fechar={fechar} titulo={`${nomeDaFase(jogo)}: ${a?.nome ?? '?'} × ${b?.nome ?? '?'}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Quadra"><input className={entrada} value={quadra} onChange={(e) => setQuadra(e.target.value)} placeholder="1" /></Campo>
          <Campo rotulo="Horário"><input type="datetime-local" className={entrada} value={horario} onChange={(e) => setHorario(e.target.value)} /></Campo>
        </div>
        <Botao className="w-full" onClick={salvar}>Salvar quadra e horário</Botao>

        <div className="rounded-2xl bg-cartao p-3">
          <h3 className="mb-1 font-bold">Placar à mão</h3>
          <p className="mb-3 text-sm text-cinza">Para jogo marcado no papel. Deixe em branco os sets que não houve.</p>
          {sets.map(([x, y], i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <span className="w-14 text-sm text-cinza">{i + 1}º set</span>
              <input inputMode="numeric" className={cx(entrada, 'h-10 text-center')} value={x} onChange={(e) => setSets(sets.map((s, k) => (k === i ? [e.target.value, s[1]] : s)))} placeholder={a?.nome?.slice(0, 10)} />
              <span className="text-cinza">×</span>
              <input inputMode="numeric" className={cx(entrada, 'h-10 text-center')} value={y} onChange={(e) => setSets(sets.map((s, k) => (k === i ? [s[0], e.target.value] : s)))} placeholder={b?.nome?.slice(0, 10)} />
            </div>
          ))}
          <Botao variante="secundario" className="w-full" onClick={salvarPlacar} disabled={!a || !b}>Salvar placar</Botao>
        </div>
        <Botao variante="secundario" className="w-full" onClick={() => window.open(`/marcador/${tudo.camp.id}/jogo/${jogo.id}`, '_blank')}>Abrir no marcador</Botao>
        <Botao variante="fantasma" className="w-full text-vivo" onClick={apagar}><Trash2 size={16} /> Apagar jogo</Botao>
      </div>
    </Folha>
  )
}

function Distribuir({ jogos, fechar, depois }: { jogos: Jogo[]; fechar: () => void; depois: () => Promise<void> }) {
  const [inicio, setInicio] = useState(() => paraLocal(new Date(new Date().setHours(8, 0, 0, 0)).toISOString()))
  const [minutos, setMinutos] = useState(40)
  const [quadras, setQuadras] = useState('1, 2')
  const [soSem, setSoSem] = useState(false)
  const alvo = jogos.filter((j) => j.status === 'agendado' && (!soSem || !j.horario))
  const aplicar = async () => {
    const lista = quadras.split(',').map((q) => q.trim()).filter(Boolean)
    const plano = distribuirHorarios(alvo, new Date(inicio), minutos, lista.length ? lista : ['1'])
    const ops = plano.map((p) => ({ op: 'salvar', tabela: 'jogos', dados: p }))
    if (await tentar(() => admin.lote(ops), `${plano.length} jogos programados`)) { await depois(); fechar() }
  }
  return (
    <Folha aberta fechar={fechar} titulo="Distribuir horários">
      <div className="space-y-3">
        <p className="text-sm text-cinza">Coloca os jogos que ainda não começaram em sequência, rodando pelas quadras. Depois dá para ajustar um por um.</p>
        <Campo rotulo="Primeiro jogo"><input type="datetime-local" className={entrada} value={inicio} onChange={(e) => setInicio(e.target.value)} /></Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Minutos por jogo"><input type="number" className={entrada} value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} /></Campo>
          <Campo rotulo="Quadras" dica="separadas por vírgula"><input className={entrada} value={quadras} onChange={(e) => setQuadras(e.target.value)} /></Campo>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="h-5 w-5" checked={soSem} onChange={(e) => setSoSem(e.target.checked)} /> Só os jogos sem horário
        </label>
        <Botao grande className="w-full" onClick={aplicar} disabled={!alvo.length || !inicio}>Programar {alvo.length} jogos</Botao>
      </div>
    </Folha>
  )
}

// ---------- ajustes ----------

function Ajustes({ tudo, recarregar }: Omit<P, 'cat'> & { cat?: Categoria }) {
  const c = tudo.camp
  const [, navegar] = useLocation()
  const [f, setF] = useState({ nome: c.nome, slug: c.slug, local: c.local ?? '', data_inicio: c.data_inicio ?? '', data_fim: c.data_fim ?? '', descricao: c.descricao ?? '', publicado: c.publicado })
  const [marcador, setMarcador] = useState('')
  const [temSenha, setTemSenha] = useState<boolean | null>(null)
  const [nova, setNova] = useState('')
  useEffect(() => {
    rpc<boolean>('admin_tem_senha_marcador', { p_senha: senha.admin(), p_campeonato: c.id }).then(setTemSenha).catch(() => {})
  }, [c.id])
  const salvar = async () => {
    const ok = await tentar(() => admin.salvar('campeonatos', {
      id: c.id, nome: f.nome.trim(), slug: slugDe(f.slug), local: f.local || null, data_inicio: f.data_inicio || null,
      data_fim: f.data_fim || null, descricao: f.descricao || null, publicado: f.publicado,
    }), 'Dados salvos')
    if (ok) await recarregar()
  }
  const url = (p: string) => `${location.origin}${p}`
  return (
    <div className="space-y-4">
      <AdminDivulgar tudo={tudo} />
      <AdminPatrocinadores tudo={tudo} recarregar={recarregar} />

      <section className="space-y-3 rounded-2xl bg-cartao p-4">
        <h2 className="font-bold">Senha do marcador</h2>
        <p className="text-sm text-cinza">{temSenha ? 'Já tem senha. Digite uma nova para trocar.' : temSenha === false ? 'Ainda sem senha: só o administrador consegue marcar.' : ''}</p>
        <div className="flex gap-2">
          <input className={entrada} value={marcador} onChange={(e) => setMarcador(e.target.value)} placeholder="nova senha" />
          <Botao disabled={marcador.length < 4} onClick={async () => {
            if (await tentar(() => rpc('admin_senha_marcador', { p_senha: senha.admin(), p_campeonato: c.id, p_nova: marcador }), 'Senha do marcador salva')) {
              setMarcador('')
              setTemSenha(true)
            }
          }}>Salvar</Botao>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-cartao p-4">
        <h2 className="font-bold">Dados do campeonato</h2>
        <Campo rotulo="Nome"><input className={entrada} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Campo>
        <Campo rotulo="Endereço do link" dica={url(`/c/${slugDe(f.slug)}`)}><input className={entrada} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Campo>
        <Campo rotulo="Local"><input className={entrada} value={f.local} onChange={(e) => setF({ ...f, local: e.target.value })} /></Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Começa"><input type="date" className={entrada} value={f.data_inicio} onChange={(e) => setF({ ...f, data_inicio: e.target.value })} /></Campo>
          <Campo rotulo="Termina"><input type="date" className={entrada} value={f.data_fim} onChange={(e) => setF({ ...f, data_fim: e.target.value })} /></Campo>
        </div>
        <Campo rotulo="Recado para o público"><textarea className={cx(entrada, 'h-20 py-2')} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Campo>
        <label className="flex items-center gap-3 font-medium">
          <input type="checkbox" className="h-5 w-5" checked={f.publicado} onChange={(e) => setF({ ...f, publicado: e.target.checked })} /> Aparece para o público
        </label>
        <Botao className="w-full" onClick={salvar}>Salvar</Botao>
      </section>

      <section className="space-y-3 rounded-2xl bg-cartao p-4">
        <h2 className="font-bold">Senha do administrador</h2>
        <p className="text-sm text-cinza">Vale para todos os campeonatos.</p>
        <div className="flex gap-2">
          <input type="password" className={entrada} value={nova} onChange={(e) => setNova(e.target.value)} placeholder="nova senha (mín. 6)" />
          <Botao disabled={nova.length < 6} onClick={async () => {
            if (await tentar(() => rpc('admin_trocar_senha', { p_senha: senha.admin(), p_nova: nova }), 'Senha trocada')) {
              senha.guardar('admin', nova)
              setNova('')
            }
          }}>Trocar</Botao>
        </div>
      </section>

      <Botao variante="fantasma" className="w-full text-vivo" onClick={async () => {
        if (!confirmar(`Apagar ${c.nome} com tudo dentro? Não dá para desfazer.`)) return
        if (await tentar(() => admin.apagar('campeonatos', c.id), 'Campeonato apagado')) navegar('/admin')
      }}><Trash2 size={16} /> Apagar campeonato</Botao>
    </div>
  )
}
