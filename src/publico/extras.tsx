import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import QRCode from 'qrcode'
import { Download, Share2, Star } from 'lucide-react'
import { useSeguidos } from '../lib/dados'
import { calcularPlacar, placarDoSetAtual, quadrasDoDia, regrasDoJogo, type Campeonato, type Jogo, type Patrocinador, type Time } from '../lib/motor'
import { Botao, Folha, aviso, cx } from '../ui/ui'
import { hora, ladosDoJogo, nomeDaFase, type Base } from '../ui/jogo'
import { temaDe } from '../temas'

export const linkPublico = (slug: string) => `${location.origin}/c/${slug}`

// ---------- QR Code ----------

export function useQr(texto: string, largura = 512) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    QRCode.toDataURL(texto, { margin: 1, width: largura, color: { dark: '#0a1a3f', light: '#ffffff' } }).then(setUrl)
  }, [texto, largura])
  return url
}

export function baixar(url: string, nome: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
}

export function imprimirCartaz(camp: Campeonato, qr: string) {
  const w = window.open('', '_blank')
  if (!w) return aviso('Libere as janelas pop-up para imprimir.', true)
  w.document.write(`<!doctype html><html><head><title>${camp.nome}</title><style>
    body{font-family:system-ui,sans-serif;text-align:center;color:#0a1a3f;margin:0;padding:48px}
    h1{font-size:44px;margin:0 0 8px} p{font-size:22px;margin:0 0 32px;color:#56627a}
    img{width:70%;max-width:520px} .u{font-size:20px;margin-top:24px;font-weight:600}
  </style></head><body><h1>${camp.nome}</h1><p>Resultados, tabela e chave ao vivo. Aponte a câmera do celular.</p>
  <img src="${qr}" onload="setTimeout(()=>print(),200)"><div class="u">${linkPublico(camp.slug).replace(/^https?:\/\//, '')}</div></body></html>`)
  w.document.close()
}

export function Compartilhar({ camp, aberta, fechar }: { camp: Campeonato; aberta: boolean; fechar: () => void }) {
  const url = linkPublico(camp.slug)
  const qr = useQr(url)
  const enviar = async () => {
    try {
      if (navigator.share) await navigator.share({ title: camp.nome, url })
      else {
        await navigator.clipboard.writeText(url)
        aviso('Link copiado')
      }
    } catch { /* cancelou */ }
  }
  return (
    <Folha aberta={aberta} fechar={fechar} titulo="Compartilhar">
      <div className="space-y-3 text-center">
        {qr && <img src={qr} alt="QR Code do campeonato" className="mx-auto w-56 rounded-2xl bg-white p-3" />}
        <p className="text-sm text-cinza">Aponte a câmera do celular para abrir o campeonato.</p>
        <div className="grid grid-cols-2 gap-2">
          <Botao onClick={enviar}><Share2 size={16} /> Mandar link</Botao>
          <Botao variante="secundario" onClick={() => baixar(qr, `qr-${camp.slug}.png`)}><Download size={16} /> Baixar QR</Botao>
        </div>
        <Botao variante="fantasma" className="w-full" onClick={() => imprimirCartaz(camp, qr)}>Imprimir cartaz com QR Code</Botao>
      </div>
    </Folha>
  )
}

// ---------- patrocinadores ----------

export function LogoPatrocinador({ p, className }: { p: Patrocinador; className?: string }) {
  return p.logo ? (
    <img src={p.logo} alt={p.nome} className={cx('object-contain', className)} />
  ) : (
    <span className={cx('grid place-items-center text-center font-bold', className)}>{p.nome}</span>
  )
}

