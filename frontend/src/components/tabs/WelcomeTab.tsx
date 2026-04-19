import React from 'react';

// App.tsxから渡されるpropsの型
interface NewsItem {
  date: string;
  text: string;
  tag: string;
}

interface WelcomeTabProps {
  news: NewsItem[] | null;
  isLoading: boolean;
}

function WelcomeTab({ news, isLoading }: WelcomeTabProps) {
  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto animate-fade-in pointer-events-auto">
      <div className="text-center py-4 sm:py-6 md:py-10 mb-4 sm:mb-8 border-b border-gray-100 dark:border-neutral-800">
        <div className="flex items-center justify-center gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
            CNNを用いた画像認識の仕組みと実装<br />へようこそ
          </h1>
        </div>
      </div>
      
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 dark:text-gray-200">
          <span className="w-2 h-5 sm:h-6 bg-pink-400 rounded-full inline-block"></span>最新情報
        </h2>
        
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-gray-500 text-sm animate-pulse">最新情報を読み込み中...</p>
          ) : news && news.length > 0 ? (
            news.map((item, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/50 border border-transparent hover:border-pink-200 dark:hover:border-pink-900/30 transition-colors">
                <span className="text-xs sm:text-sm font-mono text-pink-500 font-bold w-fit sm:w-12">{item.date}</span>
                <span className={`text-xs font-bold px-2 py-0.5 sm:py-1 rounded w-fit
                  ${item.tag === 'Slides' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}
                `}>
                  {item.tag}
                </span>
                <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{item.text}</p>
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

export default React.memo(WelcomeTab);
