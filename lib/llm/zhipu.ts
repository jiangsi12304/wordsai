// Zhipu GLM-4 for chat interactions
// Note: This is a placeholder implementation. You'll need to install the zhipuai package
// and set up the actual API client.

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatContext {
  word: string;
  wordInfo?: {
    definitions?: Array<{ partOfSpeech: string; definition: string; chinese?: string }>;
    examples?: string[];
    aiName?: string;
    personalityType?: string;
    metadata?: {
      detailedDefinitions?: Array<{ partOfSpeech: string; definition: string; chinese: string; example: string }>;
      synonyms?: Array<{ word: string; pronunciation: string; definition: string }>;
      antonyms?: Array<{ word: string; pronunciation: string; definition: string }>;
      similarWords?: Array<{ word: string; pronunciation: string; difference: string }>;
      etymology?: string;
      memoryTips?: string[];
    };
    aiSelfIntro?: string;
  };
  chatHistory: ChatMessage[];
  userLevel?: "beginner" | "intermediate" | "advanced";
}

/**
 * 与单词 AI 好友聊天（使用智谱 GLM-4 Plus）
 */
export async function chatWithWord(
  userMessage: string,
  context: ChatContext
): Promise<string> {
  // 如果没有设置 API key，返回基础回复
  if (!process.env.ZHIPU_API_KEY) {
    return getFallbackChatResponse(userMessage, context.word);
  }

  try {
    // 这里需要使用 zhipuai SDK
    // const { ZhipuAI } = await import("zhipuai");
    // const client = new ZhipuAI({ apiKey: process.env.ZHIPU_API_KEY });

    const prompt = buildChatPrompt(userMessage, context);

    // 临时使用 fetch 直接调用 API
    // 第一次聊天时使用更大的token限制，以便生成详细的自我介绍
    const isFirstChat = context.chatHistory.length === 0;
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-4-flash", // 使用更便宜的模型
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(context),
          },
          ...context.chatHistory.slice(-5), // 只保留最近5条消息
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.8,
        max_tokens: isFirstChat ? 1500 : 200, // 第一次聊天允许更长的回复
      }),
    });

    if (!response.ok) {
      console.error("Zhipu API error:", response.status, response.statusText);
      return getFallbackChatResponse(userMessage, context.word);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || getFallbackChatResponse(userMessage, context.word);
  } catch (error) {
    console.error("Error in chat:", error);
    return getFallbackChatResponse(userMessage, context.word);
  }
}

