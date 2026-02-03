-- Add metadata column to word_friends for storing extended word information
ALTER TABLE public.word_friends
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add next_review_at column if it doesn't exist
ALTER TABLE public.word_friends
ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ DEFAULT NOW();
