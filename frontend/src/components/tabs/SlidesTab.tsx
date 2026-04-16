// frontend/src/components/tabs/SlidesTab.tsx

import React, { useState, useEffect } from 'react';

interface Material {
  id: number;
  title: string;
  pages: number;
  category: string;
  file_path: string;
}

export default function SlidesTab() {
  const [slides, setSlides] = useState<Material[]>([]);

  useEffect(() => {
    // カテゴリを 'slide' に指定して取得
    fetch(`${import.meta.env.PUBLIC_API_URL}/api/materials?category=slide`)
      .then(res => res.json())
      .then(data => setSlides(data))
      .catch(err => console.error("API Error:", err));
  }, []);

  const handleAction = async (fileName: string, action: 'view' | 'download') => {
    if (!fileName) return;
    try {
      // Go APIを叩いて署名付きURLを取得
      const res = `${import.meta.env.PUBLIC_API_URL}/api/download-url?filename=${fileName}&action=view&action=${action}`
      // const data = await res.json();
      
      if (action === 'view') {
        // 閲覧: そのまま別タブで開く（ブラウザのビューワーに任せる）
        window.open(res, '_blank');
      } else {
        // ダウンロード: ファイルを一度React側のメモリに読み込み(Blob化)、
        // 強制的にローカルファイルとして保存させる
        
        // 1. GCSからファイルの実体をフェッチする
        const fileRes = await fetch(res);
        const blob = await fileRes.blob();
        
        // 2. メモリ上に一時的なローカルURLを作成
        const localUrl = window.URL.createObjectURL(blob);
        
        // 3. aタグを作って、一時URLとファイル名を指定してクリック
        const link = document.createElement('a');
        link.href = localUrl;
        link.download = fileName; // ここで保存時のファイル名を強制指定できます
        document.body.appendChild(link);
        link.click();
        
        // 4. お掃除（メモリ解放）
        document.body.removeChild(link);
        window.URL.revokeObjectURL(localUrl);
      }
    } catch (err) {
      console.error("エラー:", err);
      alert("処理に失敗しました。");
    }
  };

  return (
    <div className="h-full max-w-4xl mx-auto animate-fade-in pointer-events-auto">
      <h2 className="text-2xl font-bold mb-6 dark:text-white">講義スライド</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slides.map(slide => (
          <div key={slide.id} className="p-5 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors bg-white dark:bg-neutral-800/50 flex flex-col group">
            <div className="flex-1">
              <span className="text-sm font-bold text-blue-500 mb-2 inline-block">Slide</span>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 leading-snug">{slide.title}</h3>
              <p className="text-xs text-gray-400">{slide.file_path} • PDF</p>
            </div>
            <div className="flex gap-2 mt-6">
              {/* 閲覧ボタン */}
              <button 
                onClick={() => handleAction(slide.file_path, 'view')}
                className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                閲覧
              </button>
              
              {/* DLボタン */}
              <button 
                onClick={() => handleAction(slide.file_path, 'download')}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                DL
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}