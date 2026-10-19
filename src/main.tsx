import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Redirect, Route, Switch } from 'wouter'
import './index.css'
import { Avisos, Vazio } from './ui/ui'
import { Inicio, Publico } from './publico/Publico'
import { JogoPublico } from './publico/JogoPublico'
import { Telao } from './publico/Telao'
import { Marcar, MarcadorInicio, MarcadorJogos } from './marcador/Marcador'
import { AdminInicio } from './admin/Admin'
import { AdminCampeonato } from './admin/Campeonato'
import { campeonatoDoDominio } from './temas'

const fixo = campeonatoDoDominio()
const soDoDominio = (slug: string, tela: ReactNode) => (fixo && slug !== fixo ? <Redirect to={`/c/${fixo}`} replace /> : tela)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Switch>
      <Route path="/">{() => (fixo ? <Redirect to={`/c/${fixo}`} replace /> : <Inicio />)}</Route>
      <Route path="/c/:slug">{(p) => soDoDominio(p.slug, <Publico slug={p.slug} />)}</Route>
      <Route path="/c/:slug/telao">{(p) => soDoDominio(p.slug, <Telao slug={p.slug} />)}</Route>
      <Route path="/c/:slug/jogo/:id">{(p) => soDoDominio(p.slug, <JogoPublico slug={p.slug} id={p.id} />)}</Route>
      <Route path="/marcador">{() => <MarcadorInicio />}</Route>
      <Route path="/marcador/:camp">{(p) => <MarcadorJogos campId={p.camp} />}</Route>
      <Route path="/marcador/:camp/jogo/:id">{(p) => <Marcar campId={p.camp} id={p.id} />}</Route>
      <Route path="/admin">{() => <AdminInicio />}</Route>
      <Route path="/admin/:id">{(p) => <AdminCampeonato id={p.id} />}</Route>
      <Route>{() => <div className="p-6"><Vazio>Página não encontrada.</Vazio></div>}</Route>
    </Switch>
    <Avisos />
  </StrictMode>,
)
