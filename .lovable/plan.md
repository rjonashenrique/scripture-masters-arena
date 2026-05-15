## Torneio Sazonal Semanal — Chaveamento Eliminatório

Sistema de torneios individuais que rodam semanalmente, com inscrições, chaveamento eliminatório e premiação em moedas + título exibido no perfil.

### Como funciona (visão do usuário)

```text
Segunda 00:00  → Abre inscrição (Temporada Nº X)
Quarta 23:59   → Fecha inscrição, gera chaveamento (até 16 jogadores)
Quinta–Domingo → Rodadas eliminatórias (1 rodada por dia)
Domingo 23:59  → Final + premiação automática
```

- Cada partida = quiz de 5 perguntas. O jogador joga **uma vez** por rodada; o maior pontuação avança. Se o adversário não jogar antes do fim da rodada, vence por W.O.
- Premiação:
  - 🥇 Campeão: **500 moedas** + título **"Campeão da Temporada"**
  - 🥈 Vice: **250 moedas** + título **"Finalista"**
  - 🥉 Semifinalistas: **100 moedas** + título **"Semifinalista"**
- Títulos ficam salvos no perfil; o usuário escolhe qual exibir.

### Telas

1. **Card no Home** "🏆 Torneio Semanal" → status atual (inscrições abertas / em andamento / encerrado) + CTA.
2. **/tournament** — Página principal:
   - Badge da temporada + countdown da próxima fase.
   - Botão **Inscrever-se** (durante janela de inscrição).
   - **Chaveamento visual** (bracket) com nomes, scores e destaque do usuário.
   - Sua próxima partida → botão **Jogar Rodada**.
   - Histórico das suas partidas com pontuação.
3. **/tournament/match/:id** — quiz de 5 perguntas (reusa lógica de QuizPage), envia score ao final.
4. **Perfil** — seção **"Títulos"** com lista conquistada + select para definir o título ativo (aparece junto ao nome no ranking).

### Arquitetura técnica

**Banco (migration):**
- `tournaments` (id, season_number, status, registration_start/end, start_date, end_date, bracket_size=16)
- `tournament_registrations` (tournament_id, user_id, display_name, seed)
- `tournament_matches` (tournament_id, round, match_index, player1_id, player2_id, player1_score, player2_score, winner_id, status, deadline)
- `tournament_rewards` (tournament_id, user_id, place, coins_awarded, title)
- `profiles`: adicionar `titles jsonb default '[]'`, `active_title text default ''`
- RLS: leitura pública autenticada; inscrição apenas com `auth.uid() = user_id`; submissão de score via RPC `submit_tournament_score(match_id, score)` que valida turno do jogador e fecha a partida quando ambos jogaram.
- RPCs `security definer`:
  - `register_tournament(tournament_id)` — valida janela e bracket não cheio.
  - `submit_tournament_score(match_id, score)` — grava score, decide vencedor se ambos jogaram, avança vencedor para próxima rodada.
  - `set_active_title(title)` — valida que usuário possui o título.

**Edge function `tournament-scheduler`** (cron via pg_cron a cada hora):
- Cria nova temporada toda segunda 00:00 se não houver ativa.
- Quarta 23:59 → fecha inscrição, gera bracket (seed por `total_points`, completa com BYE), cria matches da rodada 1.
- Diariamente 23:59 → resolve W.O., gera matches da próxima rodada com vencedores.
- Domingo 23:59 → finaliza torneio, distribui moedas + títulos via inserts em `tournament_rewards` e update em `profiles`.

**Frontend:**
- `src/lib/tournament.ts` — helpers (status, bracket layout).
- `src/hooks/useTournament.ts` — fetch da temporada ativa, bracket e match do usuário (com Realtime na tabela `tournament_matches`).
- `src/pages/TournamentPage.tsx` — bracket + ações.
- `src/pages/TournamentMatchPage.tsx` — quiz da rodada.
- `src/components/TournamentCard.tsx` — card do Home.
- `src/components/TitleSelector.tsx` — no Perfil.
- Rotas adicionadas em `App.tsx`; nav opcionalmente trocada (mantendo 5 abas — Torneio entra dentro do Home).

### Fora do escopo
- Sem clãs/grupos (proibido por memória).
- Sem chat entre jogadores.
- Sem brackets > 16 jogadores nesta primeira versão (excedentes ficam em lista de espera para a próxima temporada).
