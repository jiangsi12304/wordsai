"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SelfCheckModalProps {
  isOpen: boolean;
  word: string;
  onConfirm: (knows: boolean) => void;
}

export function SelfCheckModal({
  isOpen,
  word,
  onConfirm,
}: SelfCheckModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            自觉测试
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            你掌握单词 <span className="font-semibold text-foreground">"{word}"</span> 的主要意思了吗？
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onConfirm(false)}
            className="w-full h-12 text-base border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            不太确定，再教我一次
          </Button>
          <Button
            onClick={() => onConfirm(true)}
            className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
          >
            是的，我掌握了
          </Button>
        </div>

        {/* Close button */}
        <button
          onClick={() => onConfirm(true)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