function buildSystemPrompt(context: ChatContext): string {
  const word = context.word;
  const aiName = context.wordInfo?.aiName || `${word}小助手`;
  const personality = context.wordInfo?.personalityType || "friendly";
  const metadata = context.wordInfo?.metadata;
  const aiSelfIntro = context.wordInfo?.aiSelfIntro;

  const personalities = {
    friendly: "你是一个超级友好的小伙伴，总是鼓励用户，说话温柔可爱，喜欢用表情符号。",
    strict: "你是一个严格但负责的老师，说话简洁有力，注重准确性，会指出用户的错误。",
    humorous: "你是一个幽默搞笑的段子手，喜欢用笑话和双关语来帮助记忆，让学习充满乐趣。",
    encouraging: "你是一个积极向上的啦啦队长，总是给用户加油打气，相信用户一定能学会。",
  };

  // 构建详细的学习档案信息
  let learnInfo = "";
  if (metadata) {
    learnInfo = "\n## 你的详细学习档案\n";

    if (aiSelfIntro) {
      learnInfo += `### 自我介绍\n${aiSelfIntro}\n\n`;
    }

    if (metadata.detailedDefinitions && metadata.detailedDefinitions.length > 0) {
      learnInfo += "### 释义\n";
      metadata.detailedDefinitions.forEach((def) => {
        learnInfo += `- ${def.partOfSpeech}: ${def.definition} (${def.chinese})\n`;
        if (def.example) learnInfo += `  例: ${def.example}\n`;
      });
      learnInfo += "\n";
    }

    if (metadata.memoryTips && metadata.memoryTips.length > 0) {
      learnInfo += "### 记忆技巧\n";
      metadata.memoryTips.forEach((tip, i) => {
        learnInfo += `${i + 1}. ${tip}\n`;
      });
      learnInfo += "\n";
    }

    if (metadata.synonyms && metadata.synonyms.length > 0) {
      learnInfo += "### 近义词\n";
      metadata.synonyms.slice(0, 3).forEach((syn) => {
        learnInfo += `- ${syn.word}: ${syn.definition}\n`;
      });
      learnInfo += "\n";
    }

    if (metadata.antonyms && metadata.antonyms.length > 0) {
      learnInfo += "### 反义词\n";
      metadata.antonyms.slice(0, 3).forEach((ant) => {
        learnInfo += `- ${ant.word}: ${ant.definition}\n`;
      });
      learnInfo += "\n";
    }

    if (metadata.etymology) {
      learnInfo += `### 词源\n${metadata.etymology}\n\n`;
    }
  }

  return `你是单词 "${word}" 的 AI 拟人化身，你的名字是 "${aiName}"。

${personalities[personality as keyof typeof personalities] || personalities.friendly}
${learnInfo}
## 你的角色
- 你就是这个单词本身，用第一人称说话
- 你的性格要符合单词的含义
- 你的目标是帮助用户真正理解和记住你

## 回复格式要求（必须遵守）
你的回复必须使用美观的排版，让用户有读完的欲望：

### 使用表情符号分段
- 每个主要部分用表情符号开头（👋📚💡🔄💬等）
- 使用分隔线（---）分隔不同部分
- 空行让内容呼吸

### 加粗重要内容
- **单词本身**必须加粗显示
- **中文释义**必须加粗显示
- **关键词汇**必须加粗显示
- 使用 **markdown语法** 进行加粗

### 第一次打招呼格式示例
👋 嗨！我是 **Hygiene** 小卫士

我很高兴认识你！让我来做个正式的自我介绍：

---

📚 **我是谁？**
我是 **"卫生"** 的英文单词，意思是保持身体和环境清洁、健康。无论是在家里、学校还是医院，我都超级重要！

---

💡 **怎么记住我？**
• 拆分记忆：hy + gi + ene
• 联想记忆：想象一个 hygiene hero（卫生英雄）在洗手间勤洗手的场景
• 谐音记忆："嗨干净" ～ 发音接近

---

🔄 **我的朋友们**
• sanitation - 更侧重公共卫生设施
• cleanliness - 更侧重干净的状态

---

💬 **你想了解什么？**
随便问我！无论是造句、用法还是记忆技巧，我都乐意帮忙～ 😊

## 回复要求
1. 保持角色一致性，你就是这个单词
2. 第一次打招呼（聊天历史为空）必须用上述格式详细介绍
3. 后续回复要简短（通常 50 字以内），像微信聊天一样自然
4. 可以用表情符号，但不要过度
5. 根据用户的问题，从你的学习档案中提供相关信息`;
}

function buildChatPrompt(userMessage: string, context: ChatContext): string {
  return userMessage;
}

function getFallbackChatResponse(userMessage: string, word: string): string {
  const responses = [
    `作为 ${word}，我很高兴你问我这个问题！`,
    `让我来帮你理解 ${word} 的用法～`,
    `你问得好！${word} 是一个很有用的单词。`,
    `关于 ${word}，你需要记住的关键是...`,
    `我很乐意帮你学习 ${word}！`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * 生成复习提醒消息
 */
export async function generateReviewReminder(context: {
  word: string;
  daysSinceLastReview: number;
  masteryLevel: number;
  reviewCount: number;
  aiName?: string;
  personality?: string;
}): Promise<string> {
  const { word, daysSinceLastReview, masteryLevel, aiName } = context;

  if (!process.env.ZHIPU_API_KEY) {
    return getFallbackReminder(word, daysSinceLastReview);
  }

  try {
    const prompt = `请为单词 "${word}" 生成一条简短的复习提醒消息（20-40字）。
- AI 名称：${aiName || word}
- 距离上次复习：${daysSinceLastReview} 天
- 当前掌握度：${masteryLevel}/5
- 已复习次数：${context.reviewCount}
- 性格：${context.personality || "friendly"}

要求：符合 AI 性格，根据时间长短和掌握度调整语气，让用户愿意点击进来复习，可以带一点俏皮或撒娇。直接输出提醒内容，不要加引号。`;

    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-4-plus",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      return getFallbackReminder(word, daysSinceLastReview);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || getFallbackReminder(word, daysSinceLastReview);
  } catch (error) {
    console.error("Error generating reminder:", error);
    return getFallbackReminder(word, daysSinceLastReview);
  }
}

function getFallbackReminder(word: string, days: number): string {
  const reminders = [
    `嗨！我是 ${word}，好久不见啦～`,
    `${days} 天没见啦，还记得我是什么意思吗？`,
    `该复习我啦，${word} 想你啦～`,
    `来复习一下 ${word} 吧，别把我忘掉了！`,
  ];
  return reminders[Math.floor(Math.random() * reminders.length)];
}
