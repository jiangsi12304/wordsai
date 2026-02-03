"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Trash2,
  Star,
  Download,
  Check,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "mastery-desc" | "mastery-asc";
type FilterOption = "all" | "whitelist" | "mastered" | "learning";

interface WordItem {
  id: string;
  word: string;
  pronunciation: string | null;
  part_of_speech: string | null;
  definitions: string[] | null;
  mastery_level: number;
  review_count: number;
  correct_count: number;
  is_in_whitelist: boolean;
  created_at: string;
  ai_name: string | null;
}

export default function LibraryPage() {
  const router = useRouter();
  const [words, setWords] = useState<WordItem[]>([]);
  const [filteredWords, setFilteredWords] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // 筛选和排序
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    fetchWords();
  }, []);

  useEffect(() => {
    applyFilterAndSort();
  }, [words, filterOption, sortOption, searchQuery]);

  const fetchWords = async () => {
    try {
      const res = await fetch("/api/words");
      const data = await res.json();
      setWords(data.words || []);
    } catch (error) {
      console.error("Failed to fetch words:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilterAndSort = () => {
    let result = [...words];

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(query) ||
          w.definitions?.some((d) => d.toLowerCase().includes(query))
      );
    }

    // 状态过滤
    switch (filterOption) {
      case "whitelist":
        result = result.filter((w) => w.is_in_whitelist);
        break;
      case "mastered":
        result = result.filter((w) => w.mastery_level >= 4);
        break;
      case "learning":
        result = result.filter((w) => w.mastery_level < 4);
        break;
    }

    // 排序
    result.sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name-asc":
          return a.word.localeCompare(b.word);
        case "name-desc":
          return b.word.localeCompare(a.word);
        case "mastery-desc":
          return b.mastery_level - a.mastery_level;
        case "mastery-asc":
          return a.mastery_level - b.mastery_level;
        default:
          return 0;
      }
    });

    setFilteredWords(result);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === filteredWords.length && filteredWords.length > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWords.map((w) => w.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleBatchAction = async (action: string) => {
    if (selectedIds.size === 0) return;

    setBatchLoading(true);
    try {
      const res = await fetch("/api/words/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordIds: Array.from(selectedIds),
          action,
        }),
      });

      if (res.ok) {
        // 刷新列表
        await fetchWords();
        setSelectedIds(new Set());
        setSelectAll(false);
      } else {
        const data = await res.json();
        alert(data.error || "操作失败，请重试");
      }
    } catch (error) {
      console.error("Failed to perform batch action:", error);
      alert("网络错误，请重试");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个单词吗？`)) {
      return;
    }

    try {
      const res = await fetch("/api/words/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordIds: Array.from(selectedIds),
        }),
      });

      if (res.ok) {
        await fetchWords();
        setSelectedIds(new Set());
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Failed to delete words:", error);
    }
  };

  const handleExport = async () => {
    try {
      const dataToExport = selectedIds.size > 0
        ? filteredWords.filter((w) => selectedIds.has(w.id))
        : filteredWords;

      if (dataToExport.length === 0) {
        alert("没有可导出的数据");
        return;
      }

      // 生成 CSV
      const headers = ["单词", "发音", "词性", "释义", "掌握度", "复习次数", "正确次数", "是否在白名单"];
      const rows = dataToExport.map((w) => [
        w.word,
        w.pronunciation || "",
        w.part_of_speech || "",
        `"${(w.definitions || []).join("; ")}"`,
        w.mastery_level,
        w.review_count,
        w.correct_count,
        w.is_in_whitelist ? "是" : "否",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      // 下载
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `wordmate_export_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
    } catch (error) {
      console.error("Failed to export:", error);
    }
  };

  const filterLabels: Record<FilterOption, string> = {
    all: "全部",
    whitelist: "白名单",
    mastered: "已掌握",
    learning: "学习中",
  };

  const sortLabels: Record<SortOption, string> = {
    "date-desc": "最新添加",
    "date-asc": "最早添加",
    "name-asc": "名称 A-Z",
    "name-desc": "名称 Z-A",
    "mastery-desc": "掌握度 高→低",
    "mastery-asc": "掌握度 低→高",
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">我的词库</h1>
          <span className="text-sm text-foreground/60">
            {filteredWords.length} 个单词
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索单词或释义..."
            className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter and Sort */}
        <div className="flex gap-2 mt-3">
          {/* Filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="gap-1"
            >
              <Filter className="w-4 h-4" />
              {filterLabels[filterOption]}
              <ChevronDown className="w-4 h-4" />
            </Button>
            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-max">
                  {Object.entries(filterLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setFilterOption(key as FilterOption);
                        setShowFilterMenu(false);
                      }}
                      className={cn(
                        "block w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg",
                        filterOption === key && "bg-muted"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="gap-1"
            >
              {sortLabels[sortOption]}
              <ChevronDown className="w-4 h-4" />
            </Button>
            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-max">
                  {Object.entries(sortLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSortOption(key as SortOption);
                        setShowSortMenu(false);
                      }}
                      className={cn(
                        "block w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg",
                        sortOption === key && "bg-muted"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Word List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-2">
              {searchQuery ? "没有找到匹配的单词" : "词库是空的"}
            </h2>
            <p className="text-sm text-foreground/60 text-center">
              {searchQuery
                ? "尝试换个搜索词"
                : "开始添加单词来建立你的词库吧"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Select All Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
              <button
                onClick={toggleSelectAll}
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  selectAll
                    ? "bg-primary border-primary"
                    : "border-border"
                )}
              >
                {selectAll && <Check className="w-3 h-3 text-primary-foreground" />}
              </button>
              <span className="text-sm text-foreground/60">
                {selectedIds.size > 0
                  ? `已选择 ${selectedIds.size} 个`
                  : "全选"}
              </span>
            </div>

            {/* Word Items */}
            {filteredWords.map((word) => (
              <div
                key={word.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                  selectedIds.has(word.id) && "bg-muted/50"
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(word.id);
                  }}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                    selectedIds.has(word.id)
                      ? "bg-primary border-primary"
                      : "border-border"
                  )}
                >
                  {selectedIds.has(word.id) && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </button>

                {/* Word Info */}
                <div
                  className="flex-1 min-w-0"
                  onClick={() => router.push(`/app/word-detail/${word.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{word.word}</span>
                    {word.is_in_whitelist && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {word.pronunciation && (
                      <span className="text-xs text-foreground/60">
                        {word.pronunciation}
                      </span>
                    )}
                    {word.part_of_speech && (
                      <span className="text-xs text-foreground/40">
                        {word.part_of_speech}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/60 truncate mt-1">
                    {word.definitions?.join("; ")}
                  </p>
                </div>

                {/* Mastery Level */}
                <div className="flex-shrink-0 text-right">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-3 rounded-full",
                          i < word.mastery_level
                            ? "bg-primary"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-foreground/60 mt-1">
                    {word.mastery_level}/5
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {selectedIds.size > 0 && (
        <div className="border-t border-border bg-card p-3 safe-area-bottom">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchAction("addToWhitelist")}
              className="flex-1 gap-1"
            >
              <Star className="w-4 h-4" />
              加白名单
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchAction("removeFromWhitelist")}
              className="flex-1 gap-1"
            >
              <Star className="w-4 h-4" />
              移出
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
