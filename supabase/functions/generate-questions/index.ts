import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "Antigo Testamento",
  "Novo Testamento",
  "Vida de Jesus",
  "Personagens da Bíblia",
  "Milagres de Jesus",
  "Profetas",
  "Conhecimento Geral",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Authenticate the caller and confirm they are an admin
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const text: string = (body.text ?? "").toString().slice(0, 8000);
    const count: number = Math.min(Math.max(parseInt(body.count) || 5, 1), 15);
    const difficulty: string = ["easy", "medium", "hard"].includes(body.difficulty) ? body.difficulty : "medium";
    const category: string = CATEGORIES.includes(body.category) ? body.category : "Conhecimento Geral";

    if (text.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Forneça um texto com mais conteúdo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em criar perguntas de quiz bíblico em português do Brasil.
A partir do texto fornecido pelo usuário, gere exatamente ${count} perguntas de múltipla escolha.
Regras:
- Cada pergunta deve ter exatamente 4 alternativas plausíveis.
- Apenas UMA alternativa correta, indicada por "correct_answer" (índice 0 a 3).
- A explicação deve ser curta e ensinar o motivo da resposta correta.
- Quando possível, inclua a referência bíblica (ex: "João 3:16") no campo "reference".
- Dificuldade alvo: ${difficulty}.
- As perguntas devem ser baseadas estritamente no conteúdo do texto fornecido.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_questions",
              description: "Cria a lista de perguntas geradas a partir do texto.",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          minItems: 4,
                          maxItems: 4,
                        },
                        correct_answer: { type: "integer", minimum: 0, maximum: 3 },
                        explanation: { type: "string" },
                        reference: { type: "string" },
                      },
                      required: ["question", "options", "correct_answer", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_questions" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return new Response(JSON.stringify({ error: "Falha na IA: " + errText.slice(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = {};
    try {
      parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
    } catch {
      parsed = {};
    }

    const questions = (parsed.questions ?? [])
      .filter((q: any) => q?.question && Array.isArray(q.options) && q.options.length === 4)
      .map((q: any) => ({
        question: String(q.question).trim(),
        options: q.options.map((o: any) => String(o).trim()),
        correct_answer: Math.min(Math.max(parseInt(q.correct_answer) || 0, 0), 3),
        explanation: String(q.explanation ?? "").trim(),
        difficulty,
        category,
        reference: q.reference ? String(q.reference).trim() : null,
      }));

    // Record an audit log of this generation (service role bypasses RLS)
    try {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: profile } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        await admin.from("ai_generation_logs").insert({
          user_id: user.id,
          display_name: profile?.display_name ?? "",
          source_text: text,
          question_count: questions.length,
          difficulty,
          category,
        });
      }
    } catch (_e) {
      // Logging must never break the generation flow
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
