import React, { useEffect, useState } from 'react';
import { Upload, Download, Loader2, } from 'lucide-react';

interface ItemsTabProps {
  isAdmin?: boolean
}

interface Material {
    id: number
    title: string
    category: string
    file_path: string
}

export default function ItemsTab({isAdmin = false}: ItemsTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("slide")
  const [title, setTitle] = useState("")
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<Material[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    fetch(`${import.meta.env.PUBLIC_API_URL}/api/materials?category=item`)
        .then(res => res.json())
        .then(data => setItems(data))
        .catch(err => console.error("API Error:", err))
  }, [])

  const handleDownload = async (fileName: string) => {
    if (!fileName) return
    try {
        const res = `${import.meta.env.PUBLIC_API_URL}/api/download-url?filename=${fileName}&action=view`
        // const data = await res.json();

        window.open(res, '_blank')
    } catch (err) {
        console.error("download error:", err)
        alert("Failed to download")
    }
  }

  const handleUpload = async () => {
    if (!file || !title) return;

    setIsUploading(true);
    setMessage("署名付きURLを取得中...");

    try {
      const contentType = file.type || 'application/octet-stream';
      // 1. 署名付きURL取得
      const urlRes = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(contentType)}`);
      const { uploadUrl } = await urlRes.json();

      // 2. GCSへPUT
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });

      // 3. GoのDB保存APIを叩く
      await fetch(`${import.meta.env.PUBLIC_API_URL}/api/save-material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          pages: 0, // PDFのページ数取得ロジックを入れるか、一旦0で
          category: category,
          file_path: file.name
        })
      });

      setMessage("公開リストへの登録が完了しました！");
      setFile(null); setTitle("");
    } catch (err) {
      console.error(err);
      setMessage("エラーが発生しました。");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full max-w-4xl mx-auto animate-fade-in pointer-events-auto">
      <h2 className="text-2xl font-bold mb-6 dark:text-white">配布アイテム & アップロード</h2>
      
      {isAdmin && (
        <div className="mb-10 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/30">
        
        {/* 追加した入力フォーム部分 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">タイトル <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              placeholder="例: 第1回 授業スライド" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">カテゴリ</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="slide">発表スライド</option>
              <option value="item">補足アイテム</option>
            </select>
          </div>
        </div>

        {/* 元の美しいファイル選択＆ボタン部分 */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              onChange={handleFileChange} 
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          
          <button 
            onClick={handleUpload}
            disabled={!file || !title || isUploading}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg
              ${!file || !title || isUploading 
                ? 'bg-gray-300 dark:bg-neutral-700 cursor-not-allowed opacity-50 text-gray-500' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}
            `}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {isUploading ? "送信中..." : "GCSへアップロード"}
          </button>
          
          {message && <p className="text-sm font-medium text-blue-500">{message}</p>}
        </div>
      </div>
      )}
      {/* アップロードセクション（管理者/自分用） */}
      

      {/* 配布済みアイテムリスト */}
      <h3 className="text-lg font-bold mb-4 dark:text-gray-200 mt-8">公開中のアイテム</h3>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="p-5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 flex justify-between items-center group hover:border-blue-300 transition-colors">
            <div>
              <h4 className="font-bold dark:text-white text-lg">{item.title}</h4>
              <p className="text-xs text-gray-400 mt-1">{item.file_path}</p>
            </div>
            <button 
              onClick={() => handleDownload(item.file_path)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-600 rounded-lg text-sm font-semibold cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              開く
            </button>
          </div>
        ))}
        
        {items.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">公開中のアイテムはありません。</p>
        )}
      </div>
    </div>
  );
}