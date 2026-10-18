import { Link } from 'wouter'
import {
  NOME_FASE, calcularPlacar, ehFolga, regrasDoJogo, rotuloOrigem, timesDoJogo,
  type Atleta, type Categoria, type Jogo, type Lado, type Time,
} from '../lib/motor'
import { cx } from './ui'

export interface Base {
  categorias: Categoria[]
  times: Time[]
  atletas: Atleta[]
  jogos: Jogo[]
}

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export function hora(iso: string | null, comDia = true) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return comDia ? `${SEMANA[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} · ${h}` : h
}

export function dataCurta(iso: string | null) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export function nomeDaFase(j: Jogo) {
  return j.fase === 'grupo' ? `Grupo ${j.grupo}` : NOME_FASE[j.fase] + (j.fase === 'final' || j.fase === 'terceiro' ? '' : ` ${j.ordem}`)
}

// os dois times de um jogo, já resolvidos pela chave
export function ladosDoJogo(j: Jogo, base: Base) {
  const cat = base.categorias.find((c) => c.id === j.categoria_id)!
  const ctx = { cat, times: base.times.filter((t) => t.categoria_id === cat.id), jogos: base.jogos.filter((x) => x.categoria_id === cat.id) }
  const [a, b] = timesDoJogo(j, ctx)
  const time = (id: string | null) => base.times.find((t) => t.id === id)
  return {
    cat,
    a: time(a),
    b: time(b),
    rotuloA: a ? '' : rotuloOrigem(j.origem_a, ctx.jogos),
    rotuloB: b ? '' : rotuloOrigem(j.origem_b, ctx.jogos),
  }
}

export function CartaoJogo({ jogo, base, href, mostrarCategoria }: { jogo: Jogo; base: Base; href?: string; mostrarCategoria?: boolean }) {
  const { cat, a, b, rotuloA, rotuloB } = ladosDoJogo(jogo, base)
  const r = regrasDoJogo(cat, jogo.fase)
  const p = calcularPlacar(r, jogo.sets)
  const vivo = jogo.status === 'ao_vivo'
  const fim = jogo.status === 'encerrado'
  const folga = ehFolga(jogo)

  const linha = (lado: Lado) => {
    const t = lado === 'a' ? a : b
    const rot = lado === 'a' ? rotuloA : rotuloB
    const venceu = jogo.vencedor === lado && fim
    const perdeu = jogo.vencedor && jogo.vencedor !== lado && fim
    const atletas = t ? base.atletas.filter((x) => x.time_id === t.id) : []
    return (
      <div className="flex items-center gap-3">
        <div className={cx('min-w-0 flex-1', perdeu && 'opacity-55')}>
          <div className={cx('truncate font-semibold leading-tight', !t && 'font-normal italic text-cinza')}>{t?.nome ?? rot}</div>
          {t && atletas.length > 0 && !t.nome.includes('/') && (
            <div className="truncate text-xs text-cinza">{atletas.map((x) => x.nome).join(' · ')}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {jogo.sets.map((s, i) => {
            const atual = vivo && i === jogo.sets.length - 1
            return (
              <span
                key={i}
                className={cx(
                  'placar w-7 text-center text-lg',
                  atual ? 'text-tinta' : 'text-cinza',
                  !atual && s[lado === 'a' ? 0 : 1] > s[lado === 'a' ? 1 : 0] && 'text-tinta',
                )}
              >
                {s[lado === 'a' ? 0 : 1]}
              </span>
            )
          })}
          <span
            className={cx(
              'placar ml-1 grid h-9 w-9 place-items-center rounded-lg text-2xl',
              venceu ? 'bg-sol text-tinta' : vivo ? 'bg-tinta text-white' : 'bg-areia text-cinza',
            )}
          >
            {jogo.status === 'agendado' ? '–' : lado === 'a' ? p.setsA : p.setsB}
          </span>
        </div>
      </div>
    )
  }

  const dia = jogo.horario ? new Date(jogo.horario) : null
  const corpo = (
    <div className={cx('flex overflow-hidden rounded-2xl bg-cartao', href && 'transition active:scale-[0.99]')}>
      {/* coluna da hora: ao vivo, encerrado ou horário */}
      <div className={cx('flex w-[4.25rem] shrink-0 flex-col items-center justify-center gap-0.5 px-1 py-3 text-center',
        vivo ? 'bg-vivo text-white' : fim ? 'bg-areia text-cinza' : 'bg-mar-claro text-mar')}>
        {vivo ? (
          <>
            <span className="pulso h-2 w-2 rounded-full bg-white" />
            <span className="text-xs font-bold">Ao vivo</span>
            <span className="text-[11px] opacity-80">{p.setAtual}º set</span>
          </>
        ) : fim ? (
          <span className="text-xs font-semibold">{jogo.wo ? 'W.O.' : 'Fim'}</span>
        ) : dia ? (
          <>
            <span className="placar text-xl">{hora(jogo.horario, false)}</span>
            <span className="text-[11px] font-medium opacity-80">{SEMANA[dia.getDay()].toLowerCase()} {dia.getDate()}/{dia.getMonth() + 1}</span>
          </>
        ) : (
          <span className="text-xs">a definir</span>
        )}
        {jogo.quadra && <span className={cx('mt-1 rounded px-1.5 text-[11px] font-bold', vivo ? 'bg-white/20' : 'bg-cartao')}>Q{jogo.quadra}</span>}
      </div>
      <div className="min-w-0 flex-1 p-3">
        <div className="mb-2 truncate text-xs text-cinza">
          {mostrarCategoria ? `${cat.nome}, ${nomeDaFase(jogo).charAt(0).toLowerCase()}${nomeDaFase(jogo).slice(1)}` : nomeDaFase(jogo)}
        </div>
        {folga ? (
          <div className="text-sm text-cinza">{jogo.origem_a === 'BYE' ? (b?.nome ?? rotuloB) : (a?.nome ?? rotuloA)} avança direto</div>
        ) : (
          <div className="space-y-2">
            {linha('a')}
            {linha('b')}
          </div>
        )}
      </div>
    </div>
  )
  return href && !folga ? <Link href={href}>{corpo}</Link> : corpo
}
