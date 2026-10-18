-- Campeonato de beach volley: campeonatos, categorias, times, atletas, jogos e lances.
-- Leitura pública (anon). Toda escrita passa por funções que conferem a senha.

create extension if not exists pgcrypto with schema extensions;

-- Senhas (hash bcrypt). Sem política de RLS: ninguém lê pela API.
create table senhas (
  papel text not null,                 -- 'admin' (geral) ou 'marcador'
  campeonato_id uuid,                  -- null para o admin geral
  hash text not null
);
create unique index senhas_unq on senhas (papel, coalesce(campeonato_id, '00000000-0000-0000-0000-000000000000'));

create table campeonatos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  nome text not null,
  local text,
  data_inicio date,
  data_fim date,
  descricao text,
  publicado boolean not null default true,
  criado_em timestamptz not null default now()
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references campeonatos on delete cascade,
  nome text not null,
  tipo text not null default 'dupla' check (tipo in ('dupla', 'quarteto')),
  formato text not null default 'grupos_mata' check (formato in ('grupos_mata', 'grupos', 'mata')),
  -- sets: melhor de N (1, 3 ou 5). pontos_desempate vale para o último set quando N > 1.
  regras jsonb not null default '{"sets":3,"pontos_set":21,"pontos_desempate":15,"diferenca":2,"teto":null,"vitoria":2,"derrota":1,"wo":0}',
  -- regras do mata-mata; null = mesmas da fase de grupos
  regras_mata jsonb,
  -- por_grupo: classificados por grupo; extras: melhores colocados da posição seguinte
  mata jsonb not null default '{"por_grupo":2,"extras":0,"terceiro":false}',
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table times (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias on delete cascade,
  nome text not null,
  grupo text,
  semente int,
  criado_em timestamptz not null default now()
);

create table atletas (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references times on delete cascade,
  nome text not null,
  ordem int not null default 0
);

create table jogos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias on delete cascade,
  fase text not null default 'grupo' check (fase in ('grupo', 'r32', 'oitavas', 'quartas', 'semi', 'final', 'terceiro')),
  grupo text,
  rodada int not null default 1,
  ordem int not null default 0,
  time_a uuid references times on delete set null,
  time_b uuid references times on delete set null,
  -- mata-mata: 'G:A:1' (1º do grupo A), 'M:3:1' (melhor 3º nº 1), 'V:<jogo>' (vencedor), 'P:<jogo>' (perdedor), 'BYE'
  origem_a text,
  origem_b text,
  quadra text,
  horario timestamptz,
  status text not null default 'agendado' check (status in ('agendado', 'ao_vivo', 'encerrado')),
  sets jsonb not null default '[]',    -- [[21,18],[15,21],[15,12]]
  sets_a int not null default 0,
  sets_b int not null default 0,
  vencedor text check (vencedor in ('a', 'b')),
  wo text check (wo in ('a', 'b')),   -- lado que venceu por W.O.
  placar_manual boolean not null default false,
  atualizado_em timestamptz not null default now()
);
create index on jogos (categoria_id);

create table lances (
  id bigint generated always as identity primary key,
  jogo_id uuid not null references jogos on delete cascade,
  set_num int not null check (set_num between 1 and 5),
  lado text not null check (lado in ('a', 'b')),       -- quem ganhou o ponto
  tipo text not null check (tipo in ('ponto', 'erro', 'avulso')),
  atleta_id uuid references atletas on delete set null, -- ponto: atleta do lado; erro: atleta do outro lado
  criado_em timestamptz not null default now()
);
create index on lances (jogo_id, id);

alter table senhas enable row level security;
alter table campeonatos enable row level security;
alter table categorias enable row level security;
alter table times enable row level security;
alter table atletas enable row level security;
alter table jogos enable row level security;
alter table lances enable row level security;

create policy ler on campeonatos for select using (publicado);
create policy ler on categorias for select using (true);
create policy ler on times for select using (true);
create policy ler on atletas for select using (true);
create policy ler on jogos for select using (true);
create policy ler on lances for select using (true);

alter publication supabase_realtime add table jogos, lances;
alter table jogos replica identity full;
alter table lances replica identity full;

-- ---------- senhas ----------

create function _confere(p_papel text, p_campeonato uuid, p_senha text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from senhas
    where papel = p_papel
      and campeonato_id is not distinct from p_campeonato
      and hash = crypt(coalesce(p_senha, ''), hash)
  )
$$;

