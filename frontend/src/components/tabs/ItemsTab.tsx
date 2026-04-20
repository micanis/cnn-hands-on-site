import React, { useState } from 'react';
import { Upload, Download, Loader2, Trash2 } from 'lucide-react';
import type { Material } from '../../types';
import type { Locale } from '../../i18n/translations';
import { t } from '../../i18n/translations';

interface ItemsTabProps {
  isAdmin?: boolean;
  items: Material[] | null;
  isLoading: boolean;
  onUploadSuccess: () => Promise<void>;
  locale: Locale;
}

function ItemsTab({ isAdmin = false, items, isLoading, onUploadSuccess, locale }: ItemsTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("slide");
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownload = (fileName: string) => {
    if (!fileName) return;
    const apiUrl = import.meta.env.DEV
      ? (import.meta.env.PUBLIC_API_URL_LOCAL || import.meta.env.PUBLIC_API_URL)
      : import.meta.env.PUBLIC_API_URL;
    const url = `${apiUrl}/api/download-url?filename=${fileName}&action=view`;
    window.open(url, '_blank');
  };

  const handleUpload = async () => {
    if (!file || !title) return;
    setIsUploading(true);
    setMessage(t('items', 'getUrl', locale));

    try {
      const contentType = file.type || 'application/octet-stream';
      const apiUrl = import.meta.env.DEV
        ? (import.meta.env.PUBLIC_API_URL_LOCAL || import.meta.env.PUBLIC_API_URL)
        : import.meta.env.PUBLIC_API_URL;

      const urlRes = await fetch(`${apiUrl}/api/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(contentType)}`);
      const { uploadUrl } = await urlRes.json();
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
      await fetch(`${apiUrl}/api/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, pages: 0, category, file_path: file.name })
      });

      setMessage(t('items', 'uploadDone', locale));
      setFile(null); setTitle("");
      onUploadSuccess();
    } catch (err) {
      console.error(err);
      setMessage(t('common', 'error', locale));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number, itemTitle: string) => {
    if (!confirm(`「${itemTitle}」${t('common', 'confirmDelete', locale)}`)) return;
    try {
      const apiUrl = import.meta.env.DEV
        ? (import.meta.env.PUBLIC_API_URL_LOCAL || import.meta.env.PUBLIC_API_URL)
        : import.meta.env.PUBLIC_API_URL;
      await fetch(`${apiUrl}/api/materials/${id}`, { method: 'DELETE' });
      onUploadSuccess();
    } catch (err) {
      console.error(err);
      alert(t('common', 'deleteFailed', locale));
    }
  };

  return (
    <div className="h-full max-w-4xl mx-auto animate-fade-in pointer-events-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 dark:text-white flex items-center gap-2 sm:gap-3">
        <span className="w-2 h-6 sm:h-7 bg-emerald-400 rounded-full inline-block" />
        {t('items', 'heading', locale)}
      </h2>

      {isAdmin && (
        <div className="mb-8 sm:mb-10 p-4 sm:p-6 rounded-2xl border-2 border-dashed border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-neutral-800/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('items', 'titleLabel', locale)} <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder={t('items', 'titleHint', locale)}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('items', 'category', locale)}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="slide">{t('items', 'catSlide', locale)}</option>
                <option value="item">{t('items', 'catItem', locale)}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <input
                type="file"
                onChange={handleFileChange}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || !title || isUploading}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg
              ${!file || !title || isUploading
                  ? 'bg-gray-300 dark:bg-neutral-700 cursor-not-allowed opacity-50 text-gray-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'}
            `}
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {isUploading ? t('items', 'uploading', locale) : t('items', 'uploadBtn', locale)}
            </button>

            {message && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{message}</p>}
          </div>
        </div>
      )}

      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 dark:text-gray-200 mt-6 sm:mt-8">{t('items', 'listHeading', locale)}</h3>
      {isLoading && <p className="text-gray-500 text-sm animate-pulse">{t('common', 'loading', locale)}</p>}
      <div className="space-y-4">
        {items && items.map(item => (
          <div key={item.id} className="p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1 sm:mb-2 inline-block">Item</span>
              <h4 className="font-bold dark:text-white text-base sm:text-lg truncate">{item.title}</h4>
              <p className="text-xs text-gray-400 mt-1 truncate">{item.file_path}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDownload(item.file_path)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50 rounded-lg text-sm font-semibold cursor-pointer transition-colors w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                {t('common', 'open', locale)}
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title={t('common', 'delete', locale)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {!isLoading && items?.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">{t('items', 'noItems', locale)}</p>
        )}
      </div>
    </div>
  );
}

export default React.memo(ItemsTab);
