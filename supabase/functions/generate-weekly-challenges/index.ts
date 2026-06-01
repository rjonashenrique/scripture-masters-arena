import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
};

// Verify the caller is the trusted scheduler via the backend-only shared secret.
async function isAuthorizedScheduler(req: Request, supabase: any): Promise<boolean> {
  const provided = req.headers.get('x-scheduler-secret');
  if (!provided) return false;
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'scheduler_secret')
    .maybeSingle();
  return !!data?.value && data.value === provided;
}

const CHALLENGE_TEMPLATES = [
  { title: 'Maratona Bíblica', description: 'Respondam {target} perguntas coletivamente', icon: '📖', challenge_type: 'questions_answered', target_value: 200, reward_coins: 100 },
  { title: 'Precisão Divina', description: 'Acertem {target} perguntas coletivamente', icon: '🎯', challenge_type: 'correct_answers', target_value: 100, reward_coins: 75 },
  { title: 'Desafio Hard', description: 'Acertem {target} perguntas difíceis', icon: '🔥', challenge_type: 'hard_correct', target_value: 30, reward_coins: 150 },
  { title: 'Caçadores de Pontos', description: 'Alcancem {target} pontos coletivamente', icon: '⭐', challenge_type: 'points_earned', target_value: 2000, reward_coins: 120 },
  { title: 'Sequência Sagrada', description: 'Consigam {target} acertos seguidos (somando todos)', icon: '🔗', challenge_type: 'streak_total', target_value: 50, reward_coins: 90 },
  { title: 'Velocidade da Fé', description: 'Respondam {target} perguntas em menos de 5s cada', icon: '⚡', challenge_type: 'fast_answers', target_value: 40, reward_coins: 110 },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!(await isAuthorizedScheduler(req, supabase))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current week boundaries (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setUTCHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];

    // Check if challenges already exist for this week
    const { data: existing } = await supabase
      .from('weekly_challenges')
      .select('id')
      .eq('week_start', weekStart)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ message: 'Challenges already exist for this week' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pick 4 random challenges
    const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 4);

    // Vary target values slightly
    const challenges = selected.map(t => ({
      ...t,
      description: t.description.replace('{target}', String(t.target_value)),
      week_start: weekStart,
      week_end: weekEnd,
    }));

    const { data: inserted, error } = await supabase
      .from('weekly_challenges')
      .insert(challenges)
      .select();

    if (error) throw error;

    // Create progress entries for all churches
    const { data: churches } = await supabase.from('churches').select('id');
    if (churches && inserted) {
      const progressEntries = churches.flatMap(church =>
        inserted.map(challenge => ({
          church_id: church.id,
          challenge_id: challenge.id,
          current_value: 0,
        }))
      );

      if (progressEntries.length > 0) {
        await supabase.from('church_challenge_progress').insert(progressEntries);
      }
    }

    return new Response(JSON.stringify({ message: 'Weekly challenges generated', count: inserted?.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
