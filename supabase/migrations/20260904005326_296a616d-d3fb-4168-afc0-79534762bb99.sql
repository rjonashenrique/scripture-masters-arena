-- 1. New admin roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';

-- 2. Role helpers (text based so no new enum literal is used in this migration)
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_admin_role(_user_id, ARRAY['super_admin','admin','moderator','editor']);
$$;

CREATE OR REPLACE FUNCTION public.my_admin_roles()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(role::text), ARRAY[]::text[])
  FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- 3. Audit logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  reason text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_log(
  p_action text, p_entity_type text, p_entity_id text DEFAULT NULL,
  p_old jsonb DEFAULT NULL, p_new jsonb DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT display_name INTO v_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.admin_audit_logs (admin_id, admin_name, action, entity_type, entity_id, old_value, new_value, reason)
  VALUES (auth.uid(), COALESCE(v_name,''), p_action, p_entity_type, p_entity_id, p_old, p_new, p_reason);
END; $$;

-- 4. Player moderation fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS competitive_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 5. App settings / feature flags
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'true'::jsonb,
  label text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'geral',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.admin_set_setting(p_key text, p_value jsonb, p_label text DEFAULT NULL, p_category text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old jsonb;
BEGIN
  IF NOT public.has_admin_role(auth.uid(), ARRAY['super_admin','admin']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT value INTO v_old FROM public.app_settings WHERE key = p_key;
  INSERT INTO public.app_settings (key, value, label, category, updated_by, updated_at)
  VALUES (p_key, p_value, COALESCE(p_label,''), COALESCE(p_category,'geral'), auth.uid(), now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
    label = COALESCE(NULLIF(EXCLUDED.label,''), public.app_settings.label),
    category = COALESCE(NULLIF(EXCLUDED.category,''), public.app_settings.category),
    updated_by = auth.uid(), updated_at = now();
  PERFORM public.admin_log('setting_update','app_settings',p_key, jsonb_build_object('value',v_old), jsonb_build_object('value',p_value), NULL);
END; $$;

-- 6. System announcements
CREATE TABLE IF NOT EXISTS public.system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT 'all',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_announcements TO authenticated, anon;
GRANT ALL ON public.system_announcements TO service_role;
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active announcements" ON public.system_announcements
  FOR SELECT USING (is_active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "Staff reads all announcements" ON public.system_announcements
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER system_announcements_updated_at BEFORE UPDATE ON public.system_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Moderation reports
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid,
  reporter_name text NOT NULL DEFAULT '',
  target_type text NOT NULL,
  target_id text,
  target_label text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'outro',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  resolution text NOT NULL DEFAULT '',
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_reports TO authenticated;
GRANT ALL ON public.moderation_reports TO service_role;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own reports" ON public.moderation_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Users read own reports" ON public.moderation_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Staff reads reports" ON public.moderation_reports
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER moderation_reports_updated_at BEFORE UPDATE ON public.moderation_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Question categories
CREATE TABLE IF NOT EXISTS public.question_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📖',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_categories TO authenticated, anon;
GRANT ALL ON public.question_categories TO service_role;
ALTER TABLE public.question_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads categories" ON public.question_categories FOR SELECT USING (true);
CREATE TRIGGER question_categories_updated_at BEFORE UPDATE ON public.question_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Question lifecycle fields
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'multiple_choice';

-- 10. Staff write access to content tables
CREATE POLICY "Staff manage questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','editor']))
  WITH CHECK (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','editor']));
CREATE POLICY "Staff manage categories" ON public.question_categories
  FOR ALL TO authenticated
  USING (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','editor']))
  WITH CHECK (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin','editor']));
CREATE POLICY "Staff manage announcements" ON public.system_announcements
  FOR ALL TO authenticated
  USING (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.has_admin_role(auth.uid(), ARRAY['super_admin','admin']));
GRANT INSERT, UPDATE, DELETE ON public.system_announcements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.question_categories TO authenticated;