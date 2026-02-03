import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/whitelist/train - 生成白名单训练题目
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const body = await request.json();
  const { wordId, stage } = body;

  if (!wordId) {
    return NextResponse.json({ error: "wordId is required" }, { status: 400 });
  }

  // 获取单词信息
  const { data: word } = await supabase
    .from("word_friends")
    .select("*")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (!word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  // 根据阶段生成不同的训练题目
  let questions: any[] = [];

  switch (stage || 1) {
    case 1:
      // 听力速记
      questions = generateListeningQuestions(word);
      break;
    case 2:
      // 完形填空
      questions = generateFillInBlanksQuestions(word);
      break;
    case 3:
      // 主动输出
      questions = generateOutputQuestions(word);
      break;
    default:
      // 综合模式，混合所有类型
      questions = [
        ...generateListeningQuestions(word),
        ...generateFillInBlanksQuestions(word),
        ...generateOutputQuestions(word),
      ];
  }

  return NextResponse.json({
    word: word.word,
    stage: stage || 1,
    questions,
  });
}

// 生成听力速记题目
function generateListeningQuestions(word: any) {
  const wordStr = word.word;
  // 获取正确的中文释义
  const meaning = getCorrectMeaning(word);

  return [
    {
      id: "listening-1",
      type: "listening",
      question: "听句子，选择正确的单词",
      audio: `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(
        wordStr
      )}`,
      sentence: `The word is "${wordStr}".`,
      options: shuffleArray([
        { text: wordStr, correct: true },
        { text: generateSimilarWord(wordStr), correct: false },
        { text: generateSimilarWord(wordStr), correct: false },
        { text: generateSimilarWord(wordStr), correct: false },
      ]),
      correctAnswer: wordStr,
    },
    {
      id: "listening-2",
      type: "choice",
      question: `"${wordStr}" 的意思是？`,
      options: shuffleArray([
        { text: meaning, correct: true },
        { text: generateWrongMeaning(), correct: false },
        { text: generateWrongMeaning(), correct: false },
        { text: generateWrongMeaning(), correct: false },
      ]),
      correctAnswer: meaning,
    },
  ];
}

// 生成完形填空题目
function generateFillInBlanksQuestions(word: any) {
  const wordStr = word.word;

  return [
    {
      id: "fillblanks-1",
      type: "fillblanks",
      question: "在空格处填入正确的单词",
      sentence: `I need to _____ my decision about the matter.`,
      hint: `提示：以 "${wordStr.charAt(0)}" 开头`,
      correctAnswer: wordStr,
    },
    {
      id: "fillblanks-2",
      type: "fillblanks",
      question: "选择正确的单词填空",
      sentence: `She felt _____ about the situation.`,
      options: shuffleArray([
        { text: wordStr, correct: true },
        { text: generateSimilarWord(wordStr), correct: false },
        { text: generateSimilarWord(wordStr), correct: false },
      ]),
      correctAnswer: wordStr,
    },
  ];
}

// 生成主动输出题目
function generateOutputQuestions(word: any) {
  const wordStr = word.word;

  return [
    {
      id: "output-1",
      type: "output",
      question: `请用 "${wordStr}" 造一个句子`,
      topics: ["日常", "工作", "学习", "旅行"],
      aiEvaluate: true,
    },
    {
      id: "output-2",
      type: "output",
      question: `用 "${wordStr}" 描述一个场景`,
      topics: ["场景描述", "情感表达", "故事讲述"],
      aiEvaluate: true,
    },
  ];
}

// 生成相似的错误单词
function generateSimilarWord(word: string): string {
  const similarWords: Record<string, string[]> = {
    hello: ["hallo", "hella", "hullo", "hell"],
    world: ["word", "work", "would", "whirl"],
    learn: ["lern", "leorn", "learned", "yearn"],
    friend: ["fiend", "frend", "freind", "fried"],
    time: ["tim", "teme", "teim", "team"],
    beautiful: ["beautyful", "beutiful", "beatiful", "bautiful"],
    important: ["importent", "impotant", "imortant", "importent"],
    remember: ["rember", "remembr", "remeber", "remembr"],
    different: ["diferent", "diffrent", "difernt", "diffirent"],
    believe: ["beleive", "belive", "belive", "beleve"],
  };

  const lowerWord = word.toLowerCase();
  if (similarWords[lowerWord]) {
    return similarWords[lowerWord][
      Math.floor(Math.random() * similarWords[lowerWord].length)
    ];
  }

  // 默认随机替换一个字母
  const chars = word.split("");
  const randomIndex = Math.floor(Math.random() * chars.length);
  const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  chars[randomIndex] = randomChar;
  return chars.join("");
}

