-- Tipo do ponto (opcional) e patrocinadores do campeonato.

alter table lances add column fundamento text
  check (fundamento in ('ataque', 'bloqueio', 'ace', 'saque'));

create table patrocinadores (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references campeonatos on delete cascade,
  nome text not null,
  logo text,            -- data URL ou caminho de imagem
  link text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
alter table patrocinadores enable row level security;
create policy ler on patrocinadores for select using (true);

drop function marcador_lance(text, uuid, int, text, text, uuid);
create function marcador_lance(p_senha text, p_jogo uuid, p_set int, p_lado text, p_tipo text, p_atleta uuid,
  p_fundamento text default null)
returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform _exige_marcador(p_senha, p_jogo);
  if exists (select 1 from jogos where id = p_jogo and status = 'encerrado') then
    raise exception 'Jogo encerrado. Reabra para corrigir.';
  end if;
  update jogos set status = 'ao_vivo', placar_manual = false, wo = null where id = p_jogo and (status = 'agendado' or placar_manual or wo is not null);
  insert into lances (jogo_id, set_num, lado, tipo, atleta_id, fundamento) values (p_jogo, p_set, p_lado, p_tipo, p_atleta, p_fundamento)
    returning id into v_id;
  perform _recalcular(p_jogo);
  return v_id;
end $$;

drop function marcador_editar_lance(text, bigint, text, text, uuid);
create function marcador_editar_lance(p_senha text, p_lance bigint, p_lado text, p_tipo text, p_atleta uuid,
  p_fundamento text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_jogo uuid;
begin
  select jogo_id into v_jogo from lances where id = p_lance;
  perform _exige_marcador(p_senha, v_jogo);
  update lances set lado = p_lado, tipo = p_tipo, atleta_id = p_atleta, fundamento = p_fundamento where id = p_lance;
  perform _recalcular(v_jogo);
end $$;

create or replace function _salvar(p_tabela text, p_dados jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cols text; exc text; r jsonb;
begin
  if p_tabela not in ('campeonatos', 'categorias', 'times', 'atletas', 'jogos', 'patrocinadores') then
    raise exception 'Tabela não permitida: %', p_tabela;
  end if;
  select string_agg(quote_ident(k), ','), string_agg('excluded.' || quote_ident(k), ',')
    into cols, exc
    from jsonb_object_keys(p_dados) k
    where k in (select column_name from information_schema.columns
                where table_schema = 'public' and table_name = p_tabela)
      and k not in ('sets', 'sets_a', 'sets_b', 'vencedor', 'wo', 'placar_manual');
  execute format(
    'insert into %1$I (%2$s) select %2$s from jsonb_populate_record(null::%1$I, $1)
     on conflict (id) do update set (%2$s) = row(%3$s) returning to_jsonb(%1$I.*)',
    p_tabela, cols, exc) using p_dados into r;
  return r;
end $$;

create or replace function admin_lote(p_senha text, p_ops jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare o jsonb;
begin
  perform _exige_admin(p_senha);
  for o in select * from jsonb_array_elements(p_ops) loop
    if o->>'op' = 'salvar' then
      perform _salvar(o->>'tabela', o->'dados');
    elsif o->>'op' = 'apagar' then
      if o->>'tabela' not in ('campeonatos', 'categorias', 'times', 'atletas', 'jogos', 'patrocinadores') then
        raise exception 'Tabela não permitida';
      end if;
      execute format('delete from %I where id = $1', o->>'tabela') using (o->>'id')::uuid;
    end if;
  end loop;
end $$;

drop view estatisticas_atletas;
create view estatisticas_atletas with (security_invoker = on) as
  select atleta_id,
    count(*) filter (where tipo = 'ponto')::int as pontos,
    count(*) filter (where tipo = 'erro')::int as erros,
    count(*) filter (where tipo = 'ponto' and fundamento = 'ataque')::int as ataques,
    count(*) filter (where tipo = 'ponto' and fundamento = 'bloqueio')::int as bloqueios,
    count(*) filter (where tipo = 'ponto' and fundamento = 'ace')::int as aces
  from lances
  where atleta_id is not null
  group by atleta_id;
grant select on estatisticas_atletas to anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function admin_entrar, marcador_entrar, admin_trocar_senha, admin_senha_marcador,
  admin_tem_senha_marcador, marcador_iniciar, marcador_lance, marcador_editar_lance, marcador_apagar_lance,
  marcador_desfazer, marcador_status, marcador_wo, admin_placar, admin_salvar, admin_lote, admin_campeonatos
  to anon, authenticated;
