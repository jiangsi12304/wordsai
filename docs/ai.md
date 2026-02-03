# ai能力调用参考

使用openrouter调用deepseek的API，参考如下代码：

'''javasctipt
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<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>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>", // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "<YOUR_SITE_NAME>", // Optional. Site title for rankings on openrouter.ai.
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "tngtech/deepseek-r1t2-chimera:free",
    messages: [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  });

  console.log(completion.choices[0].message);
}

main();
'''


