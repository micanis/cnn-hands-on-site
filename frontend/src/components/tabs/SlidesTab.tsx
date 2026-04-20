import React, { useState } from 'react';
import { LuPencil, LuTrash2, LuX, LuCheck } from 'react-icons/lu';
import type { Material } from '../../types';
import { materialApi, storageApi } from '../../services/api';
import type { Locale } from '../../i18n/translations';
import { t } from '../../i18n/translations';

interface SlidesTabProps {
  isAdmin?: boolean;
  slides: Material[] | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  locale: Locale;
}

function SlidesTab({ isAdmin = false, slides, isLoading, onRefresh, locale }: SlidesTabProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const handleAction = async (fileName: string, action: 'view' | 'download') => {
    if (!fileName) return;
    try {
      const url = storageApi.getDownloadUrl(fileName, action);

      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const fileRes = await fetch(url);
        const blob = await fileRes.blob();
        const localUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = localUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(localUrl);
      }
    } catch (err) {
      console.error(err);
      alert(t('common', 'error', locale));
    }
  };

  const startEdit = (slide: Material) => {
    setEditingId(slide.id);
    setEditTitle(slide.title);
    setEditCategory(slide.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditCategory('');
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle) return;
    try {
      await materialApi.update(editingId, { title: editTitle, category: editCategory });
      cancelEdit();
      onRefresh();
    } catch (err) {
      console.error(err);
      alert(t('slides', 'updateFail', locale));
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`「${title}」${t('common', 'confirmDelete', locale)}`)) return;
    try {
      await materialApi.delete(id);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert(t('common', 'deleteFailed', locale));
    }
  };

  return (
    <div className="h-full max-w-4xl mx-auto animate-fade-in pointer-events-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 dark:text-white flex items-center gap-2 sm:gap-3">
        <span className="w-2 h-6 sm:h-7 bg-blue-500 rounded-full inline-block" />
        {t('slides', 'heading', locale)}
      </h2>
      {isLoading && <p className="text-gray-500 text-sm animate-pulse">{t('common', 'loading', locale)}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slides && slides.map(slide => (
          <div key={slide.id} className="p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors bg-white dark:bg-neutral-800/50 flex flex-col group">
            {editingId === slide.id ? (
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                    <LuCheck className="w-3.5 h-3.5" /> {t('common', 'save', locale)}
                  </button>
                  <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                    <LuX className="w-3.5 h-3.5" /> {t('common', 'cancel', locale)}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <span className="text-xs sm:text-sm font-bold text-blue-500 mb-1 sm:mb-2 inline-block">Slide</span>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(slide)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer" title={t('common', 'edit', locale)}>
                          <LuPencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(slide.id, slide.title)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title={t('common', 'delete', locale)}>
                          <LuTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-1 sm:mb-2 leading-snug">{slide.title}</h3>
                  <p className="text-xs text-gray-400 truncate">{slide.file_path} • PDF</p>
                </div>
                <div className="flex gap-2 mt-4 sm:mt-6">
                  <button
                    onClick={() => handleAction(slide.file_path, 'view')}
                    className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {t('common', 'view', locale)}
                  </button>
                  <button
                    onClick={() => handleAction(slide.file_path, 'download')}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {t('common', 'download', locale)}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {!isLoading && slides?.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">{t('slides', 'noSlides', locale)}</p>
      )}
    </div>
  );
}

export default React.memo(SlidesTab);
