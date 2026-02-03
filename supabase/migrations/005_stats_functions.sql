-- WordMate Statistics Functions
-- Migration: 005_stats_functions.sql
-- Description: Add helper functions for statistics

-- Function to increment a stat value
CREATE OR REPLACE FUNCTION public.increment_stat(
  p_user_id UUID,
  p_stat_date DATE,
  p_field TEXT,
  p_amount INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
  INSERT INTO public.learning_stats (user_id, stat_date, new_words_learned, reviews_completed, reviews_correct, reviews_forgot, time_spent_seconds)
  VALUES (p_user_id, p_stat_date,
    CASE WHEN p_field = 'new_words_learned' THEN p_amount ELSE 0 END,
    CASE WHEN p_field = 'reviews_completed' THEN p_amount ELSE 0 END,
    CASE WHEN p_field = 'reviews_correct' THEN p_amount ELSE 0 END,
    CASE WHEN p_field = 'reviews_forgot' THEN p_amount ELSE 0 END,
    CASE WHEN p_field = 'time_spent_seconds' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (user_id, stat_date)
  DO UPDATE SET
    new_words_learned = CASE
      WHEN p_field = 'new_words_learned' THEN learning_stats.new_words_learned + p_amount
      ELSE learning_stats.new_words_learned
    END,
    reviews_completed = CASE
      WHEN p_field = 'reviews_completed' THEN learning_stats.reviews_completed + p_amount
      ELSE learning_stats.reviews_completed
    END,
    reviews_correct = CASE
      WHEN p_field = 'reviews_correct' THEN learning_stats.reviews_correct + p_amount
      ELSE learning_stats.reviews_correct
    END,
    reviews_forgot = CASE
      WHEN p_field = 'reviews_forgot' THEN learning_stats.reviews_forgot + p_amount
      ELSE learning_stats.reviews_forgot
    END,
    time_spent_seconds = CASE
      WHEN p_field = 'time_spent_seconds' THEN learning_stats.time_spent_seconds + p_amount
      ELSE learning_stats.time_spent_seconds
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_stat TO authenticated;