// 生成错误的释义（避免与正确答案重复）
function generateWrongMeaning(): string {
  const wrongMeanings = [
    "快乐",
    "悲伤",
    "愤怒",
    "惊讶",
    "恐惧",
    "厌恶",
    "期待",
    "平静",
    "兴奋",
    "满足",
    "焦虑",
    "沮丧",
    "骄傲",
    "羞愧",
    "嫉妒",
    "同情",
    "冷漠",
    "热情",
    "孤独",
    "温馨",
    "痛苦",
    "舒适",
    "紧张",
    "放松",
    "困惑",
    "明白",
    "犹豫",
    "果断",
    "谨慎",
    "鲁莽",
  ];
  return wrongMeanings[Math.floor(Math.random() * wrongMeanings.length)];
}

// 打乱数组
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 获取单词的正确中文释义
function getCorrectMeaning(word: any): string {
  const definitions = word.definitions || [];
  const metadata = word.metadata || {};

  // 优先从 metadata 中获取详细释义
  if (metadata.detailedDefinitions && metadata.detailedDefinitions.length > 0) {
    const firstDef = metadata.detailedDefinitions[0];
    if (firstDef && firstDef.chinese) {
      return firstDef.chinese;
    }
  }

  // 从 definitions 字段获取
  if (Array.isArray(definitions) && definitions.length > 0) {
    const firstDef = definitions[0];
    if (typeof firstDef === "object") {
      const meaning = firstDef.chinese || firstDef.definition;
      if (meaning && !meaning.includes("Click") && !meaning.includes("重新生成")) {
        return meaning;
      }
    } else if (typeof firstDef === "string" && !firstDef.includes("Click")) {
      return firstDef;
    }
  }

  // 使用内置词库
  return getSimpleMeaning(word.word);
}

// 内置常见词释义库
function getSimpleMeaning(word: string): string {
  const commonWords: Record<string, string> = {
    "able": "能够的；有能力的",
    "happy": "快乐的；幸福的",
    "sad": "悲伤的；难过的",
    "big": "大的；巨大的",
    "small": "小的；微小的",
    "good": "好的；优秀的",
    "bad": "坏的；糟糕的",
    "fast": "快的；迅速的",
    "slow": "慢的；缓慢的",
    "new": "新的；新鲜的",
    "old": "旧的；老年的",
    "love": "爱；喜爱",
    "hate": "讨厌；憎恨",
    "like": "喜欢",
    "dislike": "不喜欢",
    "hope": "希望；期待",
    "wish": "希望；愿望",
    "fear": "恐惧；害怕",
    "angry": "生气的；愤怒的",
    "calm": "平静的；冷静的",
    "excited": "兴奋的",
    "tired": "累的；疲劳的",
    "hungry": "饥饿的",
    "thirsty": "口渴的",
    "beautiful": "美丽的；漂亮的",
    "ugly": "丑陋的",
    "smart": "聪明的；智能的",
    "stupid": "愚蠢的；笨的",
    "kind": "善良的；友好的",
    "mean": "刻薄的；吝啬的",
    "brave": "勇敢的",
    "shy": "害羞的；胆小的",
    "strong": "强壮的；坚强的",
    "weak": "弱的；虚弱的",
    "rich": "富有的",
    "poor": "贫穷的",
    "hot": "热的；辣的",
    "cold": "冷的；寒冷的",
    "warm": "温暖的",
    "cool": "凉爽的；酷的",
    "important": "重要的",
    "easy": "容易的；简单的",
    "hard": "困难的；坚硬的",
    "simple": "简单的",
    "complex": "复杂的",
    "clean": "干净的；清洁的",
    "dirty": "脏的",
    "open": "打开的；营业的",
    "close": "关闭的；亲密的",
    "start": "开始；启动",
    "stop": "停止；站点",
    "work": "工作；运作",
    "rest": "休息；剩余",
    "give": "给；提供",
    "take": "拿；取",
    "make": "制作；使得",
    "get": "得到；获得",
    "know": "知道；了解",
    "think": "认为；想",
    "see": "看见；明白",
    "look": "看；寻找",
    "come": "来；到达",
    "go": "去；走",
    "run": "跑；运行",
    "walk": "走；散步",
    "talk": "说话；交谈",
    "speak": "说话；演讲",
    "tell": "告诉；讲述",
    "say": "说；讲",
    "ask": "问；请求",
    "answer": "回答；答案",
    "help": "帮助；援助",
    "want": "想要；需要",
    "need": "需要；必要",
  };

  return commonWords[word.toLowerCase()] || `${word}（请点击重新生成获取释义）`;
}
