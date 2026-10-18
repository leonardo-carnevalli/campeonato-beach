import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'wouter'
import { ChevronLeft, X } from 'lucide-react'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma'
export function Botao({
  variante = 'primario', grande, className, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grande?: boolean }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100',
        grande ? 'h-14 px-6 text-lg' : 'h-11 px-4',
        variante === 'primario' && 'bg-tinta text-white',
        variante === 'secundario' && 'border border-linha bg-cartao',
        variante === 'perigo' && 'bg-vivo text-white',
        variante === 'fantasma' && 'text-cinza',
        className,
      )}
    />
  )
}

export function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-cinza">{dica}</span>}
    </label>
  )
}

export const entrada =
  'h-12 w-full rounded-xl border border-linha bg-cartao px-3 outline-none focus:border-tinta disabled:opacity-50'

export function Topo({ titulo, sub, voltar, direita }: { titulo: string; sub?: string; voltar?: string; direita?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-linha bg-areia/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-3">
        {voltar && (
          <Link href={voltar} className="-ml-1 grid h-10 w-10 place-items-center rounded-full active:bg-linha" aria-label="Voltar">
            <ChevronLeft size={24} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{titulo}</h1>
          {sub && <p className="truncate text-xs text-cinza">{sub}</p>}
        </div>
        {direita}
      </div>
    </header>
  )
}

export function Abas<T extends string>({ abas, atual, mudar }: { abas: [T, string][]; atual: T; mudar: (a: T) => void }) {
  return (
    <div className="sem-barra -mx-3 flex gap-5 overflow-x-auto px-4">
      {abas.map(([id, nome]) => (
        <button
          key={id}
          onClick={() => mudar(id)}
          className={cx(
            'relative h-11 shrink-0 text-[15px] font-bold transition',
            'after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:transition',
            atual === id ? 'text-tinta after:bg-mar' : 'text-cinza after:bg-transparent',
          )}
        >
          {nome}
        </button>
      ))}
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-linha px-4 py-10 text-center text-cinza">{children}</div>
}

export function Carregando() {
  return <div className="py-20 text-center text-cinza">Carregando…</div>
}

export function Folha({ aberta, fechar, titulo, children }: { aberta: boolean; fechar: () => void; titulo: string; children: ReactNode }) {
  useEffect(() => {
    if (!aberta) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberta, fechar])
  if (!aberta) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 sm:items-center" onClick={fechar}>
      <div
        className="sobe max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-areia p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button onClick={fechar} className="grid h-9 w-9 place-items-center rounded-full bg-cartao" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// aviso curto no rodapé
let avisar: (t: string, erro?: boolean) => void = () => {}
export const aviso = (t: string, erro = false) => avisar(t, erro)
export function Avisos() {
  const [msg, setMsg] = useState<{ t: string; erro: boolean; k: number } | null>(null)
  useEffect(() => {
    avisar = (t, erro = false) => setMsg({ t, erro, k: Date.now() })
  }, [])
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), msg.erro ? 4500 : 1800)
    return () => clearTimeout(t)
  }, [msg])
  if (!msg) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
      <div key={msg.k} className={cx('sobe rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg', msg.erro ? 'bg-vivo' : 'bg-tinta')}>
        {msg.t}
      </div>
    </div>
  )
}

export function AoVivo({ pequeno }: { pequeno?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-bold uppercase tracking-wide text-vivo', pequeno ? 'text-[11px]' : 'text-xs')}>
      <span className="pulso h-2 w-2 rounded-full bg-vivo" />
      Ao vivo
    </span>
  )
}

export function confirmar(texto: string) {
  return window.confirm(texto)
}
