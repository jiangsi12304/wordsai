-- WordMate Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Description: Enable RLS and create security policies for all tables

-- =====================================================
-- Enable RLS on all tables
-- =====================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelist_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_dictionary ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- user_profiles policies
-- =====================================================
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- word_friends policies
-- =====================================================
CREATE POLICY "Users can view own words"
  ON public.word_friends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words"
  ON public.word_friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own words"
  ON public.word_friends FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own words"
  ON public.word_friends FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- review_schedules policies
-- =====================================================
CREATE POLICY "Users can view own schedules"
  ON public.review_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
  ON public.review_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.review_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON public.review_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- chat_messages policies
-- =====================================================
CREATE POLICY "Users can view own messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- whitelist_words policies
-- =====================================================
CREATE POLICY "Users can view own whitelist"
  ON public.whitelist_words FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whitelist"
  ON public.whitelist_words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own whitelist"
  ON public.whitelist_words FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own whitelist"
  ON public.whitelist_words FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- learning_stats policies
-- =====================================================
CREATE POLICY "Users can view own stats"
  ON public.learning_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.learning_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.learning_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- word_dictionary policies (public read, no write)
-- =====================================================
CREATE POLICY "Everyone can view dictionary"
  ON public.word_dictionary FOR SELECT
  USING (true);
