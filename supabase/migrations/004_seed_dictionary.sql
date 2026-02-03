-- WordMate Dictionary Seed Data
-- Migration: 004_seed_dictionary.sql
-- Description: Add common English words to the dictionary

-- Enable pg_trgm extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Clear existing data
TRUNCATE TABLE public.word_dictionary;

-- Insert common English words
INSERT INTO public.word_dictionary (word, pronunciation, part_of_speech, definitions, difficulty, frequency_rank, examples) VALUES
-- Level 1 words (beginner)
('hello', '/həˈloʊ/', ARRAY['interjection'], '[
  {"partOfSpeech": "interjection", "definition": "Used as a greeting or to begin a phone conversation", "chinese": "你好", "example": "Hello, how are you?"}
]'::jsonb, 1, 1, '[{"sentence": "Hello, nice to meet you!", "translation": "你好，很高兴认识你！"}]'),

('world', '/wɜːrld/', ARRAY['noun'], '[
  {"partOfSpeech": "noun", "definition": "The earth, together with all of its countries and peoples", "chinese": "世界", "example": "Traveling around the world is my dream."}
]'::jsonb, 1, 5, '[{"sentence": "The world is full of wonders.", "translation": "世界充满了奇迹。"}]'),

('learn', '/lɜːrn/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To gain knowledge or skill", "chinese": "学习", "example": "I want to learn English."}
]'::jsonb, 1, 10, '[{"sentence": "You learn something new every day.", "translation": "你每天都能学到新东西。"}]'),

('friend', '/frend/', ARRAY['noun'], '[
  {"partOfSpeech": "noun", "definition": "A person you know well and like", "chinese": "朋友", "example": "She is my best friend."}
]'::jsonb, 1, 20, '[{"sentence": "A friend in need is a friend indeed.", "translation": "患难见真情。"}]'),

('time', '/taɪm/', ARRAY['noun'], '[
  {"partOfSpeech": "noun", "definition": "The indefinite continued progress of existence", "chinese": "时间", "example": "Time flies when you are having fun."}
]'::jsonb, 1, 15, '[{"sentence": "Time waits for no one.", "translation": "时间不等人。"}]'),

-- Level 2 words (intermediate)
('beautiful', '/ˈbjuːtɪfl/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Pleasing the senses or mind aesthetically", "chinese": "美丽的", "example": "What a beautiful sunset!"}
]'::jsonb, 2, 100, '[{"sentence": "The view from here is beautiful.", "translation": "从这里看到的景色很美。"}]'),

('important', '/ɪmˈpɔːrtnt/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Of great significance or value", "chinese": "重要的", "example": "It is important to stay healthy."}
]'::jsonb, 2, 150, '[{"sentence": "This is an important decision.", "translation": "这是一个重要的决定。"}]'),

('remember', '/rɪˈmembər/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To have in or be able to bring to one''s mind", "chinese": "记住", "example": "I remember meeting him before."}
]'::jsonb, 2, 200, '[{"sentence": "Remember to lock the door.", "translation": "记得锁门。"}]'),

('different', '/ˈdɪfrənt/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Not the same as another or each other", "chinese": "不同的", "example": "We have different opinions."}
]'::jsonb, 2, 180, '[{"sentence": "Everyone is different.", "translation": "每个人都是不同的。"}]'),

('believe', '/bɪˈliːv/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To accept as true; feel sure of the truth of", "chinese": "相信", "example": "I believe you can do it."}
]'::jsonb, 2, 250, '[{"sentence": "Believe in yourself.", "translation": "相信你自己。"}]'),

-- Level 3 words (advanced)
('ambiguous', '/æmˈbɪɡjuəs/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Open to more than one interpretation; having a double meaning", "chinese": "模棱两可的", "example": "The ending of the movie was ambiguous."}
]'::jsonb, 4, 5000, '[{"sentence": "His reply was ambiguous.", "translation": "他的回复模棱两可。"}]'),

('perseverance', '/ˌpɜːrsəˈvɪrəns/', ARRAY['noun'], '[
  {"partOfSpeech": "noun", "definition": "Persistence in doing something despite difficulty", "chinese": "毅力", "example": "Success requires perseverance."}
]'::jsonb, 4, 8000, '[{"sentence": "Perseverance is key to success.", "translation": "毅力是成功的关键。"}]'),

('ephemeral', '/ɪˈfemərəl/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Lasting for a very short time", "chinese": "短暂的", "example": "Fashion is ephemeral."}
]'::jsonb, 5, 12000, '[{"sentence": "Fame can be ephemeral.", "translation": "名声可能是短暂的。"}]'),

('serendipity', '/ˌserənˈdɪpəti/', ARRAY['noun'], '[
  {"partOfSpeech": "noun", "definition": "The occurrence of events by chance in a happy way", "chinese": "意外发现", "example": "Meeting her was pure serendipity."}
]'::jsonb, 5, 15000, '[{"sentence": "It was serendipity that we met.", "translation": "我们相遇纯属意外的好运。"}]'),

