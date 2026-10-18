import { Link } from 'wouter'
import { cx } from './ui'

const WHATSAPP = 'https://wa.me/5514997463040?text=' + encodeURIComponent('Oi! Vi o sistema de campeonato e quero um site ou sistema assim.')
const INSTAGRAM = 'https://instagram.com/vetor_agencia'
const SITE = 'https://vetoragencia.com.br'

// assinatura da Vetor Agência no fim de toda página
export function CreditoVetor({ links = true, escuro }: { links?: boolean; escuro?: boolean }) {
  return (
    <footer className={cx('mt-16 border-t px-4 pb-10 pt-8', escuro ? 'border-white/10 text-white' : 'border-linha text-tinta')}>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <a href={SITE} target="_blank" rel="noreferrer" className="flex items-center gap-2.5">
          <img src="/vetor.svg" alt="" className="h-9 w-9" />
          <span className="text-left leading-tight">
            <span className={cx('block text-xs', escuro ? 'text-white/60' : 'text-cinza')}>Desenvolvido por</span>
            <span className="largo block text-base font-extrabold">Vetor Agência</span>
          </span>
        </a>
        <p className={cx('max-w-xs text-sm', escuro ? 'text-white/70' : 'text-cinza')}>Quer um site ou sistema como este para o seu negócio?</p>
        <div className="flex flex-wrap justify-center gap-2">
          <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex h-10 items-center rounded-full bg-[#3b6bff] px-4 text-sm font-bold text-white transition active:scale-95">
            Fale com a gente
          </a>
          <a href={INSTAGRAM} target="_blank" rel="noreferrer" className={cx('flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition active:scale-95', escuro ? 'border-white/20' : 'border-linha bg-cartao')}>
            @vetor_agencia
          </a>
        </div>
        {links && (
          <div className={cx('flex gap-4 text-xs', escuro ? 'text-white/50' : 'text-cinza')}>
            <Link href="/marcador">Área do marcador</Link>
            <Link href="/admin">Organização</Link>
          </div>
        )}
      </div>
    </footer>
  )
}

export function SeloVetor({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <img src="/vetor.svg" alt="" className="h-[1.4em] w-[1.4em]" />
      Desenvolvido por <b>Vetor Agência</b>
    </span>
  )
}
