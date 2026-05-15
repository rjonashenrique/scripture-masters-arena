import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const BRACKET_SIZE = 16;
const TOTAL_ROUNDS = 4;

function nextMonday(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 sun..6 sat
  // Distance to next Monday (1)
  let diff = (1 - day + 7) % 7;
  if (diff === 0) diff = 7;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function thisOrLastMonday(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // days since last Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function ensureCurrentTournament() {
  const { data: existing } = await supabase
    .from('tournaments')
    .select('*')
    .neq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const now = new Date();
  const monday = thisOrLastMonday(now);
  const regEnd = new Date(monday); regEnd.setUTCDate(monday.getUTCDate() + 3); // Thu 00:00 UTC
  const startDate = new Date(regEnd);
  const endDate = new Date(monday); endDate.setUTCDate(monday.getUTCDate() + 7); endDate.setUTCMilliseconds(-1);

  const { data: last } = await supabase
    .from('tournaments')
    .select('season_number')
    .order('season_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const season = (last?.season_number ?? 0) + 1;

  // Pick 25 random question ids from 1..250 for the season pool
  const pool: number[] = [];
  while (pool.length < 25) {
    const r = Math.floor(Math.random() * 250) + 1;
    if (!pool.includes(r)) pool.push(r);
  }

  const { data: created, error } = await supabase
    .from('tournaments')
    .insert({
      season_number: season,
      status: 'registration',
      registration_start: monday.toISOString(),
      registration_end: regEnd.toISOString(),
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      bracket_size: BRACKET_SIZE,
      total_rounds: TOTAL_ROUNDS,
      question_ids: pool,
    })
    .select()
    .single();
  if (error) throw error;
  return created;
}

async function generateBracket(t: any) {
  // Get registrations
  const { data: regs } = await supabase
    .from('tournament_registrations')
    .select('user_id, display_name')
    .eq('tournament_id', t.id);
  if (!regs || regs.length < 2) {
    // Not enough players: cancel
    await supabase.from('tournaments').update({ status: 'finished' }).eq('id', t.id);
    return;
  }

  // Get points to seed
  const userIds = regs.map(r => r.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, total_points, display_name')
    .in('id', userIds);
  const ptsMap = new Map(profiles?.map(p => [p.id, p.total_points ?? 0]));
  const nameMap = new Map(profiles?.map(p => [p.id, p.display_name || 'Jogador']));

  const sorted = [...regs].sort((a, b) => (ptsMap.get(b.user_id) ?? 0) - (ptsMap.get(a.user_id) ?? 0));
  const players = sorted.slice(0, BRACKET_SIZE);

  // Pad to bracket size with nulls (BYE)
  while (players.length < BRACKET_SIZE) players.push({ user_id: null, display_name: 'BYE' } as any);

  // Standard bracket pairing: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
  const order = [0, 15, 7, 8, 4, 11, 3, 12, 5, 10, 2, 13, 6, 9, 1, 14];
  const seeded = order.map(i => players[i]);

  // Update seeds
  for (let i = 0; i < players.length; i++) {
    if (players[i].user_id) {
      await supabase.from('tournament_registrations')
        .update({ seed: order.indexOf(i) + 1 })
        .eq('tournament_id', t.id)
        .eq('user_id', players[i].user_id);
    }
  }

  const deadline = new Date(t.start_date);
  deadline.setUTCHours(deadline.getUTCHours() + 24);

  const matches: any[] = [];
  for (let m = 0; m < BRACKET_SIZE / 2; m++) {
    const p1 = seeded[m * 2];
    const p2 = seeded[m * 2 + 1];
    const isBye = !p1.user_id || !p2.user_id;
    matches.push({
      tournament_id: t.id,
      round: 1,
      match_index: m,
      player1_id: p1.user_id,
      player2_id: p2.user_id,
      player1_name: p1.user_id ? (nameMap.get(p1.user_id) || p1.display_name) : 'BYE',
      player2_name: p2.user_id ? (nameMap.get(p2.user_id) || p2.display_name) : 'BYE',
      status: isBye ? 'finished' : 'pending',
      winner_id: isBye ? (p1.user_id || p2.user_id) : null,
      deadline: deadline.toISOString(),
    });
  }
  await supabase.from('tournament_matches').insert(matches);
  await supabase.from('tournaments').update({ status: 'active', current_round: 1 }).eq('id', t.id);
}

async function resolveRoundAndAdvance(t: any) {
  const round = t.current_round;
  // Get matches in current round
  const { data: matches } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', t.id)
    .eq('round', round)
    .order('match_index');
  if (!matches) return;

  // Resolve W.O.
  for (const m of matches) {
    if (m.status === 'finished') continue;
    let winner: string | null = null;
    if (m.player1_score != null && m.player2_score == null) winner = m.player1_id;
    else if (m.player2_score != null && m.player1_score == null) winner = m.player2_id;
    else if (m.player1_score == null && m.player2_score == null) winner = m.player1_id || m.player2_id; // both no-show: p1
    else winner = m.player1_score >= m.player2_score ? m.player1_id : m.player2_id;
    await supabase.from('tournament_matches')
      .update({ winner_id: winner, status: 'finished' })
      .eq('id', m.id);
    m.winner_id = winner;
  }

  if (round >= t.total_rounds) {
    await finalizeTournament(t, matches);
    return;
  }

  // Build next round
  const nextRound = round + 1;
  const nextMatches: any[] = [];
  const deadline = new Date();
  deadline.setUTCHours(deadline.getUTCHours() + 24);

  // Profiles for names
  const winnerIds = matches.map(m => m.winner_id).filter(Boolean) as string[];
  const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', winnerIds);
  const nameMap = new Map(profs?.map(p => [p.id, p.display_name || 'Jogador']));

  for (let i = 0; i < matches.length; i += 2) {
    const w1 = matches[i]?.winner_id ?? null;
    const w2 = matches[i + 1]?.winner_id ?? null;
    nextMatches.push({
      tournament_id: t.id,
      round: nextRound,
      match_index: i / 2,
      player1_id: w1,
      player2_id: w2,
      player1_name: w1 ? (nameMap.get(w1) || 'Jogador') : 'BYE',
      player2_name: w2 ? (nameMap.get(w2) || 'Jogador') : 'BYE',
      status: (!w1 || !w2) ? 'finished' : 'pending',
      winner_id: (!w1 || !w2) ? (w1 || w2) : null,
      deadline: deadline.toISOString(),
    });
  }
  await supabase.from('tournament_matches').insert(nextMatches);
  await supabase.from('tournaments').update({ current_round: nextRound }).eq('id', t.id);
}

async function finalizeTournament(t: any, finalMatches: any[]) {
  const finalMatch = finalMatches[0];
  const champion = finalMatch?.winner_id;
  const runnerUp = champion === finalMatch?.player1_id ? finalMatch?.player2_id : finalMatch?.player1_id;

  // Semifinalists from previous round
  const { data: semis } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', t.id)
    .eq('round', t.total_rounds - 1);
  const semiLosers: string[] = [];
  for (const m of semis || []) {
    const loser = m.winner_id === m.player1_id ? m.player2_id : m.player1_id;
    if (loser) semiLosers.push(loser);
  }

  const rewards: { user_id: string; place: number; coins: number; title: string }[] = [];
  if (champion) rewards.push({ user_id: champion, place: 1, coins: 500, title: `Campeão da Temporada ${t.season_number}` });
  if (runnerUp) rewards.push({ user_id: runnerUp, place: 2, coins: 250, title: `Finalista da Temporada ${t.season_number}` });
  for (const u of semiLosers) rewards.push({ user_id: u, place: 3, coins: 100, title: `Semifinalista da Temporada ${t.season_number}` });

  for (const r of rewards) {
    await supabase.from('tournament_rewards').insert({
      tournament_id: t.id, user_id: r.user_id, place: r.place,
      coins_awarded: r.coins, title: r.title,
    });
    const { data: prof } = await supabase.from('profiles').select('coins, titles').eq('id', r.user_id).single();
    if (prof) {
      const titles = Array.isArray(prof.titles) ? prof.titles : [];
      if (!titles.includes(r.title)) titles.push(r.title);
      await supabase.from('profiles').update({
        coins: (prof.coins || 0) + r.coins,
        titles,
      }).eq('id', r.user_id);
    }
  }
  await supabase.from('tournaments').update({ status: 'finished' }).eq('id', t.id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const t = await ensureCurrentTournament();
    const now = new Date();

    if (t.status === 'registration' && now >= new Date(t.registration_end)) {
      await generateBracket(t);
    } else if (t.status === 'active') {
      // Advance round when current round deadline passed
      const { data: rm } = await supabase
        .from('tournament_matches')
        .select('deadline')
        .eq('tournament_id', t.id)
        .eq('round', t.current_round)
        .limit(1)
        .maybeSingle();
      if (rm && now >= new Date(rm.deadline)) {
        await resolveRoundAndAdvance(t);
      }
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
