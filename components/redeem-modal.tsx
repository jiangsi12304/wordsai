'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Crown, Check, Loader2 } from 'lucide-react';

export default function RedeemModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    // 清理兑换码
    const cleanCode = code.replace(/[^A-Z0-9]/gi, '');

    if (cleanCode.length !== 12) {
      setError(`请输入12位兑换码（当前${cleanCode.length}位）`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '兑换失败');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // 可选：刷新用户数据或跳转到其他页面
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">兑换码升级</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-foreground/60">
                  输入您购买后获得的兑换码来升级会员
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm">
                  兑换码
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="ABCD-1234-EFGH-5678"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-center text-lg tracking-wider"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground text-center">
                  请输入12位兑换码（格式：XXXX-XXXX-XXXX 或直接输入12位字符）
                </p>
                {code && (
                  <p className="text-xs text-muted-foreground text-center">
                    已输入 {code.replace(/[^A-Z0-9]/gi, '').length} / 12 位
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || code.replace(/[^A-Z0-9]/gi, '').length < 12}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    兑换中...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    立即兑换
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => window.open('/pay', '_blank')}
                  className="text-sm text-primary hover:underline"
                >
                  还没有兑换码？去购买 →
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">
                兑换成功！
              </h3>
              <p className="text-sm text-foreground/60">
                正在为您升级会员...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
