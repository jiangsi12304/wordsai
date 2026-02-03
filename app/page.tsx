import Link from "next/link";
import { MessageSquare, Users, Star, Brain } from "lucide-react";
import { AuthButton } from "@/components/auth-button";
import { Suspense } from "react";
import { hasEnvVars } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-32 md:pt-32 md:pb-48">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Brain className="w-4 h-4" />
            <span>AI 驱动的单词学习新体验</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            WordMate 词友
          </h1>
          <p className="text-xl md:text-2xl text-foreground/70 mb-8 max-w-2xl mx-auto">
            把每个单词变成你的 AI 好友，在聊天中自然学习，告别死记硬背
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/sign-up"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              开始学习
            </Link>
            {hasEnvVars && (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            为什么选择 WordMate？
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8" />}
              title="拟人化对话"
              description="每个单词都是独特的 AI 好友，用聊天的方式学习更自然"
            />
            <FeatureCard
              icon={<Star className="w-8 h-8" />}
              title="智能复习"
              description="基于艾宾浩斯遗忘曲线，在最佳时机提醒你复习"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="白名单特训"
              description="难记单词加入白名单，获得针对性的强化训练"
            />
            <FeatureCard
              icon={<Brain className="w-8 h-8" />}
              title="AI 助手"
              description="DeepSeek 和 GLM-4 双模型驱动，更懂你的学习需求"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            准备好开始你的单词学习之旅了吗？
          </h2>
          <p className="text-foreground/70 mb-8">
            加入 WordMate，让学习变得像聊天一样轻松有趣
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            免费开始
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8">
        <p className="text-foreground/60">WordMate - 你的 AI 单词好友</p>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-foreground/60">{description}</p>
    </div>
  );
}
