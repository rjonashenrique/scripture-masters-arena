DROP POLICY IF EXISTS "Authenticated can view clan members" ON public.clan_members;
CREATE POLICY "Members view own clan roster" ON public.clan_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR clan_id = public.my_clan_id() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view members" ON public.church_members;
CREATE POLICY "Members view own church roster" ON public.church_members FOR SELECT TO authenticated
USING (user_id = auth.uid()
  OR church_id IN (SELECT cm.church_id FROM public.church_members cm WHERE cm.user_id = auth.uid())
  OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view registrations" ON public.tournament_registrations;
CREATE POLICY "Users view own registrations" ON public.tournament_registrations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can create battles" ON public.battles;
CREATE POLICY "Authenticated can create waiting battles" ON public.battles FOR INSERT TO authenticated
WITH CHECK (status = 'waiting' AND player2_name IS NULL AND player1_score = 0 AND player2_score = 0
  AND current_question = 0 AND player1_answers = '[]'::jsonb AND player2_answers = '[]'::jsonb
  AND char_length(player1_name) BETWEEN 1 AND 40 AND char_length(code) BETWEEN 4 AND 12);