CREATE OR REPLACE FUNCTION public.my_church_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT church_id FROM public.church_members WHERE user_id = auth.uid() $$;
REVOKE EXECUTE ON FUNCTION public.my_church_ids() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_church_ids() TO authenticated;
DROP POLICY IF EXISTS "Members view own church roster" ON public.church_members;
CREATE POLICY "Members view own church roster" ON public.church_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR church_id IN (SELECT public.my_church_ids()) OR public.is_staff(auth.uid()));