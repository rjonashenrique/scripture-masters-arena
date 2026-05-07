import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();

    // 1. Find ended championships not yet rewarded (end_date < now)
    const { data: ended } = await supabase
      .from("championships")
      .select("*")
      .lt("end_date", now.toISOString())
      .order("end_date", { ascending: false });

    const rewarded: string[] = [];
    for (const champ of ended ?? []) {
      // Check if already processed: look for marker via name suffix or skip if older than 14d
      const endDate = new Date(champ.end_date);
      const ageDays = (now.getTime() - endDate.getTime()) / 86400000;
      if (ageDays > 14) continue; // skip old ones

      // Get top 3
      const { data: top } = await supabase
        .from("championship_scores")
        .select("user_id, points")
        .eq("championship_id", champ.id)
        .order("points", { ascending: false })
        .limit(3);

      if (!top || top.length === 0) continue;

      const prizes = [champ.prize_coins_1st, champ.prize_coins_2nd, champ.prize_coins_3rd];
      for (let i = 0; i < top.length; i++) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", top[i].user_id)
          .single();
        if (prof) {
          await supabase
            .from("profiles")
            .update({ coins: (prof.coins ?? 0) + prizes[i] })
            .eq("id", top[i].user_id);
        }
      }
      rewarded.push(champ.id);
    }

    // 2. Ensure an active championship exists
    const { data: active } = await supabase
      .from("championships")
      .select("id")
      .lte("start_date", now.toISOString())
      .gte("end_date", now.toISOString())
      .maybeSingle();

    let createdId: string | null = null;
    if (!active) {
      // Create new weekly championship: Monday 00:00 -> Sunday 23:59:59 UTC
      const day = now.getUTCDay(); // 0=Sun ... 1=Mon
      const diffToMonday = (day + 6) % 7;
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday));
      const end = new Date(start.getTime() + 7 * 86400000 - 1000);

      const weekLabel = `${start.getUTCFullYear()}-W${String(Math.ceil(((start.getTime() - Date.UTC(start.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)).padStart(2, "0")}`;

      const { data: created } = await supabase
        .from("championships")
        .insert({
          name: `Campeonato Semanal ${weekLabel}`,
          description: "Acumule pontos durante a semana e dispute o pódio!",
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          prize_coins_1st: 500,
          prize_coins_2nd: 300,
          prize_coins_3rd: 150,
        })
        .select("id")
        .single();
      createdId = created?.id ?? null;
    }

    return new Response(
      JSON.stringify({ ok: true, rewarded, createdId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
