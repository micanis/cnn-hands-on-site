import React, { useState, useEffect } from 'react';

// DBから取得するデータの型
interface Material {
  id: number;
  title: string;
  category: string;
}

// ニュース表示用の型
interface NewsItem {
  date: string;
  text: string;
  tag: string;
}

export default function WelcomeTab() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 全資料を取得
    fetch('${import.meta.env.PUBLIC_API_URL}/api/materials')
      .then(res => res.json())
      .then((data: Material[]) => {
        // IDが大きい順（新しい順）に並べ替え、最新の3件だけを取得
        const latestMaterials = [...data].reverse().slice(0, 3);
        
        // ニュースの形式に変換
        const generatedNews = latestMaterials.map(item => ({
          date: "New", // 必要に応じてDBのcreated_at等に置き換え可能
          text: `新しい${item.category === 'slide' ? 'スライド' : 'アイテム'}「${item.title}」が公開されました。`,
          tag: item.category === 'slide' ? 'Slides' : 'Items'
        }));
        
        setNews(generatedNews);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("News fetch error:", err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto animate-fade-in pointer-events-auto">
      <div className="text-center py-6 sm:py-10 mb-8 border-b border-gray-100 dark:border-neutral-800">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white leading-tight">
          CNNを用いた画像認識の<br />仕組みと実装へようこそ
        </h1>
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-gray-200">
          <span className="w-2 h-6 bg-pink-400 rounded-full inline-block"></span>最新情報
        </h2>
        
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-gray-500 text-sm animate-pulse">最新情報を読み込み中...</p>
          ) : news.length > 0 ? (
            news.map((item, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/50 border border-transparent hover:border-pink-200 dark:hover:border-pink-900/30 transition-colors">
                <span className="text-sm font-mono text-pink-500 font-bold w-12">{item.date}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded w-fit
                  ${item.tag === 'Slides' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}
                `}>
                  {item.tag}
                </span>
                <p className="text-gray-700 dark:text-gray-300 text-sm">{item.text}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">現在、新しいお知らせはありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}