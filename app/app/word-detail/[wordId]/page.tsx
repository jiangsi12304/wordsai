"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Volume2,
  BookOpen,
  Lightbulb,
  Hash,
  RotateCcw,
  ArrowLeftRight,
  Eye,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export default function WordDetailPage({ params }: { params: Promise<{ wordId: string }> }) {
  const { wordId } = use(params);
  const router = useRouter();

  const [word, setWord] = useState<any>(null);
  const [extendedData, setExtendedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [checkedCache, setCheckedCache] = useState(false);
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    fetchWord();
  }, [wordId]);

  // 获取单词后，检查是否需要生成详细内容
  useEffect(() => {
    if (word && !checkedCache) {
      setCheckedCache(true);

      // 检查 metadata 是否为空或内容不足（与 API 保持一致）
      const hasMetadata = word.metadata &&
        Object.keys(word.metadata).length > 0 &&
        (word.metadata.detailedDefinitions || word.metadata.etymology || word.metadata.synonyms);

      if (!hasMetadata) {
        console.log("没有缓存的详细数据，开始 AI 生成...");
        generateExtendedData();
      } else {
        console.log("使用缓存的详细数据");
      }
    }
  }, [word, checkedCache]);

  const fetchWord = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("word_friends")
        .select("*")
        .eq("id", wordId)
        .single();

      if (error) throw error;
      setWord(data);

      // 获取 metadata 中的扩展数据（如果有）
      const hasMetadata = data.metadata &&
        Object.keys(data.metadata).length > 0 &&
        (data.metadata.detailedDefinitions || data.metadata.etymology || data.metadata.synonyms);

      if (hasMetadata) {
        setExtendedData(data.metadata);
      }
    } catch (error) {
      console.error("Failed to fetch word:", error);
    } finally {
      setLoading(false);
    }
  };

  // 生成详细单词数据
  const generateExtendedData = async () => {
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch(`/api/words/${wordId}/generate`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Generate API error:", data.error);
        setGenerateError(data.error || "生成失败，请重试");
        return;
      }

      // 生成成功后，重新从数据库获取最新数据
      await fetchWord();
    } catch (error) {
      console.error("Failed to generate extended data:", error);
      setGenerateError("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const playPronunciation = () => {
    if (isPlaying) return;
    setIsPlaying(true);

    const wordText = word?.word || "";
    const pronunciation = word?.pronunciation || "";

    // 优先使用扩展数据中的音频URL（如果有）
    const audioUrl = extendedData?.audio_url;

    // 定义多个音频源
    const audioSources = [
      // 1. 扩展数据中的音频URL（如果有）
      audioUrl && { url: audioUrl, name: "扩展数据音频" },
      // 2. 有道词典API
      {
        url: `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(wordText)}`,
        name: "有道词典",
      },
      // 3. Google TTS API
      {
        url: `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(wordText)}`,
        name: "Google TTS",
      },
      // 4. 浏览器TTS作为最后手段
      { url: "tts", name: "浏览器TTS" },
    ];

    const tryPlayAudio = async (sources: typeof audioSources) => {
      if (sources.length === 0) {
        setIsPlaying(false);
        return;
      }

      const source = sources[0];

      if (source.url === "tts") {
        // 使用浏览器 TTS
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(wordText);
          utterance.lang = "en-US";
          utterance.rate = 0.8;
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => setIsPlaying(false);
          speechSynthesis.speak(utterance);
          return;
        } else {
          throw new Error("浏览器不支持语音合成");
        }
      }

      // 使用在线音频
      const audio = new Audio(source.url);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = async () => {
        console.warn(`音频源 ${source.name} 失败，尝试下一个...`);
        await tryPlayAudio(sources.slice(1));
      };

      audio.play().catch(() => {
        console.warn(`音频源 ${source.name} 播放失败，尝试下一个...`);
        tryPlayAudio(sources.slice(1));
      });
    };

    tryPlayAudio(audioSources).catch((error) => {
      console.error("所有音频源都失败了:", error);
      setIsPlaying(false);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!word) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-muted-foreground mb-4">单词不存在</p>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  // 获取定义（优先使用扩展数据）
  const definitions = extendedData?.detailedDefinitions || word.definitions || [];
  const synonyms = extendedData?.synonyms || [];
  const antonyms = extendedData?.antonyms || [];
  const similarWords = extendedData?.similarWords || [];
  const etymology = extendedData?.etymology || "";
  const memoryTips = extendedData?.memoryTips || [];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">单词档案</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateExtendedData}
            disabled={generating}
            className="text-xs text-foreground/60 hover:text-primary"
          >
            {generating ? "生成中..." : "重新生成"}
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Word Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <h2 className="text-4xl font-bold">{word.word}</h2>
            <button
              onClick={playPronunciation}
              className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <Volume2
                className={`w-7 h-7 text-primary ${
                  isPlaying ? "animate-pulse" : ""
                }`}
              />
            </button>
          </div>
          {word.pronunciation && (
            <p className="text-muted-foreground text-lg mb-2">
              {word.pronunciation}
            </p>
          )}
          {word.part_of_speech && (
            <div className="flex justify-center gap-2">
              {Array.isArray(word.part_of_speech) ? (
                word.part_of_speech.map((pos: string, i: number) => (
                  <Badge key={i} variant="secondary">
                    {pos}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary">{word.part_of_speech}</Badge>
              )}
            </div>
          )}
        </div>

        {/* No Data Prompt - Generate Now */}
        {!generating && (!extendedData || Object.keys(extendedData).length === 0) && (
          <div
            className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl p-5 text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={generateExtendedData}
          >
            <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              生成详细单词讲解
            </p>
            <p className="text-xs text-foreground/60">
              点击让 AI 为你生成释义、记忆技巧、词根词缀等内容
            </p>
          </div>
        )}

        {/* Generating Indicator */}
        {generating && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
              <span className="text-sm">AI 正在为你生成详细的单词讲解...</span>
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            </div>
          </div>
        )}

        {/* Generate Error */}
        {!generating && generateError && (
          <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{generateError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={generateExtendedData}
              className="text-xs"
            >
              重试
            </Button>
          </div>
        )}

        {/* AI Self Introduction */}
        {word.ai_self_intro && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-2xl p-5 border border-yellow-200 dark:border-yellow-900">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                AI 自我介绍
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-yellow-900 dark:text-yellow-100 whitespace-pre-line">
              {word.ai_self_intro}
            </p>
            {word.ai_name && (
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                — {word.ai_name}
              </p>
            )}
          </div>
        )}

        {/* Detailed Definitions */}
        {definitions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">详细释义</h3>
            </div>
            <div className="space-y-3">
              {definitions.map((def: any, i: number) => (
                <div
                  key={i}
                  className="bg-muted/30 rounded-xl p-4 border-l-4 border-primary"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <Badge variant="outline" className="flex-shrink-0">
                      {typeof def === "object" ? def.partOfSpeech || "n" : "n"}
                    </Badge>
                    <span className="font-medium">
                      {typeof def === "object" ? def.definition : def}
                    </span>
                  </div>
                  {typeof def === "object" && def.chinese && (
                    <p className="text-sm text-foreground/70 mt-1">
                      {def.chinese}
                      {def.example && (
                        <span className="block mt-2 text-foreground/60">
                          例：{def.example}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Tips */}
        {memoryTips.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold">记忆技巧</h3>
            </div>
            <div className="space-y-2">
              {memoryTips.map((tip: string, i: number) => (
                <div
                  key={i}
                  className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 text-sm"
                >
                  <span className="text-orange-600 dark:text-orange-400 mr-2">
                    {i + 1}.
                  </span>
                  <span className="text-foreground/80">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Etymology */}
        {etymology && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">词根词缀</h3>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 text-sm">
              {etymology}
            </div>
          </div>
        )}

        {/* Synonyms */}
        {synonyms.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowLeftRight className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">近义词</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {synonyms.map((syn: any, i: number) => (
                <div
                  key={i}
                  className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{syn.word}</span>
                    <span className="text-xs text-foreground/60">
                      {syn.pronunciation}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70 mt-1">
                    {syn.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Antonyms */}
        {antonyms.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold">反义词</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {antonyms.map((ant: any, i: number) => (
                <div
                  key={i}
                  className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ant.word}</span>
                    <span className="text-xs text-foreground/60">
                      {ant.pronunciation}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70 mt-1">
                    {ant.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Words */}
        {similarWords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">形近词（注意区分）</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {similarWords.map((sim: any, i: number) => (
                <div
                  key={i}
                  className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sim.word}</span>
                    <span className="text-xs text-foreground/60">
                      {sim.pronunciation}
                    </span>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    {sim.difference}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button */}
      <div className="p-4 border-t border-border bg-background">
        <Button
          onClick={() => router.push(`/app/chat/${word.id}`)}
          className="w-full h-12 text-base"
        >
          开始聊天
        </Button>
      </div>
    </div>
  );
}
