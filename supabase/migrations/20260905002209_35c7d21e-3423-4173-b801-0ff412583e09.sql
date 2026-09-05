-- Promote existing admins
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::public.app_role FROM public.user_roles WHERE role = 'admin'
ON CONFLICT DO NOTHING;

-- Seed categories
INSERT INTO public.question_categories (slug, name, icon, sort_order) VALUES
  ('antigo-testamento','Antigo Testamento','📜',1),
  ('novo-testamento','Novo Testamento','✝️',2),
  ('vida-de-jesus','Vida de Jesus','🕊️',3),
  ('personagens','Personagens','👤',4),
  ('profetas','Profetas','🔥',5),
  ('milagres','Milagres','✨',6),
  ('cartas','Cartas','✉️',7),
  ('conhecimento-geral','Conhecimento Geral','📖',8)
ON CONFLICT (slug) DO NOTHING;

-- Seed feature flags
INSERT INTO public.app_settings (key, value, label, category) VALUES
  ('maintenance_mode','false','Modo manutenção','sistema'),
  ('signups_enabled','true','Cadastro de novos jogadores','sistema'),
  ('clans_creation_enabled','true','Criação de clãs','clas'),
  ('clan_invites_enabled','true','Convites de clã','clas'),
  ('battle_royale_enabled','true','Battle Royale','modos'),
  ('battle_1v1_enabled','true','Batalha 1v1','modos'),
  ('challenge_enabled','true','Modo Desafio','modos'),
  ('championship_enabled','true','Copa Bíblica','modos'),
  ('rewards_enabled','true','Recompensas em moedas','recompensas')
ON CONFLICT (key) DO NOTHING;

-- Dashboard metrics
CREATE OR REPLACE FUNCTION public.admin_dashboard(p_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_from timestamptz;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  p_days := LEAST(GREATEST(COALESCE(p_days,7),1),90);
  v_from := date_trunc('day', now()) - ((p_days - 1) || ' days')::interval;

  SELECT jsonb_build_object(
    'total_players', (SELECT COUNT(*) FROM profiles),
    'active_players', (SELECT COUNT(*) FROM profiles WHERE updated_at >= v_from),
    'new_today', (SELECT COUNT(*) FROM profiles WHERE created_at >= date_trunc('day', now())),
    'total_questions', (SELECT COUNT(*) FROM quiz_questions WHERE status = 'published'),
    'total_answered', (SELECT COALESCE(SUM(total_answered),0) FROM profiles),
    'total_correct', (SELECT COALESCE(SUM(total_correct),0) FROM profiles),
    'total_battles', (SELECT COUNT(*) FROM battles),
    'total_royale', (SELECT COUNT(*) FROM battle_royale_rooms),
    'total_championships', (SELECT COUNT(*) FROM championships),
    'active_clans', (SELECT COUNT(*) FROM clans WHERE is_active),
    'avg_streak', (SELECT COALESCE(ROUND(AVG(streak_days)::numeric,1),0) FROM profiles),
    'total_xp', (SELECT COALESCE(SUM(xp),0) FROM clans),
    'total_points', (SELECT COALESCE(SUM(total_points),0) FROM profiles),
    'open_reports', (SELECT COUNT(*) FROM moderation_reports WHERE status IN ('new','reviewing')),
    'suspended_players', (SELECT COUNT(*) FROM profiles WHERE status <> 'active'),
    'signups_series', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d::date, 'value', c) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT g.d, (SELECT COUNT(*) FROM profiles p WHERE p.created_at >= g.d AND p.created_at < g.d + interval '1 day') c
        FROM generate_series(v_from, date_trunc('day', now()), interval '1 day') g(d)
      ) s
    ),
    'active_series', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d::date, 'value', c) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT g.d, (SELECT COUNT(*) FROM profiles p WHERE p.updated_at >= g.d AND p.updated_at < g.d + interval '1 day') c
        FROM generate_series(v_from, date_trunc('day', now()), interval '1 day') g(d)
      ) s
    ),
    'xp_series', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d::date, 'value', c) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT g.d, (SELECT COALESCE(SUM(x.xp),0) FROM clan_xp_log x WHERE x.created_at >= g.d AND x.created_at < g.d + interval '1 day') c
        FROM generate_series(v_from, date_trunc('day', now()), interval '1 day') g(d)
      ) s
    ),
    'clans_series', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d::date, 'value', c) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT g.d, (SELECT COUNT(*) FROM clans c2 WHERE c2.created_at < g.d + interval '1 day' AND c2.is_active) c
        FROM generate_series(v_from, date_trunc('day', now()), interval '1 day') g(d)
      ) s
    ),
    'modes', jsonb_build_array(
      jsonb_build_object('name','1v1','value',(SELECT COUNT(*) FROM battles)),
      jsonb_build_object('name','Battle Royale','value',(SELECT COUNT(*) FROM battle_royale_rooms)),
      jsonb_build_object('name','Copa','value',(SELECT COUNT(*) FROM championship_scores))
    ),
    'difficulty', jsonb_build_object(
      'easy', jsonb_build_object('answered',(SELECT COALESCE(SUM(easy_answered),0) FROM profiles),'correct',(SELECT COALESCE(SUM(easy_correct),0) FROM profiles)),
      'medium', jsonb_build_object('answered',(SELECT COALESCE(SUM(medium_answered),0) FROM profiles),'correct',(SELECT COALESCE(SUM(medium_correct),0) FROM profiles)),
      'hard', jsonb_build_object('answered',(SELECT COALESCE(SUM(hard_answered),0) FROM profiles),'correct',(SELECT COALESCE(SUM(hard_correct),0) FROM profiles))
    )
  ) INTO v;
  RETURN v;
