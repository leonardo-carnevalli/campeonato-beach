-- Identidade e informações de cada campeonato: escudo, cartaz, cor, horário, inscrição e organização.
alter table campeonatos
  add column logo text,
  add column cartaz text,
  add column cor text check (cor ~ '^#[0-9a-fA-F]{6}$'),
  add column horario text,
  add column inscricao text,
  add column organizacao text;
