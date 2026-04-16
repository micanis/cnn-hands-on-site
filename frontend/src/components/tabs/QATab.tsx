import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

interface Question {
  id: number;
  session: string;
  content: string;
  created_at: string;
}

export default function QATab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState("全体的な質問");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 質問一覧を取得する関数
  const fetchQuestions = () => {
    fetch('${import.meta.env.PUBLIC_API_URL}/api/questions')
      .then(res => res.json())
      .then(data => setQuestions(data))
      .catch(err => console.error("API Error:", err));
  };

  // 初回マウント時に質問を取得
  useEffect(() => {
    fetchQuestions();
  }, []);

  // 質問を送信する処理
  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('${import.meta.env.PUBLIC_API_URL}/api/ask-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, content }),
      });

      if (res.ok) {
        setContent(""); // 入力欄をクリア
        fetchQuestions(); // 最新のリストを再取得して画面を更新
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
      <h2 className="text-2xl font-bold mb-2 dark:text-white">質問箱</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">講義内容やコードの実装に関する質問を匿名で送信できます。</p>
      
      {/* 投稿フォーム */}
      <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-6 border border-gray-100 dark:border-neutral-700 mb-10 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">関連するセッション</label>
            <select 
              value={session} 
              onChange={(e) => setSession(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
            >
              <option>全体的な質問</option>
              <option>第1回について</option>
              <option>第2回について</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">質問内容</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 dark:text-white outline-none resize-none h-32 focus:ring-2 focus:ring-orange-500 transition-shadow" 
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
      <h3 className="text-lg font-bold mb-4 dark:text-gray-200 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-orange-500" />
        みんなの質問
      </h3>
      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">まだ質問はありません。</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="p-5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-neutral-700 pb-2">
                <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                  {q.session}
                </span>
                <span className="text-xs text-gray-400 font-mono">{q.created_at}</span>
              </div>
              <p className="text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                {q.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}