import React from 'react';

// ---- 汎用スケルトンパーツ ----

/** パルスアニメーション付きの矩形ブロック */
function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-200 dark:bg-neutral-800 rounded-lg animate-pulse ${className}`} />
  );
}

/** 1行テキスト風のスケルトン */
function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return <SkeletonBlock className={`${width} ${height}`} />;
}

// ---- タブ別スケルトン ----

/** Home タブ用：見出し + ニュース3件 */
export function WelcomeSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 見出し */}
      <div className="text-center py-4 sm:py-6 md:py-10 mb-4 sm:mb-8 border-b border-gray-100 dark:border-neutral-800">
        <SkeletonLine width="w-3/4 mx-auto" height="h-7 sm:h-10" />
        <SkeletonLine width="w-1/2 mx-auto" height="h-7 sm:h-10 mt-2" />
      </div>

      {/* セクション見出し */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <SkeletonBlock className="w-2 h-5 sm:h-6 rounded-full" />
        <SkeletonLine width="w-24" height="h-5" />
      </div>

      {/* ニュースカード × 3 */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <SkeletonLine width="w-10" height="h-4" />
              <SkeletonBlock className="w-14 h-5 rounded" />
              <SkeletonLine width="w-full sm:w-64" height="h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Slides タブ用：見出し + カードグリッド */
export function SlidesSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 見出し */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <SkeletonBlock className="w-2 h-6 sm:h-7 rounded-full" />
        <SkeletonLine width="w-32" height="h-6" />
      </div>

      {/* カードグリッド 2×2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50">
            <SkeletonLine width="w-12" height="h-4 mb-2" />
            <SkeletonLine width="w-3/4" height="h-5 mb-2" />
            <SkeletonLine width="w-1/2" height="h-3 mb-4 sm:mb-6" />
            <div className="flex gap-2">
              <SkeletonBlock className="flex-1 h-9 rounded-lg" />
              <SkeletonBlock className="flex-1 h-9 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Items タブ用：見出し + アイテムリスト */
export function ItemsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 見出し */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <SkeletonBlock className="w-2 h-6 sm:h-7 rounded-full" />
        <SkeletonLine width="w-48" height="h-6" />
      </div>

      {/* サブ見出し */}
      <SkeletonLine width="w-32" height="h-5 mb-3 sm:mb-4 mt-6 sm:mt-8" />

      {/* アイテムリスト */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <SkeletonLine width="w-12" height="h-4 mb-2" />
              <SkeletonLine width="w-48" height="h-5 mb-1" />
              <SkeletonLine width="w-32" height="h-3" />
            </div>
            <SkeletonBlock className="h-9 w-full sm:w-24 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Q&A タブ用：見出し + フォーム + 質問リスト */
export function QASkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* 見出し */}
      <div className="flex items-center gap-2 sm:gap-3 mb-2">
        <SkeletonBlock className="w-2 h-6 sm:h-7 rounded-full" />
        <SkeletonLine width="w-20" height="h-6" />
      </div>
      <SkeletonLine width="w-64" height="h-4 mb-4 sm:mb-6" />

      {/* フォームエリア */}
      <div className="rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/30 mb-6 sm:mb-10">
        <SkeletonLine width="w-32" height="h-4 mb-2" />
        <SkeletonBlock className="w-full h-10 rounded-lg mb-4" />
        <SkeletonLine width="w-20" height="h-4 mb-2" />
        <SkeletonBlock className="w-full h-28 sm:h-32 rounded-lg mb-4" />
        <div className="flex justify-end">
          <SkeletonBlock className="w-28 h-10 rounded-lg" />
        </div>
      </div>

      {/* 質問リスト */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <SkeletonBlock className="w-4 h-4 sm:w-5 sm:h-5 rounded" />
        <SkeletonLine width="w-24" height="h-5" />
      </div>
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 border-b border-gray-100 dark:border-neutral-700 pb-2 mb-2 sm:mb-3">
              <SkeletonBlock className="w-20 h-5 rounded" />
              <SkeletonLine width="w-28" height="h-4" />
            </div>
            <SkeletonLine width="w-full" height="h-4 mb-1" />
            <SkeletonLine width="w-3/4" height="h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
