ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_avatar text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_frame text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_badge text;

CREATE TABLE IF NOT EXISTS public.shop_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('avatar','frame','title','badge')),
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  price integer NOT NULL CHECK (price >= 0),
  min_level integer NOT NULL DEFAULT 1,
  icon text NOT NULL,
  style text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_items TO authenticated;
GRANT ALL ON public.shop_items TO service_role;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logged users see active items" ON public.shop_items FOR SELECT TO authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage items" ON public.shop_items FOR ALL TO authenticated
  USING (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin'])) WITH CHECK (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin']));
GRANT INSERT, UPDATE, DELETE ON public.shop_items TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL REFERENCES public.shop_items(id),
  price_paid integer NOT NULL DEFAULT 0,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own inventory or staff" ON public.user_inventory FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  ref text,
  balance_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own coin history or staff" ON public.coin_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS coin_tx_user_time ON public.coin_transactions(user_id, created_at DESC);

-- Coins, XP, titles and equipped items only change through server functions
CREATE OR REPLACE FUNCTION public.protect_player_xp() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR current_setting('app.xp_grant', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.xp IS DISTINCT FROM OLD.xp OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.level_reached_at IS DISTINCT FROM OLD.level_reached_at
     OR NEW.coins IS DISTINCT FROM OLD.coins OR NEW.titles IS DISTINCT FROM OLD.titles
     OR NEW.equipped_avatar IS DISTINCT FROM OLD.equipped_avatar
     OR NEW.equipped_frame IS DISTINCT FROM OLD.equipped_frame
     OR NEW.equipped_badge IS DISTINCT FROM OLD.equipped_badge THEN
    RAISE EXCEPTION 'Esses dados só podem ser alterados pelo servidor';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.level_milestone_coins(p_level integer) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_level WHEN 5 THEN 50 WHEN 10 THEN 100 WHEN 20 THEN 150 WHEN 30 THEN 200
    WHEN 50 THEN 300 WHEN 75 THEN 400 WHEN 100 THEN 500 ELSE 25 END
$$;

CREATE OR REPLACE FUNCTION public.award_player_xp(p_source text, p_correct integer, p_total integer, p_duration_ms integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_xp integer; v_today integer; v_last timestamptz; v_flag boolean := false;
  v_old_level integer; v_new_level integer; v_level_coins integer := 0; v_round_coins integer := 0;
  v_coins integer; v_titles jsonb := '[]'::jsonb; v_t text; v_cur_titles jsonb; i integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_source NOT IN ('quiz','challenge','battle','battle_royale') THEN RAISE EXCEPTION 'Origem inválida'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_prof.status IN ('banned','suspended') THEN RETURN jsonb_build_object('granted',0,'reason','conta_restrita'); END IF;

  p_total := LEAST(GREATEST(COALESCE(p_total,0),0),20);
  p_correct := LEAST(GREATEST(COALESCE(p_correct,0),0),p_total);
  p_duration_ms := GREATEST(COALESCE(p_duration_ms,0),0);
  IF p_total = 0 THEN RETURN jsonb_build_object('granted',0,'reason','sem_partida'); END IF;

  v_xp := CASE p_source WHEN 'quiz' THEN p_correct * 10 WHEN 'challenge' THEN p_correct * 15 ELSE p_correct * 10 + 20 END;
  IF p_duration_ms < p_total * 1500 THEN v_flag := true; v_xp := 0; END IF;

  SELECT MAX(created_at) INTO v_last FROM public.player_xp_log WHERE user_id = v_uid;
  IF v_last IS NOT NULL AND v_last > now() - interval '10 seconds' THEN
    RETURN jsonb_build_object('granted',0,'reason','muito_rapido');
  END IF;

  SELECT COALESCE(SUM(xp),0) INTO v_today FROM public.player_xp_log
    WHERE user_id = v_uid AND created_at >= date_trunc('day', now());
  v_xp := GREATEST(0, LEAST(v_xp, 1500 - v_today));

  INSERT INTO public.player_xp_log(user_id, source, xp, correct_answers, total_questions, duration_ms, flagged)
    VALUES (v_uid, p_source, v_xp, p_correct, p_total, p_duration_ms, v_flag);

  IF v_xp = 0 THEN
    RETURN jsonb_build_object('granted',0,'reason',CASE WHEN v_flag THEN 'em_analise' ELSE 'limite_diario' END,
      'info', public.player_level_info(v_prof.xp));
  END IF;

  -- +5 coins for a completed round (with XP), max 20 rounds/day pay coins
  IF (SELECT count(*) FROM public.coin_transactions WHERE user_id = v_uid AND reason = 'partida'
        AND created_at >= date_trunc('day', now())) < 20 THEN
    v_round_coins := 5;
  END IF;

  v_old_level := v_prof.level;
  v_new_level := (public.player_level_info(v_prof.xp + v_xp)->>'level')::int;
  v_cur_titles := COALESCE(v_prof.titles,'[]'::jsonb);
  IF v_new_level > v_old_level THEN
    FOR i IN (v_old_level+1)..v_new_level LOOP
      v_level_coins := v_level_coins + public.level_milestone_coins(i);
      v_t := public.level_title(i);
      IF v_t IS NOT NULL AND NOT (v_cur_titles ? v_t) THEN
        v_cur_titles := v_cur_titles || to_jsonb(v_t);
        v_titles := v_titles || to_jsonb(v_t);
      END IF;
    END LOOP;
  END IF;
  IF NOT (v_cur_titles ? '🌱 Iniciante') THEN v_cur_titles := v_cur_titles || to_jsonb('🌱 Iniciante'::text); END IF;
  v_level_coins := LEAST(v_level_coins, 500);
  v_coins := v_round_coins + v_level_coins;

  PERFORM set_config('app.xp_grant','on',true);
  UPDATE public.profiles SET xp = xp + v_xp, level = v_new_level, coins = coins + v_coins, titles = v_cur_titles,
    level_reached_at = CASE WHEN v_new_level > v_old_level THEN now() ELSE level_reached_at END
  WHERE id = v_uid;
  PERFORM set_config('app.xp_grant','off',true);

  IF v_round_coins > 0 THEN
    INSERT INTO public.coin_transactions(user_id, amount, reason, ref, balance_after)
      VALUES (v_uid, v_round_coins, 'partida', p_source, v_prof.coins + v_round_coins);
  END IF;
  IF v_level_coins > 0 THEN
    INSERT INTO public.coin_transactions(user_id, amount, reason, ref, balance_after)
      VALUES (v_uid, v_level_coins, 'nivel', v_new_level::text, v_prof.coins + v_coins);
  END IF;

  RETURN jsonb_build_object('granted',v_xp,'old_level',v_old_level,'new_level',v_new_level,
    'coins',v_level_coins,'round_coins',v_round_coins,'new_titles',v_titles,
    'info',public.player_level_info(v_prof.xp + v_xp));
END $$;

CREATE OR REPLACE FUNCTION public.buy_shop_item(p_item_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_item public.shop_items%ROWTYPE; v_prof public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO v_item FROM public.shop_items WHERE id = p_item_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_prof.status IN ('banned','suspended') THEN RAISE EXCEPTION 'Conta restrita'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = v_uid AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Você já possui este item';
  END IF;
  IF v_prof.level < v_item.min_level THEN RAISE EXCEPTION 'Nível % necessário', v_item.min_level; END IF;
  IF v_prof.coins < v_item.price THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', v_prof.coins, 'price', v_item.price);
  END IF;

  INSERT INTO public.user_inventory(user_id, item_id, price_paid) VALUES (v_uid, p_item_id, v_item.price);
  PERFORM set_config('app.xp_grant','on',true);
  UPDATE public.profiles SET coins = coins - v_item.price,
    titles = CASE WHEN v_item.category = 'title' AND NOT (COALESCE(titles,'[]'::jsonb) ? v_item.name)
      THEN COALESCE(titles,'[]'::jsonb) || to_jsonb(v_item.name) ELSE titles END
  WHERE id = v_uid;
  PERFORM set_config('app.xp_grant','off',true);
  INSERT INTO public.coin_transactions(user_id, amount, reason, ref, balance_after)
    VALUES (v_uid, -v_item.price, 'compra', p_item_id, v_prof.coins - v_item.price);
  RETURN jsonb_build_object('ok', true, 'balance', v_prof.coins - v_item.price);
END $$;

CREATE OR REPLACE FUNCTION public.equip_item(p_category text, p_item_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_val text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_category NOT IN ('avatar','frame','badge') THEN RAISE EXCEPTION 'Categoria inválida'; END IF;
  IF p_item_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_inventory ui JOIN public.shop_items si ON si.id = ui.item_id
                   WHERE ui.user_id = v_uid AND ui.item_id = p_item_id AND si.category = p_category) THEN
      RAISE EXCEPTION 'Item não encontrado no inventário';
    END IF;
  END IF;
  v_val := p_item_id;
  PERFORM set_config('app.xp_grant','on',true);
  IF p_category = 'avatar' THEN UPDATE public.profiles SET equipped_avatar = v_val WHERE id = v_uid;
  ELSIF p_category = 'frame' THEN UPDATE public.profiles SET equipped_frame = v_val WHERE id = v_uid;
  ELSE UPDATE public.profiles SET equipped_badge = v_val WHERE id = v_uid; END IF;
  PERFORM set_config('app.xp_grant','off',true);
END $$;

REVOKE EXECUTE ON FUNCTION public.buy_shop_item(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.equip_item(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.buy_shop_item(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equip_item(text, text) TO authenticated;