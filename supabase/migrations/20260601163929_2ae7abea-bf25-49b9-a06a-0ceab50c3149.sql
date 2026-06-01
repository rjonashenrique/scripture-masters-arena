-- 1. Reference table with correct answers (read only via SECURITY DEFINER functions)
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id integer PRIMARY KEY,
  correct_answer integer NOT NULL
);

GRANT ALL ON public.quiz_questions TO service_role;

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
-- No policies: players cannot read this table directly; only SECURITY DEFINER functions can.

INSERT INTO public.quiz_questions (id, correct_answer) VALUES
(1,1),(2,1),(3,1),(4,1),(5,1),(6,1),(7,2),(8,2),(9,1),(10,1),(11,2),(12,1),(13,2),(14,1),(15,2),(16,1),(17,2),(18,2),(19,2),(20,1),(21,2),(22,2),(23,2),(24,1),(25,1),(26,1),(27,1),(28,2),(29,1),(30,1),(31,1),(32,1),(33,2),(34,1),(35,2),(36,2),(37,2),(38,1),(39,1),(40,2),(41,2),(42,1),(43,1),(44,1),(45,2),(46,1),(47,1),(48,1),(49,1),(50,2),(51,2),(52,1),(53,2),(54,2),(55,1),(56,2),(57,1),(58,2),(59,1),(60,1),(61,2),(62,2),(63,1),(64,1),(65,1),(66,2),(67,2),(68,2),(69,1),(70,1),(71,2),(72,1),(73,2),(74,2),(75,1),(76,1),(77,2),(78,1),(79,0),(80,1),(81,2),(82,2),(83,1),(84,1),(85,2),(86,2),(87,2),(88,2),(89,2),(90,1),(91,1),(92,1),(93,0),(94,2),(95,1),(96,1),(97,0),(98,1),(99,2),(100,1),(101,1),(102,2),(103,1),(104,0),(105,2),(106,1),(107,1),(108,2),(109,1),(110,2),(111,2),(112,1),(113,1),(114,1),(115,1),(116,1),(117,2),(118,3),(119,1),(120,1),(121,1),(122,1),(123,1),(124,1),(125,2),(126,1),(127,1),(128,2),(129,0),(130,1),(131,1),(132,1),(133,1),(134,3),(135,1),(136,2),(137,1),(138,1),(139,2),(140,1),(141,0),(142,1),(143,1),(144,1),(145,1),(146,0),(147,2),(148,1),(149,2),(150,1),(151,1),(152,0),(153,1),(154,1),(155,2),(156,1),(157,1),(158,1),(159,0),(160,3),(161,1),(162,1),(163,1),(164,1),(165,1),(166,0),(167,2),(168,1),(169,2),(170,1),(171,1),(172,1),(173,1),(174,1),(175,1),(176,2),(177,1),(178,1),(179,3),(180,2),(181,1),(182,2),(183,1),(184,1),(185,1),(186,1),(187,1),(188,1),(189,1),(190,2),(191,1),(192,1),(193,1),(194,2),(195,1),(196,1),(197,1),(198,1),(199,1),(200,1),(201,1),(202,0),(203,2),(204,2),(205,1),(206,0),(207,0),(208,0),(209,0),(210,1),(211,1),(212,1),(213,1),(214,1),(215,1),(216,1),(217,0),(218,1),(219,2),(220,2),(221,0),(222,2),(223,2),(224,0),(225,2),(226,1),(227,1),(228,1),(229,1),(230,1),(231,1),(232,2),(233,0),(234,0),(235,0),(236,1),(237,2),(238,1),(239,1),(240,2),(241,1),(242,3),(243,0),(244,2),(245,2),(246,2),(247,0),(248,0),(249,1),(250,2)
ON CONFLICT (id) DO UPDATE SET correct_answer = EXCLUDED.correct_answer;

-- 2. Battle Royale: derive correctness server-side, drop the client-supplied p_correct
DROP FUNCTION IF EXISTS public.submit_battle_royale_answer(uuid, integer, boolean);

CREATE OR REPLACE FUNCTION public.submit_battle_royale_answer(p_room_id uuid, p_answer integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current integer;
  v_player_id uuid;
  v_question_ids jsonb;
  v_qid integer;
  v_correct_answer integer;
  v_correct boolean;
BEGIN
  SELECT current_question, question_ids INTO v_current, v_question_ids
    FROM battle_royale_rooms WHERE id = p_room_id AND status = 'playing';

  SELECT id INTO v_player_id FROM battle_royale_players
    WHERE room_id = p_room_id AND user_id = auth.uid() AND alive = true;

  IF v_player_id IS NULL THEN
    RETURN;
  END IF;

  -- Look up the question for the current round and verify the answer on the server
  v_qid := (v_question_ids ->> v_current)::integer;
  SELECT correct_answer INTO v_correct_answer FROM quiz_questions WHERE id = v_qid;
  v_correct := (v_correct_answer IS NOT NULL AND p_answer = v_correct_answer);

  UPDATE battle_royale_players
  SET
    answers = answers || jsonb_build_object('question', v_current, 'answer', p_answer, 'correct', v_correct),
    score = CASE WHEN v_correct THEN score + 10 ELSE score END,
    alive = CASE WHEN v_correct THEN true ELSE false END,
    eliminated_at_question = CASE WHEN NOT v_correct THEN v_current ELSE eliminated_at_question END
  WHERE id = v_player_id;
END;
$function$;

-- 3. Tournament: reject impossible scores
CREATE OR REPLACE FUNCTION public.submit_tournament_score(p_match_id uuid, p_score integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_p1 UUID; v_p2 UUID;
  v_s1 INTEGER; v_s2 INTEGER;
  v_status TEXT;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 2000 THEN
    RAISE EXCEPTION 'Score out of range';
  END IF;
  SELECT player1_id, player2_id, player1_score, player2_score, status
    INTO v_p1, v_p2, v_s1, v_s2, v_status
    FROM tournament_matches WHERE id = p_match_id FOR UPDATE;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'Match already finished'; END IF;
  IF v_uid = v_p1 THEN
    IF v_s1 IS NOT NULL THEN RAISE EXCEPTION 'Already played'; END IF;
    UPDATE tournament_matches SET player1_score = p_score, updated_at = now() WHERE id = p_match_id;
    v_s1 := p_score;
  ELSIF v_uid = v_p2 THEN
    IF v_s2 IS NOT NULL THEN RAISE EXCEPTION 'Already played'; END IF;
    UPDATE tournament_matches SET player2_score = p_score, updated_at = now() WHERE id = p_match_id;
    v_s2 := p_score;
  ELSE
    RAISE EXCEPTION 'Not a player in this match';
  END IF;
  IF v_s1 IS NOT NULL AND v_s2 IS NOT NULL THEN
    UPDATE tournament_matches
      SET winner_id = CASE
        WHEN v_s1 > v_s2 THEN v_p1
        WHEN v_s2 > v_s1 THEN v_p2
        ELSE v_p1
      END,
      status = 'finished',
      updated_at = now()
      WHERE id = p_match_id;
  END IF;
END;
$function$;