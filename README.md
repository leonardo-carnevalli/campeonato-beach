# Campeonato de Beach Vôlei (protótipo Vetor)

Sistema web para campeonatos de beach vôlei em duplas ou quartetos. Ele é pensado para o celular e tem três áreas:

| Área | Endereço | Quem usa | Senha |
|---|---|---|---|
| Público | `/` e `/c/<campeonato>` | Atletas e torcida | não precisa |
| Marcador | `/marcador` | Quem marca os pontos na quadra | senha do marcador (uma por campeonato) |
| Organização | `/admin` | Quem organiza | senha do administrador |

## O que faz

- **Organização:** cria campeonatos e categorias (duplas ou quartetos) e define as regras: set único ou melhor de 3, pontos por set, set de desempate, teto e pontos por vitória e derrota. Cadastra os times de um em um ou colando uma lista. Monta os grupos (sorteio ou à mão), gera os jogos e monta o mata-mata (oitavas, quartas, semi, final e 3º lugar). Distribui horários e quadras, lança placar à mão e registra W.O.
- **Marcador:** marca ponto a ponto com "Ponto" ou "Erro" de cada atleta. Um erro dá o ponto ao outro time. Também marca "+1 sem atleta". Dá para desfazer, corrigir ou apagar qualquer lance. O set fecha sozinho pela regra, avisa a troca de lado e pede confirmação para encerrar o jogo.
- **Público:** mostra os jogos ao vivo, os próximos e os resultados, com filtro por quadra. Também mostra a classificação dos grupos, a chave, o campeão, o ranking de pontos dos atletas e o lance a lance de cada jogo. Tudo se atualiza sozinho (Supabase Realtime).

**Classificação:** pontos, vitórias, saldo de sets, saldo de pontos, pontos feitos e confronto direto. A chave se preenche sozinha quando os grupos terminam (1º A x 2º B...).

## Rodar

```bash
npm install
npm run dev      # http://localhost:5180
npm run teste    # testes das regras (placar, classificação, chave)
npm run build
```

O `.env` tem a URL e a chave pública (anon) do Supabase. Ela pode ficar no Git: o banco só aceita escrita pelas funções que conferem a senha.

## Banco (Supabase)

- Projeto `campeonato-beach`. As migrações ficam em `supabase/migrations/`.
- Leitura pública. Toda escrita passa por funções `admin_*` e `marcador_*` (security definer) que conferem a senha com bcrypt na tabela `senhas`.
- O placar de cada jogo é recalculado no banco a partir dos lances (`_recalcular`). A mesma regra existe em `src/lib/motor.ts`.

## Código

- `src/lib/motor.ts`: regras (sets, classificação, chave, geração de jogos)
- `src/lib/dados.ts`: Supabase, senhas da sessão e realtime
- `src/publico`, `src/marcador`, `src/admin`: as três áreas
- `scripts/demo.ts`: cria um campeonato de exemplo