END; $$;

-- User listing
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT '', p_status text DEFAULT 'all', p_role text DEFAULT 'all', p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, display_name text, email text, avatar_url text, total_points integer, total_answered integer,
  coins integer, streak_days integer, status text, suspended_until timestamptz, competitive_blocked boolean,
  admin_note text, created_at timestamptz, updated_at timestamptz, roles text[], clan_name text, clan_role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN QUERY
  SELECT p.id, p.display_name, u.email::text, p.avatar_url, p.total_points, p.total_answered,
         p.coins, p.streak_days, p.status, p.suspended_until, p.competitive_blocked,
         p.admin_note, p.created_at, p.updated_at,
         COALESCE((SELECT array_agg(r.role::text) FROM user_roles r WHERE r.user_id = p.id), ARRAY[]::text[]),
         c.name, cm.role
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN clan_members cm ON cm.user_id = p.id
  LEFT JOIN clans c ON c.id = cm.clan_id
  WHERE (COALESCE(trim(p_search),'') = ''
         OR p.display_name ILIKE '%'||p_search||'%'
         OR u.email::text ILIKE '%'||p_search||'%'
         OR p.id::text = p_search)
    AND (p_status = 'all' OR p.status = p_status)
    AND (p_role = 'all' OR EXISTS (SELECT 1 FROM user_roles r2 WHERE r2.user_id = p.id AND r2.role::text = p_role))
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit,100),1),500);
END; $$;

-- Moderation on players
CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user_id uuid, p_status text, p_reason text DEFAULT '', p_days integer DEFAULT NULL, p_competitive_blocked boolean DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old jsonb;
BEGIN
  IF NOT public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','moderator']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_status NOT IN ('active','suspended','banned') THEN RAISE EXCEPTION 'Situação inválida'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Você não pode moderar a si mesmo'; END IF;
  IF public.has_admin_role(p_user_id, ARRAY['super_admin']) THEN RAISE EXCEPTION 'Não é possível moderar um super admin'; END IF;

  SELECT jsonb_build_object('status',status,'suspended_until',suspended_until,'competitive_blocked',competitive_blocked)
    INTO v_old FROM profiles WHERE id = p_user_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Jogador não encontrado'; END IF;

  UPDATE profiles SET
    status = p_status,
    suspended_until = CASE WHEN p_status = 'suspended' AND p_days IS NOT NULL THEN now() + (p_days||' days')::interval
                           WHEN p_status = 'active' THEN NULL ELSE suspended_until END,
    competitive_blocked = COALESCE(p_competitive_blocked, competitive_blocked),
    admin_note = COALESCE(p_note, admin_note)
  WHERE id = p_user_id;

  PERFORM public.admin_log('user_status','profiles',p_user_id::text, v_old,
    jsonb_build_object('status',p_status,'days',p_days,'competitive_blocked',p_competitive_blocked), p_reason);
END; $$;

