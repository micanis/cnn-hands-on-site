import React, { useState } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

interface Question {
  id: number;
  session: string;
  content: string;
  created_at: string;
}

interface QATabProps {
  questions: Question[] | null;
  isLoading: boolean;
  onQuestionSubmit: () => Promise<void>;
}

function QATab({ questions, isLoading, onQuestionSubmit }: QATabProps) {
  const [session, setSession] = useState("全体的な質問");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 質問を送信する処理
  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/ask-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, content }),
      });

      if (res.ok) {
        setContent(""); // 入力欄をクリア
        onQuestionSubmit(); // 親コンポーネントに更新を通知
      } else {
        alert("送信に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full max-w-3xl mx-auto flex flex-col animate-fade-in pointer-events-auto pb-10">
      <h2 className="text-xl sm:text-2xl font-bold mb-2 dark:text-white flex items-center gap-2 sm:gap-3">
        <span className="w-2 h-6 sm:h-7 bg-orange-500 rounded-full inline-block" />
        質問箱
      </h2>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">講義内容やコードの実装に関する質問を匿名で送信できます。</p>
      
      {/* 投稿フォーム */}
      <div className="bg-orange-50/40 dark:bg-neutral-800/50 rounded-xl p-4 sm:p-6 border border-orange-100/70 dark:border-orange-900/40 mb-6 sm:mb-10 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">関連するセッション</label>
            <select 
              value={session} 
              onChange={(e) => setSession(e.target.value)}
              className="w-full p-2 sm:p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
            >
              <option>全体的な質問</option>
              <option>第1回について</option>
              <option>第2回について</option>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">質問内容</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2.5 sm:p-3 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 dark:text-white outline-none resize-none h-28 sm:h-32 text-sm focus:ring-2 focus:ring-orange-500 transition-shadow" 
              placeholder="質問を入力..."
            ></textarea>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-lg transition-all shadow-md cursor-pointer
                ${!content.trim() || isSubmitting 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'}
              `}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? "送信中..." : "送信する"}
            </button>
          </div>
        </div>
      </div>

      {/* タイムライン（過去の質問一覧） */}
      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 dark:text-gray-200 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
        みんなの質問
      </h3>
      {isLoading && <p className="text-gray-500 text-sm animate-pulse">質問を読み込み中...</p>}
      <div className="space-y-4">
        {questions && questions.length > 0 ? (
          questions.map((q) => (
            <div key={q.id} className="p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col gap-2 sm:gap-3 hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 border-b border-gray-100 dark:border-neutral-700 pb-2">
                <span className="text-xs font-bold px-2 py-0.5 sm:py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded w-fit">
                  {q.session}
                </span>
                <span className="text-xs text-gray-400 font-mono">{q.created_at}</span>
              </div>
              <p className="text-gray-700 dark:text-gray-200 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                {q.content}
              </p>
            </div>
          ))
        ) : !isLoading && (
          <p className="text-gray-500 text-sm text-center py-8">まだ質問はありません。</p>
        )}
      </div>
    </div>
  );
}

export default React.memo(QATab);
