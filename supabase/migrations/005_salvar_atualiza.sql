-- Edição parcial: se o id já existe, atualiza só as colunas enviadas (o upsert exigia todas as obrigatórias).
create or replace function _salvar(p_tabela text, p_dados jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cols text; exc text; r jsonb; v_existe boolean := false;
begin
  if p_tabela not in ('campeonatos', 'categorias', 'times', 'atletas', 'jogos', 'patrocinadores') then
    raise exception 'Tabela não permitida: %', p_tabela;
  end if;
  select string_agg(quote_ident(k), ','), string_agg('excluded.' || quote_ident(k), ',')
    into cols, exc
    from jsonb_object_keys(p_dados) k
    where k <> 'id'
      and k in (select column_name from information_schema.columns
                where table_schema = 'public' and table_name = p_tabela)
      and k not in ('sets', 'sets_a', 'sets_b', 'vencedor', 'wo', 'placar_manual');
  if p_dados ? 'id' then
    execute format('select exists (select 1 from %I where id = $1)', p_tabela) using (p_dados->>'id')::uuid into v_existe;
  end if;
  if v_existe then
    if cols is null then
      execute format('select to_jsonb(t.*) from %I t where id = $1', p_tabela) using (p_dados->>'id')::uuid into r;
    else
      execute format(
        'update %1$I t set (%2$s) = (select %2$s from jsonb_populate_record(null::%1$I, $1)) where t.id = ($1->>''id'')::uuid returning to_jsonb(t.*)',
        p_tabela, cols) using p_dados into r;
    end if;
  else
    if p_dados ? 'id' then cols := 'id' || coalesce(',' || cols, ''); end if;
    execute format(
      'insert into %1$I (%2$s) select %2$s from jsonb_populate_record(null::%1$I, $1) returning to_jsonb(%1$I.*)',
      p_tabela, cols) using p_dados into r;
  end if;
  return r;
end $$;
