import { Share2 } from 'lucide-react'
import type { Tema } from '.'

// Torneio de Vôlei da Arena Vixe (Turma do Fer). Visual tirado do cartaz oficial:
// azul-noite, amarelo e verde de pinceladas, título itálico e o escudo da arena.
const NOITE = '#0b1626'
const AMARELO = '#f7c815'
const VERDE = '#1f9d4d'

function Pincelada({ cor, className }: { cor: string; className: string }) {
  return (
    <svg viewBox="0 0 400 60" preserveAspectRatio="none" className={className} aria-hidden>
      <path fill={cor} d="M6 34 C 40 14, 120 8, 210 12 S 360 6, 396 18 L 392 30 C 330 40, 250 34, 180 44 S 60 56, 10 50 Z" />
      <path fill={cor} opacity=".55" d="M30 52 C 120 46, 220 50, 330 42 L 326 48 C 230 58, 120 58, 34 58 Z" />
    </svg>
  )
}

export const vixe: Tema = {
  cores: {
    tinta: NOITE,
    mar: VERDE,
    'mar-escuro': '#146b34',
    'mar-claro': '#e2f4e8',
    sol: AMARELO,
    'sol-claro': '#fff4c4',
    areia: '#eef1f5',
  },
  logo: '/torneios/arena-vixe-escudo.png',
  cartaz: '/torneios/arena-vixe-cartaz.jpg',
  arte: { fundo: NOITE, destaque: AMARELO },
  Topo: ({ camp, categorias, compartilhar }) => (
    <header className="relative overflow-hidden px-5 pb-7 pt-6 text-white" style={{ background: NOITE }}>
      {/* pinceladas do cartaz */}
      <Pincelada cor={VERDE} className="vixe-varre absolute -left-16 top-6 h-16 w-72 -rotate-[24deg]" />
      <Pincelada cor={AMARELO} className="vixe-varre absolute -right-24 top-[19.5rem] h-12 w-80 -rotate-[14deg] [animation-delay:120ms]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />

      <div className="relative flex flex-col items-center text-center">
        <img src="/torneios/arena-vixe-escudo.png" alt="Arena Vixe" className="vixe-escudo h-36 w-36 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,.5)]" />
        <h1 className="vixe-titulo mt-2 italic [text-shadow:0_4px_18px_rgba(0,0,0,.45)]" style={{ fontStretch: '70%' }}>
          <span className="block text-[2.6rem] font-extrabold leading-none">Torneio de</span>
          <span className="block pt-1 text-[5.2rem] font-black leading-[0.95]" style={{ color: AMARELO }}>Vôlei</span>
        </h1>
        <p className="vixe-sobe mt-3 text-sm font-semibold text-white/80 [animation-delay:350ms]">Jogue, compita, viva essa energia</p>

        <div className="vixe-sobe mt-5 grid w-full grid-cols-2 overflow-hidden rounded-2xl bg-[#17243b] text-left [animation-delay:450ms]">
          <div className="border-r border-white/10 px-4 py-3">
            <div className="text-xs text-white/60">Quando</div>
            <div className="estreito text-lg font-extrabold leading-tight">{camp.data_inicio ? diaPorExtenso(camp.data_inicio) : 'Data a definir'}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-white/60">Começa</div>
            <div className="estreito text-lg font-extrabold leading-tight">{camp.horario ?? 'a confirmar'}</div>
          </div>
        </div>

        <div className="vixe-sobe mt-3 flex w-full flex-col gap-2 [animation-delay:550ms]">
          {categorias.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border-2 bg-[#0b1626] px-4 py-2.5 text-left" style={{ borderColor: i % 2 ? AMARELO : VERDE }}>
              <span className="estreito flex-1 text-lg font-extrabold italic leading-none">{c.nome}</span>
              <span className="text-xs text-white/60">quartetos</span>
            </div>
          ))}
        </div>

        {camp.inscricao && (
          <p className="vixe-sobe mt-4 text-sm text-white/80 [animation-delay:650ms]">
            <b className="text-white">Inscrição:</b> {camp.inscricao}
          </p>
        )}
        {camp.organizacao && <p className="vixe-sobe mt-1 text-sm text-white/60 [animation-delay:700ms]">{camp.organizacao}</p>}

        <button onClick={compartilhar} className="vixe-sobe mt-5 flex h-11 items-center gap-2 rounded-full px-5 text-sm font-extrabold text-[#0b1626] transition active:scale-95 [animation-delay:750ms]" style={{ background: AMARELO }}>
          <Share2 size={16} /> Compartilhar o torneio
        </button>
      </div>
    </header>
  ),
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
function diaPorExtenso(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  const data = new Date(a, m - 1, d)
  return `${DIAS[data.getDay()]}, ${d} de ${MESES[m - 1]}`
}
