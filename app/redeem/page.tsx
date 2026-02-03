'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function RedeemPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    // 清理兑换码（去除所有非字母数字字符和空格）
    const cleanCode = code.replace(/[^A-Z0-9]/gi, '');

    if (cleanCode.length !== 12) {
      setError(`兑换码格式不正确，需要12位字符（当前${cleanCode.length}位）`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '兑换失败');
        return;
      }

      setSuccess(true);
      setCode('');
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理输入变化 - 直接使用用户输入，不做格式化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          兑换码
        </h1>

        <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20">
          {!success ? (
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-white">
                  输入兑换码
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="ABCD-1234-EFGH-5678"
                  value={code}
                  onChange={handleInputChange}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center text-xl tracking-wider"
                  autoComplete="off"
                />
                <p className="text-white/50 text-xs text-center">
                  请输入12位兑换码（格式：XXXX-XXXX-XXXX 或直接输入12位字符）
                </p>
                {code && (
                  <p className="text-white/60 text-xs text-center">
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
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? '兑换中...' : '兑换'}
              </Button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                兑换成功！
              </h2>
              <p className="text-white/70 mb-6">
                兑换码已成功使用
              </p>
              <Button
                onClick={() => setSuccess(false)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                继续兑换
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
