import { useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { admin, type Tudo } from '../lib/dados'
import type { Patrocinador } from '../lib/motor'
import { Botao, aviso, confirmar, entrada } from '../ui/ui'
import { LogoPatrocinador, baixar, imprimirCartaz, linkPublico, useQr } from '../publico/extras'
import { LinkExterno } from './Admin'

// logo reduzido no navegador e guardado no próprio registro (até ~60 KB)
function reduzir(arquivo: File): Promise<string> {
  return new Promise((ok, erro) => {
    const img = new Image()
    img.onload = () => {
      const esc = Math.min(1, 480 / img.width, 240 / img.height)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * esc)
      c.height = Math.round(img.height * esc)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      ok(c.toDataURL('image/png'))
    }
    img.onerror = () => erro(new Error('Não deu para ler essa imagem.'))
    img.src = URL.createObjectURL(arquivo)
  })
}

export function AdminPatrocinadores({ tudo, recarregar }: { tudo: Tudo; recarregar: () => Promise<void> }) {
  const [nome, setNome] = useState('')
  const [link, setLink] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const adicionar = async () => {
    try {
      await admin.salvar('patrocinadores', {
        campeonato_id: tudo.camp.id, nome: nome.trim(), link: link.trim() || null, logo, ordem: tudo.patrocinadores.length,
      })
      setNome('')
      setLink('')
      setLogo(null)
      aviso('Patrocinador adicionado')
      await recarregar()
    } catch (e) {
      aviso((e as Error).message, true)
    }
  }
  const apagar = async (p: Patrocinador) => {
    if (!confirmar(`Tirar ${p.nome}?`)) return
    try {
      await admin.apagar('patrocinadores', p.id)
      await recarregar()
    } catch (e) {
      aviso((e as Error).message, true)
    }
  }
  return (
    <section className="space-y-3 rounded-2xl bg-cartao p-4">
      <div>
        <h2 className="font-bold">Patrocinadores</h2>
        <p className="text-sm text-cinza">Aparecem na página do público, no telão e nas imagens para o Instagram.</p>
      </div>
      {tudo.patrocinadores.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {tudo.patrocinadores.map((p) => (
            <div key={p.id} className="relative rounded-xl border border-linha p-3">
              <LogoPatrocinador p={p} className="h-12 w-full" />
              <div className="mt-1 truncate text-center text-xs text-cinza">{p.nome}</div>
              <button onClick={() => apagar(p)} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-areia text-cinza" aria-label={`Tirar ${p.nome}`}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2 rounded-xl bg-areia p-3">
        <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do patrocinador" />
        <input className={entrada} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Site ou Instagram (opcional)" inputMode="url" />
        <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-linha bg-cartao text-sm font-semibold text-cinza">
          {logo ? <img src={logo} alt="" className="h-14 object-contain" /> : <><ImagePlus size={18} /> Escolher logo</>}
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) setLogo(await reduzir(f).catch((er) => { aviso(er.message, true); return null }))
          }} />
        </label>
        <Botao className="w-full" disabled={!nome.trim()} onClick={adicionar}>Adicionar patrocinador</Botao>
      </div>
    </section>
  )
}

export function AdminDivulgar({ tudo }: { tudo: Tudo }) {
  const c = tudo.camp
  const url = linkPublico(c.slug)
  const qr = useQr(url)
  return (
    <section className="space-y-3 rounded-2xl bg-cartao p-4">
      <h2 className="font-bold">Divulgar</h2>
      <div className="flex gap-4">
        {qr && <img src={qr} alt="QR Code do campeonato" className="h-28 w-28 rounded-xl border border-linha p-1" />}
        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
          <div className="truncate">Público: <LinkExterno href={`/c/${c.slug}`}>{url.replace(/^https?:\/\//, '')}</LinkExterno></div>
          <div>Telão: <LinkExterno href={`/c/${c.slug}/telao`}>abrir em tela cheia</LinkExterno></div>
          <div>Marcador: <LinkExterno href={`/marcador/${c.id}`}>abrir</LinkExterno></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Botao variante="secundario" onClick={() => baixar(qr, `qr-${c.slug}.png`)}>Baixar QR Code</Botao>
        <Botao variante="secundario" onClick={() => imprimirCartaz(c, qr)}>Imprimir cartaz</Botao>
      </div>
    </section>
  )
}
