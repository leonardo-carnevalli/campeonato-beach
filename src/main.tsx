import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, Switch } from 'wouter'
import './index.css'
import { Avisos, Vazio } from './ui/ui'
import { Inicio, Publico } from './publico/Publico'
import { JogoPublico } from './publico/JogoPublico'
import { Marcar, MarcadorInicio, MarcadorJogos } from './marcador/Marcador'
import { AdminInicio } from './admin/Admin'
import { AdminCampeonato } from './admin/Campeonato'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Switch>
      <Route path="/">{() => <Inicio />}</Route>
      <Route path="/c/:slug">{(p) => <Publico slug={p.slug} />}</Route>
      <Route path="/c/:slug/jogo/:id">{(p) => <JogoPublico slug={p.slug} id={p.id} />}</Route>
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
