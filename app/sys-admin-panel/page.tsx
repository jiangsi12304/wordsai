'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 秘密管理入口 - 部署后通过此路径访问管理后台
// 路径不易被普通用户发现
export default function SecretAdminPage() {
  const router = useRouter();

  useEffect(() => {
    // 直接重定向到管理页面
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">跳转中...</p>
    </div>
  );
}