create function _exige_admin(p_senha text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not _confere('admin', null, p_senha) then
    raise exception 'Senha do administrador incorreta' using errcode = '28P01';
  end if;
end $$;

-- marcador do campeonato do jogo, ou o admin
create function _exige_marcador(p_senha text, p_jogo uuid) returns void
language plpgsql stable security definer set search_path = public as $$
declare v_camp uuid;
begin
  select c.campeonato_id into v_camp from jogos j join categorias c on c.id = j.categoria_id where j.id = p_jogo;
  if v_camp is null then raise exception 'Jogo não encontrado'; end if;
  if not (_confere('marcador', v_camp, p_senha) or _confere('admin', null, p_senha)) then
    raise exception 'Senha do marcador incorreta' using errcode = '28P01';
  end if;
end $$;

create function admin_entrar(p_senha text) returns boolean
language sql stable security definer set search_path = public as $$
  select _confere('admin', null, p_senha)
$$;

create function marcador_entrar(p_campeonato uuid, p_senha text) returns boolean
language sql stable security definer set search_path = public as $$
  select _confere('marcador', p_campeonato, p_senha) or _confere('admin', null, p_senha)
$$;

create function admin_trocar_senha(p_senha text, p_nova text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _exige_admin(p_senha);
  if length(coalesce(p_nova, '')) < 6 then raise exception 'A senha precisa de pelo menos 6 caracteres'; end if;
  update senhas set hash = crypt(p_nova, gen_salt('bf')) where papel = 'admin' and campeonato_id is null;
end $$;

create function admin_senha_marcador(p_senha text, p_campeonato uuid, p_nova text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _exige_admin(p_senha);
  if length(coalesce(p_nova, '')) < 4 then raise exception 'A senha precisa de pelo menos 4 caracteres'; end if;
  delete from senhas where papel = 'marcador' and campeonato_id = p_campeonato;
  insert into senhas (papel, campeonato_id, hash) values ('marcador', p_campeonato, crypt(p_nova, gen_salt('bf')));
end $$;

create function admin_tem_senha_marcador(p_senha text, p_campeonato uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  perform _exige_admin(p_senha);
  return exists (select 1 from senhas where papel = 'marcador' and campeonato_id = p_campeonato);
end $$;

-- ---------- placar ----------

-- Recalcula sets e vencedor a partir dos lances (ou do W.O.).
create function _recalcular(p_jogo uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  j jogos; r jsonb; n_sets int; precisa int; alvo int; teto int; dif int;
  v_sets jsonb := '[]'; sa int := 0; sb int := 0; a int; b int; i int; ultimo int;
begin
  select * into j from jogos where id = p_jogo;
  select case when j.fase <> 'grupo' and c.regras_mata is not null then c.regras_mata else c.regras end
    into r from categorias c where c.id = j.categoria_id;
  n_sets := coalesce((r->>'sets')::int, 3);
  precisa := n_sets / 2 + 1;
  dif := coalesce((r->>'diferenca')::int, 2);
  teto := nullif(r->>'teto', '')::int;

  if j.wo is not null then
    for i in 1..precisa loop
      v_sets := v_sets || jsonb_build_array(case when j.wo = 'a'
        then jsonb_build_array((r->>'pontos_set')::int, 0) else jsonb_build_array(0, (r->>'pontos_set')::int) end);
    end loop;
    update jogos set sets = v_sets, sets_a = case when j.wo = 'a' then precisa else 0 end,
      sets_b = case when j.wo = 'b' then precisa else 0 end, vencedor = j.wo, atualizado_em = now()
      where id = p_jogo;
    return;
  end if;

  if j.placar_manual then
    v_sets := j.sets;
  else
    select coalesce(max(set_num), 0) into ultimo from lances where jogo_id = p_jogo;
    for i in 1..ultimo loop
      select count(*) filter (where lado = 'a'), count(*) filter (where lado = 'b')
        into a, b from lances where jogo_id = p_jogo and set_num = i;
      v_sets := v_sets || jsonb_build_array(jsonb_build_array(a, b));
    end loop;
  end if;

  for i in 0..jsonb_array_length(v_sets) - 1 loop
    a := (v_sets->i->>0)::int; b := (v_sets->i->>1)::int;
    alvo := case when n_sets > 1 and i + 1 = n_sets then coalesce((r->>'pontos_desempate')::int, 15)
                 else coalesce((r->>'pontos_set')::int, 21) end;
    if (greatest(a, b) >= alvo and abs(a - b) >= dif) or (teto is not null and greatest(a, b) >= teto and a <> b) then
      if a > b then sa := sa + 1; else sb := sb + 1; end if;
    end if;
  end loop;

  update jogos set sets = v_sets, sets_a = sa, sets_b = sb,
    vencedor = case when sa >= precisa then 'a' when sb >= precisa then 'b' end,
    atualizado_em = now()
    where id = p_jogo;
end $$;

create function marcador_iniciar(p_senha text, p_jogo uuid, p_time_a uuid, p_time_b uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _exige_marcador(p_senha, p_jogo);
  if p_time_a is null or p_time_b is null then raise exception 'Os dois times precisam estar definidos'; end if;
  update jogos set status = 'ao_vivo', time_a = p_time_a, time_b = p_time_b, atualizado_em = now()
    where id = p_jogo and status = 'agendado';
end $$;

create function marcador_lance(p_senha text, p_jogo uuid, p_set int, p_lado text, p_tipo text, p_atleta uuid)
returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform _exige_marcador(p_senha, p_jogo);
  if exists (select 1 from jogos where id = p_jogo and status = 'encerrado') then
    raise exception 'Jogo encerrado. Reabra para corrigir.';
  end if;
  update jogos set status = 'ao_vivo', placar_manual = false, wo = null where id = p_jogo and (status = 'agendado' or placar_manual or wo is not null);
  insert into lances (jogo_id, set_num, lado, tipo, atleta_id) values (p_jogo, p_set, p_lado, p_tipo, p_atleta)
    returning id into v_id;
  perform _recalcular(p_jogo);
  return v_id;
end $$;

create function marcador_editar_lance(p_senha text, p_lance bigint, p_lado text, p_tipo text, p_atleta uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_jogo uuid;
begin
  select jogo_id into v_jogo from lances where id = p_lance;
  perform _exige_marcador(p_senha, v_jogo);
  update lances set lado = p_lado, tipo = p_tipo, atleta_id = p_atleta where id = p_lance;
  perform _recalcular(v_jogo);
end $$;

create function marcador_apagar_lance(p_senha text, p_lance bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_jogo uuid;
begin
  select jogo_id into v_jogo from lances where id = p_lance;
  if v_jogo is null then return; end if;
  perform _exige_marcador(p_senha, v_jogo);
  delete from lances where id = p_lance;
  perform _recalcular(v_jogo);
end $$;

create function marcador_desfazer(p_senha text, p_jogo uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _exige_marcador(p_senha, p_jogo);
  delete from lances where id = (select max(id) from lances where jogo_id = p_jogo);
  perform _recalcular(p_jogo);
end $$;

create function marcador_status(p_senha text, p_jogo uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _exige_marcador(p_senha, p_jogo);
  if p_status = 'encerrado' and (select vencedor from jogos where id = p_jogo) is null then
    raise exception 'O jogo ainda não tem vencedor';
  end if;
  update jogos set status = p_status, atualizado_em = now() where id = p_jogo;
end $$;

create function marcador_wo(p_senha text, p_jogo uuid, p_vencedor text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _exige_marcador(p_senha, p_jogo);
  delete from lances where jogo_id = p_jogo;
  update jogos set wo = p_vencedor, placar_manual = false, status = case when p_vencedor is null then 'agendado' else 'encerrado' end
    where id = p_jogo;
  perform _recalcular(p_jogo);
end $$;

-- placar digitado (jogo marcado no papel)
create function admin_placar(p_senha text, p_jogo uuid, p_sets jsonb, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _exige_admin(p_senha);
  delete from lances where jogo_id = p_jogo;
  update jogos set sets = coalesce(p_sets, '[]'), placar_manual = true, wo = null, status = p_status where id = p_jogo;
  perform _recalcular(p_jogo);
end $$;

-- ---------- cadastro (admin) ----------

create function _salvar(p_tabela text, p_dados jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cols text; exc text; r jsonb;
begin
  if p_tabela not in ('campeonatos', 'categorias', 'times', 'atletas', 'jogos') then
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

create function admin_salvar(p_senha text, p_tabela text, p_dados jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _exige_admin(p_senha);
  return _salvar(p_tabela, p_dados);
end $$;

-- p_ops: [{"op":"salvar","tabela":"jogos","dados":{...}}, {"op":"apagar","tabela":"jogos","id":"..."}]
create function admin_lote(p_senha text, p_ops jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare o jsonb;
begin
  perform _exige_admin(p_senha);
  for o in select * from jsonb_array_elements(p_ops) loop
    if o->>'op' = 'salvar' then
      perform _salvar(o->>'tabela', o->'dados');
    elsif o->>'op' = 'apagar' then
      if o->>'tabela' not in ('campeonatos', 'categorias', 'times', 'atletas', 'jogos') then
        raise exception 'Tabela não permitida';
      end if;
      execute format('delete from %I where id = $1', o->>'tabela') using (o->>'id')::uuid;
    end if;
  end loop;
end $$;

-- campeonato não publicado: o admin também precisa ler
create function admin_campeonatos(p_senha text) returns setof campeonatos
language plpgsql stable security definer set search_path = public as $$
begin
  perform _exige_admin(p_senha);
  return query select * from campeonatos order by data_inicio desc nulls last, criado_em desc;
end $$;

-- só as funções públicas ficam expostas
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function admin_entrar, marcador_entrar, admin_trocar_senha, admin_senha_marcador,
  admin_tem_senha_marcador, marcador_iniciar, marcador_lance, marcador_editar_lance, marcador_apagar_lance,
  marcador_desfazer, marcador_status, marcador_wo, admin_placar, admin_salvar, admin_lote, admin_campeonatos
  to anon, authenticated;