export function Patrocinadores({ lista }: { lista: Patrocinador[] }) {
  if (!lista.length) return null
  return (
    <section className="mt-10">
      <h2 className="mb-3 px-1 text-[15px] font-bold">Patrocínio</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {lista.map((p) => {
          const corpo = <LogoPatrocinador p={p} className="h-14 w-full" />
          return (
            <div key={p.id} className="rounded-2xl bg-cartao p-3">
              {p.link ? <a href={p.link} target="_blank" rel="noreferrer">{corpo}</a> : corpo}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------- seguir ----------

export function BotaoSeguir({ time, pequeno }: { time?: Time; pequeno?: boolean }) {
  const { segue, alternar } = useSeguidos()
  if (!time) return null
  const sim = segue(time.id)
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        aviso(alternar(time.id) ? `Seguindo ${time.nome}. Os jogos aparecem no topo.` : `Deixou de seguir ${time.nome}`)
      }}
      className={cx('grid shrink-0 place-items-center rounded-full transition active:scale-90', pequeno ? 'h-8 w-8' : 'h-9 w-9 bg-areia')}
      aria-label={sim ? `Deixar de seguir ${time.nome}` : `Seguir ${time.nome}`}
      aria-pressed={sim}
    >
      <Star size={pequeno ? 16 : 18} className={sim ? 'fill-sol text-sol' : 'text-cinza'} strokeWidth={sim ? 1.5 : 2} />
    </button>
  )
}

// ---------- quadras ----------

export function Quadras({ base, slug }: { base: Base; slug: string }) {
  const quadras = quadrasDoDia(base.jogos).filter((q) => q.agora || q.proximo)
  if (!quadras.length) return null
  const nomes = (j: Jogo) => {
    const { a, b, rotuloA, rotuloB } = ladosDoJogo(j, base)
    return [a?.nome ?? rotuloA, b?.nome ?? rotuloB]
  }
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-[15px] font-bold">Nas quadras</h2>
      <div className="sem-barra -mx-3 flex snap-x gap-2 overflow-x-auto px-3">
        {quadras.map((q) => {
          const placar = q.agora && calcularPlacar(regrasDoJogo(ladosDoJogo(q.agora, base).cat, q.agora.fase), q.agora.sets)
          const atual = placar ? placarDoSetAtual(placar) : [0, 0]
          return (
            <div key={q.quadra} className="w-[17rem] shrink-0 snap-start overflow-hidden rounded-2xl bg-cartao">
              <div className="flex items-center justify-between bg-tinta px-3 py-2 text-white">
                <span className="largo font-extrabold">Quadra {q.quadra}</span>
                {q.agora ? <span className="flex items-center gap-1.5 text-xs font-bold"><span className="pulso h-2 w-2 rounded-full bg-vivo" />Ao vivo</span>
                  : <span className="text-xs text-white/70">Livre</span>}
              </div>
              {q.agora && placar && (
                <Link href={`/c/${slug}/jogo/${q.agora.id}`} className="block space-y-1 px-3 py-2.5">
                  {nomes(q.agora).map((n, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{n}</span>
                      <span className="text-xs text-cinza">{i === 0 ? placar.setsA : placar.setsB}</span>
                      <span className="placar w-8 text-right text-2xl">{atual[i]}</span>
                    </div>
                  ))}
                </Link>
              )}
              {q.proximo && (
                <Link href={`/c/${slug}/jogo/${q.proximo.id}`} className={cx('block px-3 py-2.5 text-sm', q.agora && 'border-t border-linha bg-areia/60')}>
                  <div className="mb-0.5 text-xs font-semibold text-mar">
                    Próximo{q.proximo.horario ? `, ${hora(q.proximo.horario, false)}` : ''}
                  </div>
                  <div className="truncate">{nomes(q.proximo).join(' x ')}</div>
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------- imagem para o Instagram ----------

const BOLA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="b"><circle cx="50" cy="50" r="48"/></clipPath></defs><g clip-path="url(#b)"><rect width="100" height="100" fill="#ffd21f"/><path d="M-10 30 C 25 10, 60 20, 110 -5 L 110 -20 L -10 -20 Z" fill="#fff"/><path d="M-10 52 C 30 30, 70 40, 110 18 L 110 0 C 60 22, 25 12, -10 32 Z" fill="#0b48c9"/><path d="M20 110 C 30 70, 55 50, 110 45 L 110 70 C 70 72, 45 85, 42 110 Z" fill="#fff"/><path d="M-10 70 C 5 60, 15 75, 20 110 L -10 110 Z" fill="#0b48c9"/></g><circle cx="50" cy="50" r="48" fill="none" stroke="#082f8a" stroke-width="2.5"/></svg>`

const carregarImg = (src: string) =>
  new Promise<HTMLImageElement | null>((ok) => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => ok(i)
    i.onerror = () => ok(null)
    i.src = src
  })

const FONTE = '"Archivo Variable", system-ui, sans-serif'

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const p of texto.split(' ')) {
    const t = atual ? `${atual} ${p}` : p
    if (ctx.measureText(t).width > largura && atual) {
      linhas.push(atual)
      atual = p
    } else atual = t
  }
  if (atual) linhas.push(atual)
  return linhas
}

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

type Arte =
  | { tipo: 'resultado'; jogo: Jogo }
  | { tipo: 'campeao'; time: Time; categoria: string }

// story 1080x1920 no azul da bola, com placar ou campeão e os patrocinadores
export async function gerarArte(camp: Campeonato, base: Base & { patrocinadores: Patrocinador[] }, arte: Arte): Promise<Blob> {
  await Promise.all([document.fonts.load(`800 80px ${FONTE}`), document.fonts.load(`600 40px ${FONTE}`)])
  const W = 1080
  const H = 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const estreito = (v: boolean) => {
    if ('fontStretch' in ctx) (ctx as unknown as { fontStretch: string }).fontStretch = v ? 'condensed' : 'normal'
  }

  const tema = temaDe(camp.slug)
  const destaque = tema?.arte?.destaque ?? '#ffd21f'
  ctx.fillStyle = tema?.arte?.fundo ?? '#0b48c9'
  ctx.fillRect(0, 0, W, H)
  if (tema?.logo) {
    const logo = await carregarImg(tema.logo)
    if (logo) ctx.drawImage(logo, W - 400, 60, 340, (340 * logo.height) / logo.width)
  } else {
    const bola = await carregarImg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(BOLA_SVG)}`)
    if (bola) ctx.drawImage(bola, W - 520, -180, 760, 760)
  }

  // nome do campeonato
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `800 86px ${FONTE}`
  const titulo = quebrar(ctx, camp.nome, tema?.logo ? 560 : 700)
  titulo.forEach((l, i) => ctx.fillText(l, 80, 220 + i * 96))
  let y = 220 + titulo.length * 96
  if (camp.local) {
    ctx.font = `600 40px ${FONTE}`
    ctx.fillStyle = 'rgba(255,255,255,.8)'
    ctx.fillText(camp.local, 80, y + 10)
    y += 60
  }

  // cartão central
  const topo = Math.max(y + 120, 720)
  ctx.fillStyle = '#ffffff'
  retangulo(ctx, 60, topo, W - 120, 760, 48)

  if (arte.tipo === 'resultado') {
    const { jogo } = arte
    const { cat, a, b } = ladosDoJogo(jogo, base)
    const p = calcularPlacar(regrasDoJogo(cat, jogo.fase), jogo.sets)
    ctx.fillStyle = '#56627a'
    ctx.font = `600 36px ${FONTE}`
    ctx.fillText(`${cat.nome}, ${nomeDaFase(jogo).charAt(0).toLowerCase()}${nomeDaFase(jogo).slice(1)}`, 120, topo + 100)
    const linha = (t: Time | undefined, sets: number, vence: boolean, yy: number) => {
      if (vence) {
        ctx.fillStyle = destaque
        retangulo(ctx, 100, yy - 105, W - 200, 150, 28)
      }
      ctx.fillStyle = '#0a1a3f'
      ctx.font = `800 58px ${FONTE}`
      const nome = quebrar(ctx, t?.nome ?? '', 640)[0] ?? ''
      ctx.fillText(nome, 140, yy)
      estreito(true)
      ctx.font = `800 150px ${FONTE}`
      ctx.textAlign = 'right'
      ctx.fillText(String(sets), W - 140, yy + 25)
      ctx.textAlign = 'left'
      estreito(false)
    }
    linha(a, p.setsA, jogo.vencedor === 'a', topo + 280)
    linha(b, p.setsB, jogo.vencedor === 'b', topo + 480)
    ctx.fillStyle = '#56627a'
    ctx.font = `600 40px ${FONTE}`
    ctx.fillText(jogo.wo ? 'Vitória por W.O.' : jogo.sets.map(([x, y2]) => `${x}-${y2}`).join('   '), 140, topo + 660)
  } else {
    ctx.fillStyle = '#0b48c9'
    ctx.font = `700 44px ${FONTE}`
    ctx.fillText(`Campeões, ${arte.categoria}`, 120, topo + 120)
    ctx.fillStyle = '#0a1a3f'
    ctx.font = `800 96px ${FONTE}`
    const nome = quebrar(ctx, arte.time.nome, W - 240)
    nome.slice(0, 3).forEach((l, i) => ctx.fillText(l, 120, topo + 260 + i * 104))
    const atletas = base.atletas.filter((x) => x.time_id === arte.time.id).map((x) => x.nome)
    ctx.fillStyle = '#56627a'
    ctx.font = `600 42px ${FONTE}`
    if (!arte.time.nome.includes('/')) quebrar(ctx, atletas.join(', '), W - 240).slice(0, 2).forEach((l, i) => ctx.fillText(l, 120, topo + 600 + i * 54))
    ctx.fillStyle = destaque
    retangulo(ctx, 120, topo + 680, 220, 16, 8)
  }

  // patrocinadores
  let rodape = H - 200
  if (base.patrocinadores.length) {
    const lista = base.patrocinadores.slice(0, 4)
    const caixa = (W - 120 - (lista.length - 1) * 20) / lista.length
    const yy = topo + 820
    ctx.fillStyle = 'rgba(255,255,255,.75)'
    ctx.font = `600 32px ${FONTE}`
    ctx.fillText('Patrocínio', 80, yy)
    for (const [i, p] of lista.entries()) {
      const x = 60 + i * (caixa + 20)
      ctx.fillStyle = '#ffffff'
      retangulo(ctx, x, yy + 30, caixa, 150, 28)
      const img = p.logo ? await carregarImg(p.logo) : null
      if (img) {
        const esc = Math.min((caixa - 40) / img.width, 110 / img.height)
        ctx.drawImage(img, x + (caixa - img.width * esc) / 2, yy + 105 - (img.height * esc) / 2, img.width * esc, img.height * esc)
      } else {
        ctx.fillStyle = '#0a1a3f'
        ctx.font = `700 30px ${FONTE}`
        ctx.textAlign = 'center'
        ctx.fillText(p.nome, x + caixa / 2, yy + 115, caixa - 30)
        ctx.textAlign = 'left'
      }
    }
    rodape = Math.max(rodape, yy + 300)
  }

  // link + QR
  const qr = await carregarImg(await QRCode.toDataURL(linkPublico(camp.slug), { margin: 1, width: 300, color: { dark: '#0a1a3f', light: '#ffffff' } }))
  if (qr) {
    ctx.fillStyle = '#ffffff'
    retangulo(ctx, 60, H - 260, 200, 200, 24)
    ctx.drawImage(qr, 75, H - 245, 170, 170)
  }
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 38px ${FONTE}`
  ctx.fillText('Resultados ao vivo', 300, H - 170)
  ctx.font = `500 32px ${FONTE}`
  ctx.fillStyle = 'rgba(255,255,255,.8)'
  ctx.fillText(linkPublico(camp.slug).replace(/^https?:\/\//, ''), 300, H - 118, W - 360)
  void rodape
  ctx.font = `500 26px ${FONTE}`
  ctx.fillStyle = 'rgba(255,255,255,.55)'
  ctx.textAlign = 'right'
  ctx.fillText('Desenvolvido por Vetor Agência', W - 60, H - 40)
  ctx.textAlign = 'left'

  return new Promise((ok) => c.toBlob((b) => ok(b!), 'image/png'))
}

export function BotaoArte({ camp, base, arte, rotulo }: { camp: Campeonato; base: Base & { patrocinadores: Patrocinador[] }; arte: Arte; rotulo: string }) {
  const [ocupado, setOcupado] = useState(false)
  const [previa, setPrevia] = useState<{ url: string; blob: Blob } | null>(null)
  const gerar = async () => {
    setOcupado(true)
    try {
      const blob = await gerarArte(camp, base, arte)
      setPrevia({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      aviso((e as Error).message, true)
    }
    setOcupado(false)
  }
  const nome = `${camp.slug}-${arte.tipo}.png`
  const enviar = async () => {
    if (!previa) return
    const arquivo = new File([previa.blob], nome, { type: 'image/png' })
    try {
      if (navigator.canShare?.({ files: [arquivo] })) await navigator.share({ files: [arquivo], title: camp.nome })
      else baixar(previa.url, nome)
    } catch { /* cancelou */ }
  }
  return (
    <>
      <Botao variante="secundario" className="w-full" onClick={gerar} disabled={ocupado}>
        <Share2 size={16} /> {ocupado ? 'Gerando…' : rotulo}
      </Botao>
      <Folha aberta={!!previa} fechar={() => setPrevia(null)} titulo="Imagem para o Instagram">
        {previa && (
          <div className="space-y-3">
            <img src={previa.url} alt="Prévia da imagem" className="mx-auto max-h-[58vh] rounded-2xl shadow" />
            <div className="grid grid-cols-2 gap-2">
              <Botao onClick={enviar}><Share2 size={16} /> Compartilhar</Botao>
              <Botao variante="secundario" onClick={() => baixar(previa.url, nome)}><Download size={16} /> Baixar</Botao>
            </div>
          </div>
        )}
      </Folha>
    </>
  )
}

// ---------- instalar como app (PWA) ----------

type PedidoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let pedidoGuardado: PedidoInstalar | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pedidoGuardado = e as PedidoInstalar
  })
  if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('/sw.js').catch(() => {})
}

export const instalado = () =>
  typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true)

// abre o app instalado direto no último campeonato visto
export function lembrarCampeonato(slug: string) {
  try {
    localStorage.setItem('beach:ultimo', slug)
  } catch { /* sem armazenamento */ }
}
export function ultimoCampeonato() {
  try {
    return localStorage.getItem('beach:ultimo')
  } catch {
    return null
  }
}

export function Instalar({ camp }: { camp: Campeonato }) {
  const [aberto, setAberto] = useState(false)
  useEffect(() => lembrarCampeonato(camp.slug), [camp.slug])
  if (instalado()) return null
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const instalar = async () => {
    if (pedidoGuardado) {
      await pedidoGuardado.prompt()
      pedidoGuardado = null
    } else setAberto(true)
  }
  return (
    <>
      <button onClick={instalar} className="mt-8 flex w-full items-center gap-3 rounded-2xl bg-cartao p-4 text-left transition active:scale-[0.99]">
        <img src="/app/icone-192.png" alt="" className="h-11 w-11 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Instale no celular</span>
          <span className="block text-sm text-cinza">Abre direto no placar, como um aplicativo.</span>
        </span>
        <span className="text-sm font-bold text-mar">Como?</span>
      </button>
      <Folha aberta={aberto} fechar={() => setAberto(false)} titulo="Instalar no celular">
        <div className="space-y-3">
          <Passos titulo="iPhone (Safari)" destaque={ios} passos={[
            'Abra este link no Safari.',
            'Toque no botão Compartilhar (o quadrado com a seta para cima), na barra de baixo.',
            'Role e toque em "Adicionar à Tela de Início".',
            'Toque em "Adicionar". O ícone aparece junto dos seus apps.',
          ]} />
          <Passos titulo="Android (Chrome)" destaque={!ios} passos={[
            'Abra este link no Chrome.',
            'Toque nos três pontinhos, no canto de cima.',
            'Toque em "Instalar app" ou "Adicionar à tela inicial".',
            'Confirme. O ícone aparece junto dos seus apps.',
          ]} />
        </div>
      </Folha>
    </>
  )
}

function Passos({ titulo, passos, destaque }: { titulo: string; passos: string[]; destaque: boolean }) {
  return (
    <div className={cx('rounded-2xl bg-cartao p-4', destaque && 'ring-2 ring-mar')}>
      <h3 className="mb-2 font-bold">{titulo}</h3>
      <ol className="space-y-2">
        {passos.map((p, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="placar grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mar text-sm text-white">{i + 1}</span>
            <span className="pt-0.5">{p}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
