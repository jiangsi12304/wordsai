-- WordMate Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Create all core tables for WordMate application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. User Profiles Table (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  avatar_url TEXT,
  display_name VARCHAR(100),
  bio TEXT,
  learning_level VARCHAR(20) DEFAULT 'beginner' CHECK (learning_level IN ('beginner', 'intermediate', 'advanced')),
  daily_goal INTEGER DEFAULT 20,
  preferred_voice VARCHAR(20) DEFAULT 'us' CHECK (preferred_voice IN ('us', 'uk')),
  ai_personality_preference VARCHAR(30) DEFAULT 'friendly' CHECK (ai_personality_preference IN ('friendly', 'strict', 'humorous', 'encouraging')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. Word Dictionary Table (pre-defined word library)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.word_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) UNIQUE NOT NULL,
  pronunciation TEXT,
  part_of_speech VARCHAR(50)[],
  definitions JSONB DEFAULT '[]',
  frequency_rank INTEGER,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  etymology TEXT,
  examples JSONB DEFAULT '[]',
  synonyms TEXT[],
  antonyms TEXT[],
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. Word Friends Table (core table)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.word_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word VARCHAR(100) NOT NULL,

  -- Word information
  pronunciation TEXT,
  part_of_speech VARCHAR(50),
  definitions JSONB DEFAULT '[]',

  -- AI Personification fields
  ai_name VARCHAR(100),
  ai_personality VARCHAR(50) CHECK (ai_personality IN ('friendly', 'strict', 'humorous', 'encouraging')),
  ai_avatar_url TEXT,
  ai_self_intro TEXT,
  ai_conversation_style JSONB,

  -- Learning status
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
  familiarity_score DECIMAL(3,2) DEFAULT 0.00 CHECK (familiarity_score BETWEEN 0 AND 1),
  review_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  -- Frequency and difficulty
  frequency_rank INTEGER,
  difficulty_score INTEGER DEFAULT 1 CHECK (difficulty_score BETWEEN 1 AND 5),

  -- Tags and flags
  tags TEXT[] DEFAULT '{}',
  is_in_whitelist BOOLEAN DEFAULT false,

  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT word_friends_user_word UNIQUE(user_id, word)
);

-- =====================================================
-- 4. Review Schedules Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.review_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.word_friends(id) ON DELETE CASCADE,

  -- Ebbinghaus / SM-2 algorithm parameters
  stage INTEGER DEFAULT 1,
  interval_days DECIMAL(5,2) DEFAULT 0,
  ease_factor DECIMAL(3,2) DEFAULT 2.50 CHECK (ease_factor >= 1.3),
  memory_strength DECIMAL(5,4) DEFAULT 0.0000 CHECK (memory_strength BETWEEN 0 AND 1),

  -- Scheduling info
  scheduled_at TIMESTAMPTZ NOT NULL,
  actual_review_at TIMESTAMPTZ,
  review_result VARCHAR(20) CHECK (review_result IN ('forgot', 'hard', 'good', 'easy')),
  time_spent_seconds INTEGER DEFAULT 0,

  -- Customization
  is_custom BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT review_schedules_unique UNIQUE(user_id, word_id, scheduled_at)
);

-- =====================================================
-- 5. Chat Messages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.word_friends(id) ON DELETE CASCADE,

  -- Message content
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'ai')),
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'system')),
  content TEXT NOT NULL,
  voice_url TEXT,
  voice_duration_seconds INTEGER,

  -- AI metadata
  ai_model_used VARCHAR(50),
  ai_prompt_tokens INTEGER,
  ai_completion_tokens INTEGER,

  -- Context
  is_context_message BOOLEAN DEFAULT false,
  related_review_id UUID REFERENCES public.review_schedules(id),

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. Whitelist Words Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whitelist_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.word_friends(id) ON DELETE CASCADE,

  -- Training configuration
  intensity_level INTEGER DEFAULT 1 CHECK (intensity_level BETWEEN 1 AND 5),
  target_mastery_level INTEGER DEFAULT 5 CHECK (target_mastery_level BETWEEN 1 AND 5),

  -- Records
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_practiced_at TIMESTAMPTZ,
  practice_count INTEGER DEFAULT 0,

  CONSTRAINT whitelist_words_unique UNIQUE(user_id, word_id)
);

-- =====================================================
-- 7. Learning Stats Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.learning_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time dimensions
  stat_date DATE NOT NULL,
  stat_hour INTEGER CHECK (stat_hour BETWEEN 0 AND 23),

  -- New words learning
  new_words_learned INTEGER DEFAULT 0,

  -- Review statistics
  reviews_completed INTEGER DEFAULT 0,
  reviews_correct INTEGER DEFAULT 0,
  reviews_forgot INTEGER DEFAULT 0,

  -- Time statistics
  time_spent_seconds INTEGER DEFAULT 0,

  -- Progress tracking
  words_promoted INTEGER DEFAULT 0,
  words_demoted INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT learning_stats_unique UNIQUE(user_id, stat_date, stat_hour)
);

-- =====================================================
-- Indexes
-- =====================================================

-- user_profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON public.user_profiles(learning_level);

-- word_dictionary indexes
CREATE INDEX IF NOT EXISTS idx_word_dictionary_word ON public.word_dictionary(word);
CREATE INDEX IF NOT EXISTS idx_word_dictionary_frequency ON public.word_dictionary(frequency_rank);
CREATE INDEX IF NOT EXISTS idx_word_dictionary_difficulty ON public.word_dictionary(difficulty);

-- word_friends indexes
CREATE INDEX IF NOT EXISTS idx_word_friends_user_id ON public.word_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_word_friends_next_review ON public.word_friends(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_word_friends_mastery ON public.word_friends(user_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_word_friends_whitelist ON public.word_friends(user_id, is_in_whitelist);
CREATE INDEX IF NOT EXISTS idx_word_friends_word ON public.word_friends(word);

-- review_schedules indexes
CREATE INDEX IF NOT EXISTS idx_review_schedules_user_time ON public.review_schedules(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_review_schedules_pending ON public.review_schedules(user_id, scheduled_at)
  WHERE actual_review_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_review_schedules_word ON public.review_schedules(word_id);

-- chat_messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_word ON public.chat_messages(user_id, word_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(user_id, is_read)
  WHERE is_read = false AND is_deleted = false;

-- whitelist_words indexes
CREATE INDEX IF NOT EXISTS idx_whitelist_words_user ON public.whitelist_words(user_id, added_at DESC);

-- learning_stats indexes
CREATE INDEX IF NOT EXISTS idx_learning_stats_user_date ON public.learning_stats(user_id, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_learning_stats_daily ON public.learning_stats(user_id, stat_date)
  WHERE stat_hour IS NULL;