-- Role management (super admin only)
CREATE OR REPLACE FUNCTION public.admin_set_role(p_user_id uuid, p_role text, p_grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_admin_role(auth.uid(), ARRAY['super_admin']) THEN RAISE EXCEPTION 'Apenas super admin pode alterar papéis'; END IF;
  IF p_role NOT IN ('super_admin','admin','moderator','editor') THEN RAISE EXCEPTION 'Papel inválido'; END IF;
  IF p_user_id = auth.uid() AND p_role = 'super_admin' AND NOT p_grant THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio super admin';
  END IF;
  IF p_grant THEN
    INSERT INTO user_roles (user_id, role) VALUES (p_user_id, p_role::public.app_role) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM user_roles WHERE user_id = p_user_id AND role::text = p_role;
  END IF;
  PERFORM public.admin_log(CASE WHEN p_grant THEN 'role_grant' ELSE 'role_revoke' END,'user_roles',p_user_id::text,NULL,jsonb_build_object('role',p_role),NULL);
END; $$;

-- Clan moderation
CREATE OR REPLACE FUNCTION public.admin_set_clan_status(p_clan_id uuid, p_active boolean, p_reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','moderator']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE clans SET is_active = p_active, deleted_at = CASE WHEN p_active THEN NULL ELSE now() END, updated_at = now()
    WHERE id = p_clan_id;
  PERFORM public.admin_log(CASE WHEN p_active THEN 'clan_reactivate' ELSE 'clan_suspend' END,'clans',p_clan_id::text,NULL,jsonb_build_object('is_active',p_active),p_reason);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_clean_clan(p_clan_id uuid, p_clear_avatar boolean DEFAULT false, p_description text DEFAULT NULL, p_reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old jsonb;
BEGIN
  IF NOT public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','moderator']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT jsonb_build_object('avatar_url',avatar_url,'description',description) INTO v_old FROM clans WHERE id = p_clan_id;
  UPDATE clans SET
    avatar_url = CASE WHEN p_clear_avatar THEN NULL ELSE avatar_url END,
    description = COALESCE(left(p_description,300), description),
    updated_at = now()
  WHERE id = p_clan_id;
  PERFORM public.admin_log('clan_clean','clans',p_clan_id::text,v_old,jsonb_build_object('cleared_avatar',p_clear_avatar,'description',p_description),p_reason);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_clans(p_search text DEFAULT '', p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, name text, tag text, emblem text, avatar_url text, description text, league text, level integer,
  xp integer, member_count integer, max_members integer, is_active boolean, visibility text, created_at timestamptz, leader_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN QUERY
  SELECT c.id, c.name, c.tag, c.emblem, c.avatar_url, c.description, c.league, c.level, c.xp,
         c.member_count, c.max_members, c.is_active, c.visibility, c.created_at,
         (SELECT m.display_name FROM clan_members m WHERE m.clan_id = c.id AND m.role = 'leader' LIMIT 1)
  FROM clans c
  WHERE COALESCE(trim(p_search),'') = '' OR c.name ILIKE '%'||p_search||'%' OR c.tag ILIKE '%'||p_search||'%'
  ORDER BY c.xp DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit,100),1),500);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_invites(p_status text DEFAULT 'all', p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, clan_name text, clan_tag text, invited_by_name text, invited_name text, status text, created_at timestamptz, expires_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN QUERY
  SELECT i.id, c.name, c.tag, i.invited_by_name, COALESCE(p.display_name,'Link/código'),
         CASE WHEN i.status = 'pending' AND i.expires_at <= now() THEN 'expired' ELSE i.status END,
         i.created_at, i.expires_at
  FROM clan_invites i
  JOIN clans c ON c.id = i.clan_id
  LEFT JOIN profiles p ON p.id = i.invited_user_id
  WHERE p_status = 'all' OR (CASE WHEN i.status = 'pending' AND i.expires_at <= now() THEN 'expired' ELSE i.status END) = p_status
  ORDER BY i.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit,100),1),500);
END; $$;

-- Reports
CREATE OR REPLACE FUNCTION public.admin_resolve_report(p_report_id uuid, p_status text, p_resolution text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','moderator']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_status NOT IN ('new','reviewing','resolved','dismissed') THEN RAISE EXCEPTION 'Situação inválida'; END IF;
  UPDATE moderation_reports SET status = p_status, resolution = COALESCE(p_resolution, resolution),
    handled_by = auth.uid(), handled_at = now() WHERE id = p_report_id;
  PERFORM public.admin_log('report_'||p_status,'moderation_reports',p_report_id::text,NULL,jsonb_build_object('status',p_status),p_resolution);
END; $$;

-- Question archive
CREATE OR REPLACE FUNCTION public.admin_set_question_status(p_id integer, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','editor']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_status NOT IN ('published','draft','archived') THEN RAISE EXCEPTION 'Situação inválida'; END IF;
  UPDATE quiz_questions SET status = p_status, updated_at = now() WHERE id = p_id;
  PERFORM public.admin_log('question_status','quiz_questions',p_id::text,NULL,jsonb_build_object('status',p_status),NULL);
END; $$;

-- Suspicious activity view
CREATE OR REPLACE FUNCTION public.admin_suspicious()
RETURNS TABLE(user_id uuid, display_name text, total_points integer, total_answered integer, accuracy numeric, xp_today integer, risk text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','moderator']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN QUERY
  SELECT p.id, p.display_name, p.total_points, p.total_answered,
    CASE WHEN p.total_answered > 0 THEN ROUND(p.total_correct::numeric * 100 / p.total_answered, 1) ELSE 0 END,
    COALESCE(x.xp_today,0)::integer,
    CASE
      WHEN COALESCE(x.xp_today,0) >= 550 OR (p.total_answered >= 50 AND p.total_correct = p.total_answered) THEN 'high'
      WHEN COALESCE(x.xp_today,0) >= 300 OR (p.total_answered > 0 AND p.total_points::numeric / GREATEST(p.total_answered,1) > 60) THEN 'medium'
      ELSE 'low' END
  FROM profiles p
  LEFT JOIN (SELECT l.user_id uid, SUM(l.xp) xp_today FROM clan_xp_log l WHERE l.created_at >= date_trunc('day', now()) GROUP BY l.user_id) x ON x.uid = p.id
  WHERE p.total_answered > 0
  ORDER BY COALESCE(x.xp_today,0) DESC, p.total_points DESC
  LIMIT 100;
END; $$;