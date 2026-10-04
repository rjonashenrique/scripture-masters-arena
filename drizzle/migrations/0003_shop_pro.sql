ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_category_check;
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_rarity_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_category_check CHECK (category IN ('avatar','frame','title','badge','effect','clan'));
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_rarity_check CHECK (rarity IN ('common','rare','epic','legendary','mythic'));
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS purchasable boolean NOT NULL DEFAULT true;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS requirement text;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS requirement_label text NOT NULL DEFAULT '';
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS stock_limit integer;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS sold_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS event_label text NOT NULL DEFAULT '';
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS collection text;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS clan_slot text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_effect text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS featured_badges jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS acquisition_source text NOT NULL DEFAULT 'purchase';
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS cosmetic_banner text;
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS cosmetic_frame text;

-- protect new profile columns too
CREATE OR REPLACE FUNCTION public.protect_player_xp() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR current_setting('app.xp_grant', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.xp IS DISTINCT FROM OLD.xp OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.level_reached_at IS DISTINCT FROM OLD.level_reached_at
     OR NEW.coins IS DISTINCT FROM OLD.coins OR NEW.titles IS DISTINCT FROM OLD.titles
     OR NEW.equipped_avatar IS DISTINCT FROM OLD.equipped_avatar
     OR NEW.equipped_frame IS DISTINCT FROM OLD.equipped_frame
     OR NEW.equipped_badge IS DISTINCT FROM OLD.equipped_badge
     OR NEW.equipped_effect IS DISTINCT FROM OLD.equipped_effect
     OR NEW.featured_badges IS DISTINCT FROM OLD.featured_badges THEN
    RAISE EXCEPTION 'Esses dados só podem ser alterados pelo servidor';
  END IF;
  RETURN NEW;
END $$;

CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id uuid NOT NULL, item_id text NOT NULL REFERENCES public.shop_items(id),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, item_id));
GRANT SELECT, INSERT, DELETE ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_favorites TO service_role;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own favorites read" ON public.user_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own favorites add" ON public.user_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own favorites remove" ON public.user_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.shop_bundles (
  id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '', icon text NOT NULL DEFAULT '🎁',
  price integer NOT NULL CHECK (price >= 0), is_active boolean NOT NULL DEFAULT true, featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.shop_bundle_items (
  bundle_id text NOT NULL REFERENCES public.shop_bundles(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES public.shop_items(id), PRIMARY KEY (bundle_id, item_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_bundles, public.shop_bundle_items TO authenticated;
GRANT ALL ON public.shop_bundles, public.shop_bundle_items TO service_role;
ALTER TABLE public.shop_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read bundles" ON public.shop_bundles FOR SELECT TO authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "Admins manage bundles" ON public.shop_bundles FOR ALL TO authenticated
  USING (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin'])) WITH CHECK (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin']));
CREATE POLICY "Read bundle items" ON public.shop_bundle_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage bundle items" ON public.shop_bundle_items FOR ALL TO authenticated
  USING (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin'])) WITH CHECK (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin']));

CREATE TABLE IF NOT EXISTS public.shop_collections (
  id text PRIMARY KEY, name text NOT NULL, icon text NOT NULL DEFAULT '📚', description text NOT NULL DEFAULT '',
  reward_item_id text REFERENCES public.shop_items(id), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_collections TO authenticated;
GRANT ALL ON public.shop_collections TO service_role;
ALTER TABLE public.shop_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read collections" ON public.shop_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage collections" ON public.shop_collections FOR ALL TO authenticated
  USING (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin'])) WITH CHECK (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin']));

CREATE TABLE IF NOT EXISTS public.shop_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, item_id text, kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT INSERT ON public.shop_events TO authenticated;
GRANT SELECT ON public.shop_events TO authenticated;
GRANT ALL ON public.shop_events TO service_role;
ALTER TABLE public.shop_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Log own views" ON public.shop_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND kind = 'view');
CREATE POLICY "Staff read events" ON public.shop_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.clan_inventory (
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE, item_id text NOT NULL REFERENCES public.shop_items(id),
  bought_by uuid NOT NULL, acquired_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (clan_id, item_id));
GRANT SELECT ON public.clan_inventory TO authenticated;
GRANT ALL ON public.clan_inventory TO service_role;
ALTER TABLE public.clan_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see clan inventory" ON public.clan_inventory FOR SELECT TO authenticated
  USING (public.clan_role_of(clan_id, auth.uid()) IS NOT NULL OR public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.daily_rewards (
  user_id uuid NOT NULL, day date NOT NULL, streak integer NOT NULL, amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, day));
