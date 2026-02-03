import Link from "next/link";
import { MessageSquare, BookOpen, Star, User } from "lucide-react";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";

const navItems = [
  { href: "/app", label: "首页", icon: MessageSquare },
  { href: "/app/notebook", label: "单词本", icon: BookOpen },
  { href: "/app/whitelist", label: "白名单", icon: Star },
  { href: "/app/profile", label: "我的", icon: User },
];

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingLayout />}>
      <AuthGuard>
        <div className="flex flex-col h-screen bg-background">
          {/* Main Content */}
          <main className="flex-1 overflow-auto pb-16">
            {children}
          </main>

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center justify-center flex-1 h-full text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs mt-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </AuthGuard>
    </Suspense>
  );
}

function LoadingLayout() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-auto pb-16 flex items-center justify-center">
        <div className="text-foreground/60">加载中...</div>
      </main>
    </div>
  );
}
