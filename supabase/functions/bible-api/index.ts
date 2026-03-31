import { corsHeaders } from '@supabase/supabase-js/cors'

const BIBLE_API = 'https://bible-api.com';
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, book, chapter, verse } = await req.json();

    if (action === 'daily-verse') {
      // Deterministic daily verse based on date
      const dailyVerses = [
        'joão 3:16', 'salmos 23:1-6', 'filipenses 4:13', 'romanos 8:28',
        'isaías 41:10', 'jeremias 29:11', 'provérbios 3:5-6', 'mateus 11:28',
        'salmos 46:1', 'romanos 12:2', 'gálatas 5:22-23', 'efésios 2:8-9',
        'josué 1:9', 'salmos 119:105', '2 timóteo 1:7', 'hebreus 11:1',
        'tiago 1:5', '1 coríntios 13:4-7', 'salmos 37:4', 'provérbios 16:3',
        'isaías 40:31', 'mateus 6:33', 'romanos 5:8', 'colossenses 3:23',
        'salmos 139:14', '1 pedro 5:7', 'joão 14:6', 'salmos 27:1',
        'romanos 15:13', 'provérbios 18:10',
      ];
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const ref = dailyVerses[dayOfYear % dailyVerses.length];

      const res = await fetch(`${BIBLE_API}/${encodeURIComponent(ref)}?translation=almeida`);
      const data = await res.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'chapter') {
      const ref = `${book} ${chapter}`;
      const res = await fetch(`${BIBLE_API}/${encodeURIComponent(ref)}?translation=almeida`);
      const data = await res.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'devotional') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      // Get daily verse first
      const dailyVerses = [
        'joão 3:16', 'salmos 23:1-6', 'filipenses 4:13', 'romanos 8:28',
        'isaías 41:10', 'jeremias 29:11', 'provérbios 3:5-6', 'mateus 11:28',
        'salmos 46:1', 'romanos 12:2', 'gálatas 5:22-23', 'efésios 2:8-9',
        'josué 1:9', 'salmos 119:105', '2 timóteo 1:7', 'hebreus 11:1',
        'tiago 1:5', '1 coríntios 13:4-7', 'salmos 37:4', 'provérbios 16:3',
        'isaías 40:31', 'mateus 6:33', 'romanos 5:8', 'colossenses 3:23',
        'salmos 139:14', '1 pedro 5:7', 'joão 14:6', 'salmos 27:1',
        'romanos 15:13', 'provérbios 18:10',
      ];
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const ref = dailyVerses[dayOfYear % dailyVerses.length];

      const verseRes = await fetch(`${BIBLE_API}/${encodeURIComponent(ref)}?translation=almeida`);
      const verseData = await verseRes.json();
      const verseText = verseData.text?.trim() || '';

      const aiRes = await fetch(AI_GATEWAY, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            {
              role: 'system',
              content: 'Você é um pastor cristão evangélico. Escreva devocionais curtos e inspiradores em português brasileiro. Responda APENAS em JSON válido com os campos: titulo (string), reflexao (string com 3-4 parágrafos), oracao (string com uma oração curta). Não use markdown, apenas JSON puro.'
            },
            {
              role: 'user',
              content: `Escreva um devocional baseado em ${ref}: "${verseText}"`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!aiRes.ok) {
        throw new Error(`AI Gateway failed [${aiRes.status}]: ${await aiRes.text()}`);
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      
      let devotional;
      try {
        // Try to parse JSON from the response, handling possible markdown wrapping
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        devotional = jsonMatch ? JSON.parse(jsonMatch[0]) : { titulo: 'Devocional do Dia', reflexao: content, oracao: '' };
      } catch {
        devotional = { titulo: 'Devocional do Dia', reflexao: content, oracao: '' };
      }

      return new Response(JSON.stringify({
        verse: verseData,
        devotional,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
