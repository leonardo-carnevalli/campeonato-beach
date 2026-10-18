import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { ExternalLink, Plus } from 'lucide-react'
import { admin, rpc, senha } from '../lib/dados'
import type { Campeonato } from '../lib/motor'
import { Botao, Campo, Carregando, Folha, Topo, Vazio, aviso, entrada } from '../ui/ui'
import { dataCurta } from '../ui/jogo'
import { EntrarComSenha } from '../marcador/Marcador'

export function useAdmin() {
  const [ok, setOk] = useState(() => !!senha.admin())
  const entrar = async (s: string) => {
    const certo = await rpc<boolean>('admin_entrar', { p_senha: s })
    if (certo) {
      senha.guardar('admin', s)
      setOk(true)
    }
    return certo
  }
  return { ok, entrar }
}

export const slugDe = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

export function AdminInicio() {
  const { ok, entrar } = useAdmin()
  const [lista, setLista] = useState<Campeonato[] | null>(null)
  const [novo, setNovo] = useState(false)
  useEffect(() => {
    if (ok) rpc<Campeonato[]>('admin_campeonatos', { p_senha: senha.admin() }).then(setLista).catch((e) => aviso(e.message, true))
  }, [ok])
  if (!ok) return <EntrarComSenha titulo="Organização" sub="Área de quem organiza o campeonato. Digite a senha do administrador." voltar="/" entrar={entrar} />
  return (
    <div className="mx-auto max-w-3xl pb-16">
      <Topo
        titulo="Organização"
        sub="Campeonatos"
        voltar="/"
        direita={<button className="text-sm text-cinza" onClick={() => { senha.sair('admin'); location.reload() }}>Sair</button>}
      />
      <div className="space-y-2 p-3">
        <Botao className="w-full" onClick={() => setNovo(true)}><Plus size={18} /> Novo campeonato</Botao>
        {!lista ? <Carregando /> : lista.length === 0 ? <Vazio>Crie o primeiro campeonato.</Vazio> : lista.map((c) => (
          <Link key={c.id} href={`/admin/${c.id}`} className="block rounded-2xl bg-cartao p-4">
            <div className="font-bold">{c.nome}</div>
            <div className="text-sm text-cinza">
              {[c.local, c.data_inicio && dataCurta(c.data_inicio), !c.publicado && 'não publicado'].filter(Boolean).join(' · ')}
            </div>
          </Link>
        ))}
      </div>
      <NovoCampeonato aberto={novo} fechar={() => setNovo(false)} />
    </div>
  )
}

function NovoCampeonato({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const [, navegar] = useLocation()
  const [f, setF] = useState({ nome: '', local: '', data_inicio: '', data_fim: '', marcador: '' })
  const [ocupado, setOcupado] = useState(false)
  const criar = async () => {
    setOcupado(true)
    try {
      const c = await admin.salvar<Campeonato>('campeonatos', {
        nome: f.nome.trim(), slug: slugDe(f.nome) || 'campeonato', local: f.local || null,
        data_inicio: f.data_inicio || null, data_fim: f.data_fim || f.data_inicio || null,
      })
      if (f.marcador) await rpc('admin_senha_marcador', { p_senha: senha.admin(), p_campeonato: c.id, p_nova: f.marcador })
      navegar(`/admin/${c.id}`)
    } catch (e) {
      const m = (e as Error).message
      aviso(m.includes('slug') || m.includes('duplicate') ? 'Já existe um campeonato com esse nome.' : m, true)
    }
    setOcupado(false)
  }
  return (
    <Folha aberta={aberto} fechar={fechar} titulo="Novo campeonato">
      <div className="space-y-3">
        <Campo rotulo="Nome"><input className={entrada} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Copa Verão de Beach" /></Campo>
        <Campo rotulo="Local"><input className={entrada} value={f.local} onChange={(e) => setF({ ...f, local: e.target.value })} placeholder="Arena Praia" /></Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Começa"><input type="date" className={entrada} value={f.data_inicio} onChange={(e) => setF({ ...f, data_inicio: e.target.value })} /></Campo>
          <Campo rotulo="Termina"><input type="date" className={entrada} value={f.data_fim} onChange={(e) => setF({ ...f, data_fim: e.target.value })} /></Campo>
        </div>
        <Campo rotulo="Senha do marcador" dica="Quem marca os pontos usa essa senha. Dá para trocar depois.">
          <input className={entrada} value={f.marcador} onChange={(e) => setF({ ...f, marcador: e.target.value })} placeholder="mínimo 4 caracteres" />
        </Campo>
        <Botao grande className="w-full" disabled={!f.nome.trim() || ocupado || (!!f.marcador && f.marcador.length < 4)} onClick={criar}>
          Criar
        </Botao>
      </div>
    </Folha>
  )
}

export function LinkExterno({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-mar">
      {children} <ExternalLink size={14} />
    </a>
  )
}
