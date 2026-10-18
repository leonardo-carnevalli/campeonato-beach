-- Pontos e erros por atleta, para o ranking do público (sem baixar todos os lances).
create view estatisticas_atletas with (security_invoker = on) as
  select atleta_id,
    count(*) filter (where tipo = 'ponto')::int as pontos,
    count(*) filter (where tipo = 'erro')::int as erros
  from lances
  where atleta_id is not null
  group by atleta_id;

grant select on estatisticas_atletas to anon, authenticated;
