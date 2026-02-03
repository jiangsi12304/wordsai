-- WordMate Triggers and Functions
-- Migration: 003_triggers.sql
-- Description: Create triggers for auto-updating timestamps and user profile creation

-- =====================================================
-- Update updated_at trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Apply updated_at trigger to relevant tables
-- =====================================================
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_word_friends_updated_at ON public.word_friends;
CREATE TRIGGER update_word_friends_updated_at
  BEFORE UPDATE ON public.word_friends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- Auto-create user profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Update word_friends whitelist status
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_whitelist_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a word is added to whitelist, update the word_friends table
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.word_friends
    SET is_in_whitelist = true
    WHERE id = NEW.word_id;
  END IF;

  -- When a word is removed from whitelist, update the word_friends table
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.word_friends
    SET is_in_whitelist = false
    WHERE id = OLD.word_id;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_whitelist_status_trigger ON public.whitelist_words;

CREATE TRIGGER sync_whitelist_status_trigger
  AFTER INSERT OR DELETE ON public.whitelist_words
  FOR EACH ROW EXECUTE FUNCTION public.sync_whitelist_status();

-- =====================================================
-- Increment review count on word review
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_word_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update word_friends review statistics
  UPDATE public.word_friends
  SET
    review_count = review_count + 1,
    last_reviewed_at = NEW.actual_review_at,
    familiarity_score = LEAST(1.00, familiarity_score +
      CASE NEW.review_result
        WHEN 'forgot' THEN -0.2
        WHEN 'hard' THEN -0.05
        WHEN 'good' THEN 0.1
        WHEN 'easy' THEN 0.15
      END)
  WHERE id = NEW.word_id;

  -- Update mastery level based on familiarity_score
  UPDATE public.word_friends
  SET mastery_level = CASE
    WHEN familiarity_score >= 0.90 THEN 5
    WHEN familiarity_score >= 0.75 THEN 4
    WHEN familiarity_score >= 0.55 THEN 3
    WHEN familiarity_score >= 0.35 THEN 2
    WHEN familiarity_score >= 0.15 THEN 1
    ELSE 0
  END
  WHERE id = NEW.word_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_word_review_stats_trigger ON public.review_schedules;

CREATE TRIGGER update_word_review_stats_trigger
  AFTER INSERT OR UPDATE OF actual_review_at, review_result ON public.review_schedules
  FOR EACH ROW
  WHEN (NEW.actual_review_at IS NOT NULL AND NEW.review_result IS NOT NULL)
  EXECUTE FUNCTION public.update_word_review_stats();

-- =====================================================
-- Record learning stats on review completion
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_learning_stats()
RETURNS TRIGGER AS $$
DECLARE
  today_date DATE;
BEGIN
  today_date := CURRENT_DATE;

  -- Insert or update daily stats
  INSERT INTO public.learning_stats (
    user_id,
    stat_date,
    reviews_completed,
    reviews_correct,
    time_spent_seconds,
    words_promoted
  )
  VALUES (
    NEW.user_id,
    today_date,
    1,
    CASE WHEN NEW.review_result IN ('good', 'easy') THEN 1 ELSE 0 END,
    COALESCE(NEW.time_spent_seconds, 0),
    CASE WHEN NEW.review_result = 'easy' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, stat_date)
  DO UPDATE SET
    reviews_completed = learning_stats.reviews_completed + 1,
    reviews_correct = learning_stats.reviews_correct +
      CASE WHEN NEW.review_result IN ('good', 'easy') THEN 1 ELSE 0 END,
    time_spent_seconds = learning_stats.time_spent_seconds + COALESCE(NEW.time_spent_seconds, 0),
    words_promoted = learning_stats.words_promoted +
      CASE WHEN NEW.review_result = 'easy' THEN 1 ELSE 0 END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS record_learning_stats_trigger ON public.review_schedules;

CREATE TRIGGER record_learning_stats_trigger
  AFTER INSERT OR UPDATE OF actual_review_at, review_result ON public.review_schedules
  FOR EACH ROW
  WHEN (NEW.actual_review_at IS NOT NULL AND NEW.review_result IS NOT NULL)
  EXECUTE FUNCTION public.record_learning_stats();