GRANT SELECT ON public.daily_rewards TO authenticated;
GRANT ALL ON public.daily_rewards TO service_role;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own daily rewards" ON public.daily_rewards FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Requirement check (achievement:<id>, level is checked separately; other kinds are not yet obtainable)
CREATE OR REPLACE FUNCTION public.shop_requirement_met(p_uid uuid, p_req text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_req IS NULL OR p_req = '' THEN true
    WHEN p_req LIKE 'achievement:%' THEN COALESCE((SELECT achievements ? substring(p_req from 13) FROM public.profiles WHERE id = p_uid), false)
    WHEN p_req = 'clan_founder' THEN EXISTS (SELECT 1 FROM public.clans WHERE owner_id = p_uid)
    WHEN p_req LIKE 'answered:%' THEN COALESCE((SELECT total_answered >= substring(p_req from 10)::int FROM public.profiles WHERE id = p_uid), false)
    ELSE false END
$$;

CREATE OR REPLACE FUNCTION public._grant_item(p_uid uuid, p_item public.shop_items, p_source text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_col public.shop_collections%ROWTYPE; v_total int; v_have int;
BEGIN
  INSERT INTO public.user_inventory(user_id, item_id, price_paid, acquisition_source)
    VALUES (p_uid, p_item.id, CASE WHEN p_source = 'purchase' THEN p_item.price ELSE 0 END, p_source)
    ON CONFLICT (user_id, item_id) DO NOTHING;
  IF p_item.category = 'title' THEN
    PERFORM set_config('app.xp_grant','on',true);
    UPDATE public.profiles SET titles = COALESCE(titles,'[]'::jsonb) || to_jsonb(p_item.name)
      WHERE id = p_uid AND NOT (COALESCE(titles,'[]'::jsonb) ? p_item.name);
    PERFORM set_config('app.xp_grant','off',true);
  END IF;
  -- collection completion reward
  IF p_item.collection IS NOT NULL THEN
    SELECT * INTO v_col FROM public.shop_collections WHERE id = p_item.collection;
    IF FOUND AND v_col.reward_item_id IS NOT NULL AND v_col.reward_item_id <> p_item.id THEN
      SELECT count(*) INTO v_total FROM public.shop_items WHERE collection = v_col.id AND id <> v_col.reward_item_id;
      SELECT count(*) INTO v_have FROM public.user_inventory ui JOIN public.shop_items si ON si.id = ui.item_id
        WHERE ui.user_id = p_uid AND si.collection = v_col.id AND si.id <> v_col.reward_item_id;
      IF v_total > 0 AND v_have >= v_total THEN
        INSERT INTO public.user_inventory(user_id, item_id, price_paid, acquisition_source)
          VALUES (p_uid, v_col.reward_item_id, 0, 'collection') ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._grant_item(uuid, public.shop_items, text) FROM anon, public, authenticated;

CREATE OR REPLACE FUNCTION public.purchase_shop_item(p_item_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_item public.shop_items%ROWTYPE; v_prof public.profiles%ROWTYPE; v_clan uuid; v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO v_item FROM public.shop_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR NOT v_item.is_active OR NOT v_item.purchasable THEN RAISE EXCEPTION 'Item indisponível para compra'; END IF;
  IF v_item.starts_at IS NOT NULL AND now() < v_item.starts_at THEN RAISE EXCEPTION 'Item ainda não disponível'; END IF;
  IF v_item.ends_at IS NOT NULL AND now() > v_item.ends_at THEN RAISE EXCEPTION 'Evento encerrado'; END IF;
  IF v_item.stock_limit IS NOT NULL AND v_item.sold_count >= v_item.stock_limit THEN RAISE EXCEPTION 'Esgotado'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_prof.status IN ('banned','suspended') THEN RAISE EXCEPTION 'Conta restrita'; END IF;
  IF v_prof.level < v_item.min_level THEN RAISE EXCEPTION 'Nível % necessário', v_item.min_level; END IF;
  IF NOT public.shop_requirement_met(v_uid, v_item.requirement) THEN RAISE EXCEPTION 'Requisito não cumprido: %', v_item.requirement_label; END IF;

  IF v_item.category = 'clan' THEN
    SELECT clan_id, role INTO v_clan, v_role FROM public.clan_members WHERE user_id = v_uid;
    IF v_clan IS NULL OR v_role NOT IN ('leader','vice') THEN RAISE EXCEPTION 'Só líder ou vice-líder podem comprar itens do clã'; END IF;
    IF EXISTS (SELECT 1 FROM public.clan_inventory WHERE clan_id = v_clan AND item_id = p_item_id) THEN RAISE EXCEPTION 'O clã já possui este item'; END IF;
  ELSIF EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = v_uid AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Você já possui este item';
  END IF;

  IF v_prof.coins < v_item.price THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', v_prof.coins, 'price', v_item.price);
  END IF;

  PERFORM set_config('app.xp_grant','on',true);
  UPDATE public.profiles SET coins = coins - v_item.price WHERE id = v_uid;
  PERFORM set_config('app.xp_grant','off',true);
  UPDATE public.shop_items SET sold_count = sold_count + 1 WHERE id = p_item_id;
  IF v_item.category = 'clan' THEN
    INSERT INTO public.clan_inventory(clan_id, item_id, bought_by) VALUES (v_clan, p_item_id, v_uid);
  ELSE
    PERFORM public._grant_item(v_uid, v_item, 'purchase');
  END IF;
  INSERT INTO public.coin_transactions(user_id, amount, reason, ref, balance_after)
    VALUES (v_uid, -v_item.price, 'compra', p_item_id, v_prof.coins - v_item.price);
  RETURN jsonb_build_object('ok', true, 'balance', v_prof.coins - v_item.price);
END $$;

-- keep old name working
CREATE OR REPLACE FUNCTION public.buy_shop_item(p_item_id text) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT public.purchase_shop_item(p_item_id) $$;

CREATE OR REPLACE FUNCTION public.purchase_bundle(p_bundle_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_b public.shop_bundles%ROWTYPE; v_prof public.profiles%ROWTYPE; v_item public.shop_items%ROWTYPE; v_missing int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO v_b FROM public.shop_bundles WHERE id = p_bundle_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pacote indisponível'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_prof.status IN ('banned','suspended') THEN RAISE EXCEPTION 'Conta restrita'; END IF;
  SELECT count(*) INTO v_missing FROM public.shop_bundle_items bi
    WHERE bi.bundle_id = p_bundle_id AND NOT EXISTS (SELECT 1 FROM public.user_inventory ui WHERE ui.user_id = v_uid AND ui.item_id = bi.item_id);
  IF v_missing = 0 THEN RAISE EXCEPTION 'Você já possui todos os itens deste pacote'; END IF;
  IF EXISTS (SELECT 1 FROM public.shop_bundle_items bi JOIN public.shop_items si ON si.id = bi.item_id
             WHERE bi.bundle_id = p_bundle_id AND si.min_level > v_prof.level) THEN
    RAISE EXCEPTION 'Nível insuficiente para algum item do pacote';
  END IF;
  IF v_prof.coins < v_b.price THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', v_prof.coins, 'price', v_b.price);
  END IF;
  PERFORM set_config('app.xp_grant','on',true);
  UPDATE public.profiles SET coins = coins - v_b.price WHERE id = v_uid;
  PERFORM set_config('app.xp_grant','off',true);
  FOR v_item IN SELECT si.* FROM public.shop_bundle_items bi JOIN public.shop_items si ON si.id = bi.item_id WHERE bi.bundle_id = p_bundle_id LOOP
    PERFORM public._grant_item(v_uid, v_item, 'bundle');
  END LOOP;
  INSERT INTO public.coin_transactions(user_id, amount, reason, ref, balance_after)
    VALUES (v_uid, -v_b.price, 'pacote', p_bundle_id, v_prof.coins - v_b.price);
  RETURN jsonb_build_object('ok', true, 'balance', v_prof.coins - v_b.price);
END $$;

CREATE OR REPLACE FUNCTION public.equip_inventory_item(p_item_id text, p_equip boolean DEFAULT true) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_item public.shop_items%ROWTYPE; v_badges jsonb; v_clan uuid; v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO v_item FROM public.shop_items WHERE id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;

  IF v_item.category = 'clan' THEN
    SELECT clan_id, role INTO v_clan, v_role FROM public.clan_members WHERE user_id = v_uid;
    IF v_clan IS NULL OR v_role NOT IN ('leader','vice') THEN RAISE EXCEPTION 'Só líder ou vice-líder podem equipar itens do clã'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.clan_inventory WHERE clan_id = v_clan AND item_id = p_item_id) THEN RAISE EXCEPTION 'O clã não possui este item'; END IF;
    IF v_item.clan_slot = 'frame' THEN
      UPDATE public.clans SET cosmetic_frame = CASE WHEN p_equip THEN v_item.style ELSE NULL END WHERE id = v_clan;
    ELSE
      UPDATE public.clans SET cosmetic_banner = CASE WHEN p_equip THEN v_item.style ELSE NULL END WHERE id = v_clan;
    END IF;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = v_uid AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Item não encontrado no inventário';
  END IF;
  PERFORM set_config('app.xp_grant','on',true);
  CASE v_item.category
    WHEN 'avatar' THEN UPDATE public.profiles SET equipped_avatar = CASE WHEN p_equip THEN p_item_id END WHERE id = v_uid;
    WHEN 'frame' THEN UPDATE public.profiles SET equipped_frame = CASE WHEN p_equip THEN p_item_id END WHERE id = v_uid;
    WHEN 'effect' THEN UPDATE public.profiles SET equipped_effect = CASE WHEN p_equip THEN p_item_id END WHERE id = v_uid;
    WHEN 'title' THEN UPDATE public.profiles SET active_title = CASE WHEN p_equip THEN v_item.name ELSE '' END WHERE id = v_uid;
    WHEN 'badge' THEN
      SELECT COALESCE(featured_badges,'[]'::jsonb) INTO v_badges FROM public.profiles WHERE id = v_uid;
      v_badges := v_badges - p_item_id;
      IF p_equip THEN
        IF jsonb_array_length(v_badges) >= 3 THEN
          PERFORM set_config('app.xp_grant','off',true);
          RAISE EXCEPTION 'Máximo de 3 badges em destaque';
        END IF;
        v_badges := v_badges || to_jsonb(p_item_id);
      END IF;
      UPDATE public.profiles SET featured_badges = v_badges,
        equipped_badge = CASE WHEN jsonb_array_length(v_badges) > 0 THEN v_badges->>0 END WHERE id = v_uid;
  END CASE;
  PERFORM set_config('app.xp_grant','off',true);
END $$;

-- old equip_item keeps working
CREATE OR REPLACE FUNCTION public.equip_item(p_category text, p_item_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cur text;
BEGIN
  IF p_item_id IS NOT NULL THEN PERFORM public.equip_inventory_item(p_item_id, true); RETURN; END IF;
  SELECT CASE p_category WHEN 'avatar' THEN equipped_avatar WHEN 'frame' THEN equipped_frame WHEN 'effect' THEN equipped_effect ELSE equipped_badge END
    INTO v_cur FROM public.profiles WHERE id = auth.uid();
  IF v_cur IS NOT NULL THEN PERFORM public.equip_inventory_item(v_cur, false); END IF;
END $$;

-- grant earned (non-purchasable) items whose requirement is met
CREATE OR REPLACE FUNCTION public.sync_earned_items() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_item public.shop_items%ROWTYPE; v_prof public.profiles%ROWTYPE; n int := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN 0; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  FOR v_item IN SELECT * FROM public.shop_items WHERE NOT purchasable AND is_active AND requirement IS NOT NULL LOOP
    IF v_prof.level >= v_item.min_level AND public.shop_requirement_met(v_uid, v_item.requirement)
       AND NOT EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = v_uid AND item_id = v_item.id) THEN
      PERFORM public._grant_item(v_uid, v_item, 'reward'); n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.daily_reward_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_last public.daily_rewards%ROWTYPE; v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_next int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO v_last FROM public.daily_rewards WHERE user_id = v_uid ORDER BY day DESC LIMIT 1;
  v_next := CASE WHEN v_last.day = v_today - 1 THEN (v_last.streak % 7) + 1 WHEN v_last.day = v_today THEN v_last.streak ELSE 1 END;
  RETURN jsonb_build_object('claimed_today', v_last.day IS NOT DISTINCT FROM v_today, 'day', v_next,
    'amount', (ARRAY[10,15,20,25,30,40,50])[v_next]);
END $$;

CREATE OR REPLACE FUNCTION public.claim_daily_reward() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_last public.daily_rewards%ROWTYPE; v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_day int; v_amount int; v_bal int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  PERFORM 1 FROM public.profiles WHERE id = v_uid FOR UPDATE;
  SELECT * INTO v_last FROM public.daily_rewards WHERE user_id = v_uid ORDER BY day DESC LIMIT 1;
  IF v_last.day = v_today THEN RAISE EXCEPTION 'Recompensa de hoje já resgatada'; END IF;
  v_day := CASE WHEN v_last.day = v_today - 1 THEN (v_last.streak % 7) + 1 ELSE 1 END;
  v_amount := (ARRAY[10,15,20,25,30,40,50])[v_day];
  INSERT INTO public.daily_rewards(user_id, day, streak, amount) VALUES (v_uid, v_today, v_day, v_amount);
  PERFORM set_config('app.xp_grant','on',true);
  UPDATE public.profiles SET coins = coins + v_amount WHERE id = v_uid RETURNING coins INTO v_bal;
  PERFORM set_config('app.xp_grant','off',true);
  INSERT INTO public.coin_transactions(user_id, amount, reason, ref, balance_after) VALUES (v_uid, v_amount, 'diaria', v_day::text, v_bal);
  RETURN jsonb_build_object('day', v_day, 'amount', v_amount, 'balance', v_bal);
END $$;

CREATE OR REPLACE FUNCTION public.admin_shop_analytics(p_days integer DEFAULT 30) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_since timestamptz := now() - make_interval(days => GREATEST(p_days,1));
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN jsonb_build_object(
    'top_items', (SELECT COALESCE(jsonb_agg(t), '[]') FROM (SELECT si.name, si.icon, count(*) AS sold FROM public.coin_transactions ct
        JOIN public.shop_items si ON si.id = ct.ref WHERE ct.reason = 'compra' AND ct.created_at >= v_since
        GROUP BY si.name, si.icon ORDER BY sold DESC LIMIT 10) t),
    'coins_spent', (SELECT COALESCE(-SUM(amount),0) FROM public.coin_transactions WHERE amount < 0 AND created_at >= v_since),
    'coins_issued', (SELECT COALESCE(SUM(amount),0) FROM public.coin_transactions WHERE amount > 0 AND created_at >= v_since),
    'buyers', (SELECT count(DISTINCT user_id) FROM public.coin_transactions WHERE amount < 0 AND created_at >= v_since),
    'by_rarity', (SELECT COALESCE(jsonb_object_agg(rarity, n), '{}') FROM (SELECT si.rarity, count(*) n FROM public.user_inventory ui
        JOIN public.shop_items si ON si.id = ui.item_id WHERE ui.acquired_at >= v_since GROUP BY si.rarity) r),
    'top_equipped', (SELECT COALESCE(jsonb_agg(e), '[]') FROM (SELECT si.name, si.icon, count(*) n FROM public.profiles p
        JOIN public.shop_items si ON si.id IN (p.equipped_avatar, p.equipped_frame, p.equipped_effect)
        GROUP BY si.name, si.icon ORDER BY n DESC LIMIT 10) e),
    'views', (SELECT count(*) FROM public.shop_events WHERE kind = 'view' AND created_at >= v_since),
    'purchases', (SELECT count(*) FROM public.coin_transactions WHERE reason IN ('compra','pacote') AND created_at >= v_since),
    'total_balance', (SELECT COALESCE(SUM(coins),0) FROM public.profiles),
    'avg_balance', (SELECT COALESCE(round(AVG(coins)),0) FROM public.profiles),
    'sources', (SELECT COALESCE(jsonb_object_agg(reason, total), '{}') FROM (SELECT reason, SUM(amount) total FROM public.coin_transactions
        WHERE amount > 0 AND created_at >= v_since GROUP BY reason) s),
    'sinks', (SELECT COALESCE(jsonb_object_agg(reason, total), '{}') FROM (SELECT reason, -SUM(amount) total FROM public.coin_transactions
        WHERE amount < 0 AND created_at >= v_since GROUP BY reason) s)
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.purchase_shop_item(text), public.purchase_bundle(text), public.equip_inventory_item(text, boolean),
  public.sync_earned_items(), public.daily_reward_status(), public.claim_daily_reward(), public.admin_shop_analytics(integer),
  public.shop_requirement_met(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.purchase_shop_item(text), public.purchase_bundle(text), public.equip_inventory_item(text, boolean),
  public.sync_earned_items(), public.daily_reward_status(), public.claim_daily_reward(), public.admin_shop_analytics(integer)
  TO authenticated;