('ubiquitous', '/juːˈbɪkwɪtəs/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Present, appearing, or found everywhere", "chinese": "无处不在的", "example": "Smartphones have become ubiquitous."}
]'::jsonb, 5, 10000, '[{"sentence": "Coffee shops are ubiquitous in this city.", "translation": "这座城市里咖啡店无处不在。"}]'),

-- More common words
('happy', '/ˈhæpi/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Feeling or showing pleasure or contentment", "chinese": "快乐的", "example": "I am so happy today!"}
]'::jsonb, 1, 50, '[{"sentence": "She has a happy family.", "translation": "她有一个幸福的家庭。"}]'),

('love', '/lʌv/', ARRAY['noun', 'verb'], '[
  {"partOfSpeech": "noun", "definition": "An intense feeling of deep affection", "chinese": "爱", "example": "Love makes the world go round."},
  {"partOfSpeech": "verb", "definition": "To feel deep affection for someone", "chinese": "爱", "example": "I love my family."}
]'::jsonb, 1, 30, '[{"sentence": "Love is patient and kind.", "translation": "爱是耐心和善良。"}]'),

('book', '/bʊk/', ARRAY['noun', 'verb'], '[
  {"partOfSpeech": "noun", "definition": "A written or printed work consisting of pages", "chinese": "书", "example": "I am reading a good book."},
  {"partOfSpeech": "verb", "definition": "To reserve accommodation or a ticket", "chinese": "预订", "example": "I need to book a hotel."}
]'::jsonb, 1, 40, '[{"sentence": "This book is very interesting.", "translation": "这本书很有趣。"}]'),

('make', '/meɪk/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To create, form, or produce something", "chinese": "制作", "example": "My mom will make a cake."}
]'::jsonb, 1, 25, '[{"sentence": "Make yourself at home.", "translation": "请别客气。"}]'),

('think', '/θɪŋk/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To have a particular opinion, belief, or idea", "chinese": "认为", "example": "I think this is correct."}
]'::jsonb, 1, 35, '[{"sentence": "Think before you speak.", "translation": "三思而后行。"}]'),

('go', '/ɡoʊ/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To move from one place to another", "chinese": "去", "example": "Let''s go home."}
]'::jsonb, 1, 3, '[{"sentence": "Go for your dreams.", "translation": "为你的梦想去奋斗。"}]'),

('see', '/siː/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To perceive with the eyes", "chinese": "看见", "example": "I can see the mountains."}
]'::jsonb, 1, 12, '[{"sentence": "See you later!", "translation": "回头见！"}]'),

('know', '/noʊ/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To be aware of through observation, inquiry, or information", "chinese": "知道", "example": "I know the answer."}
]'::jsonb, 1, 18, '[{"sentence": "Knowledge is power.", "translation": "知识就是力量。"}]'),

('come', '/kʌm/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To move or travel towards the speaker", "chinese": "来", "example": "Please come here."}
]'::jsonb, 1, 8, '[{"sentence": "Come and join us!", "translation": "来加入我们吧！"}]'),

('want', '/wɑːnt/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To have a desire to possess or do something", "chinese": "想要", "example": "I want to help you."}
]'::jsonb, 1, 22, '[{"sentence": "What do you want to eat?", "translation": "你想吃什么？"}]'),

('look', '/lʊk/', ARRAY['verb', 'noun'], '[
  {"partOfSpeech": "verb", "definition": "To direct one''s gaze toward someone or something", "chinese": "看", "example": "Look at the stars."},
  {"partOfSpeech": "noun", "definition": "An expression of someone''s facial appearance", "chinese": "表情", "example": "She had a sad look."}
]'::jsonb, 1, 28, '[{"sentence": "Look before you leap.", "translation": "三思而后行。"}]'),

('give', '/ɡɪv/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To present voluntarily and without expecting compensation", "chinese": "给予", "example": "Give me a hand."}
]'::jsonb, 1, 16, '[{"sentence": "Give it your best shot.", "translation": "尽你最大的努力。"}]'),

('find', '/faɪnd/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To discover or perceive something", "chinese": "发现", "example": "I found my keys."}
]'::jsonb, 1, 45, '[{"sentence": "Find your passion.", "translation": "找到你的激情所在。"}]'),

('tell', '/tel/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To communicate information to someone", "chinese": "告诉", "example": "Tell me a story."}
]'::jsonb, 1, 38, '[{"sentence": "Tell the truth.", "translation": "说实话。"}]'),

('ask', '/æsk/', ARRAY['verb'], '[
  {"partOfSpeech": "verb", "definition": "To say something in order to get information", "chinese": "询问", "example": "Can I ask you a question?"}
]'::jsonb, 1, 42, '[{"sentence": "Don''t be afraid to ask.", "translation": "不要害怕提问。"}]'),

('work', '/wɜːrk/', ARRAY['noun', 'verb'], '[
  {"partOfSpeech": "noun", "definition": "Activity involving mental or physical effort", "chinese": "工作", "example": "I have a lot of work to do."},
  {"partOfSpeech": "verb", "definition": "To be engaged in physical or mental activity", "chinese": "工作", "example": "I work from home."}
]'::jsonb, 1, 19, '[{"sentence": "Hard work pays off.", "translation": "努力工作会有回报。"}]'),

('good', '/ɡʊd/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Of a high quality or standard", "chinese": "好的", "example": "This is a good idea."}
]'::jsonb, 1, 7, '[{"sentence": "Good luck!", "translation": "祝你好运！"}]'),

('new', '/nuː/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Recently made, discovered, or created", "chinese": "新的", "example": "I bought a new car."}
]'::jsonb, 1, 11, '[{"sentence": "New year, new beginnings.", "translation": "新的一年，新的开始。"}]'),

('first', '/fɜːrst/', ARRAY['adjective', 'adverb', 'noun'], '[
  {"partOfSpeech": "adjective", "definition": "Coming before all others in time or order", "chinese": "第一的", "example": "She won first prize."}
]'::jsonb, 2, 55, '[{"sentence": "First things first.", "translation": "先做重要的事。"}]'),

('last', '/læst/', ARRAY['adjective', 'adverb', 'noun'], '[
  {"partOfSpeech": "adjective", "definition": "Coming after all others in time or order", "chinese": "最后的", "example": "This is my last chance."}
]'::jsonb, 2, 60, '[{"sentence": "Save the best for last.", "translation": "把最好的留到最后。"}]'),

('long', '/lɔːŋ/', ARRAY['adjective', 'adverb'], '[
  {"partOfSpeech": "adjective", "definition": "Measuring a great distance from end to end", "chinese": "长的", "example": "It was a long journey."}
]'::jsonb, 1, 48, '[{"sentence": "Long time no see!", "translation": "好久不见！"}]'),

('great', '/ɡreɪt/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Of an extent, amount, or intensity considerably above average", "chinese": "伟大的", "example": "He is a great leader."}
]'::jsonb, 2, 75, '[{"sentence": "Have a great day!", "translation": "祝你愉快！"}]'),

('little', '/ˈlɪtl/', ARRAY['adjective', 'adverb'], '[
  {"partOfSpeech": "adjective", "definition": "Small in size, amount, or degree", "chinese": "小的", "example": "A little progress is better than none."}
]'::jsonb, 1, 52, '[{"sentence": "Every little bit helps.", "translation": "积少成多。"}]'),

('own', '/oʊn/', ARRAY['adjective', 'verb'], '[
  {"partOfSpeech": "adjective", "definition": "Used with a possessive to emphasize that someone belongs to the person mentioned", "chinese": "自己的", "example": "Mind your own business."}
]'::jsonb, 2, 65, '[{"sentence": "Be your own boss.", "translation": "做自己的老板。"}]'),

('other', '/ˈʌðər/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Used to refer to a person or thing that is different or distinct from one already mentioned", "chinese": "其他的", "example": "Do you have any other questions?"}
]'::jsonb, 1, 58, '[{"sentence": "Each other is important.", "translation": "彼此很重要。"}]'),

('old', '/oʊld/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Having lived for a long time", "chinese": "老的", "example": "My grandfather is very old."}
]'::jsonb, 1, 54, '[{"sentence": "Old habits die hard.", "translation": "江山易改，本性难移。"}]'),

('right', '/raɪt/', ARRAY['adjective', 'adverb', 'noun'], '[
  {"partOfSpeech": "adjective", "definition": "True or correct as a fact", "chinese": "正确的", "example": "You are right."}
]'::jsonb, 1, 21, '[{"sentence": "Right here, right now.", "translation": "就在这里，就在现在。"}]'),

('big', '/bɪɡ/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Of considerable size or extent", "chinese": "大的", "example": "They live in a big house."}
]'::jsonb, 1, 23, '[{"sentence": "Think big, dream big.", "translation": "大胆想，大胆梦。"}]'),

('small', '/smɔːl/', ARRAY['adjective'], '[
  {"partOfSpeech": "adjective", "definition": "Of a size that is less than normal", "chinese": "小的", "example": "The room is quite small."}
]'::jsonb, 1, 49, '[{"sentence": "Small steps lead to big changes.", "translation": "小步子带来大变化。"}]'),

('help', '/help/', ARRAY['verb', 'noun'], '[
  {"partOfSpeech": "verb", "definition": "To make it easier for someone to do something", "chinese": "帮助", "example": "Can you help me?"}
]'::jsonb, 1, 26, '[{"sentence": "Help yourself.", "translation": "请自便。"}]');

-- Create index for faster lookups (regular index, pg_trgm is optional)
-- CREATE INDEX IF NOT EXISTS idx_word_dictionary_word_trgm ON public.word_dictionary USING gin (word gin_trgm_ops);
