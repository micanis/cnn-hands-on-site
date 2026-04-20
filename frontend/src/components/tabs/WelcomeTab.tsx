import React from 'react';
import { LuChartBar } from 'react-icons/lu';
import type { NewsItem, Survey } from '../../types';
import type { Locale } from '../../i18n/translations';
import { t } from '../../i18n/translations';

interface WelcomeTabProps {
  news: NewsItem[] | null;
  isLoading: boolean;
  locale: Locale;
  surveys: Survey[] | null;
  onGoToFeedback: () => void;
}

function WelcomeTab({ news, isLoading, locale, surveys, onGoToFeedback }: WelcomeTabProps) {
  const titleLines = t('welcome', 'title', locale).split('\n');
  const activeSurveys = surveys?.filter(s => s.is_active) ?? [];

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto animate-fade-in pointer-events-auto">
      <div className="text-center py-4 sm:py-6 md:py-10 mb-4 sm:mb-8 border-b border-gray-100 dark:border-neutral-800">
        <div className="flex items-center justify-center gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
            {titleLines.map((line, i) => (
              <React.Fragment key={i}>{line}{i < titleLines.length - 1 && <br />}</React.Fragment>
            ))}
          </h1>
        </div>
      </div>

      {/* アンケートバナー */}
      {activeSurveys.length > 0 && (
        <div className="mb-6">
          {activeSurveys.map(survey => (
            <div
              key={survey.id}
              className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20 mb-3"
            >
              <div className="absolute inset-0 bg-white/5 rounded-2xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg"><LuChartBar className="w-5 h-5" /></span>
                    <span className="text-xs font-bold uppercase tracking-wide opacity-80">{t('survey', 'bannerTitle', locale)}</span>
                  </div>
                  <p className="font-bold text-sm sm:text-base truncate">{survey.title}</p>
                  {survey.description && (
                    <p className="text-xs sm:text-sm opacity-80 mt-0.5 line-clamp-1">{survey.description}</p>
                  )}
                </div>
                <button
                  onClick={onGoToFeedback}
                  className="shrink-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer border border-white/20"
                >
                  {t('survey', 'bannerBtn', locale)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 dark:text-gray-200">
          <span className="w-2 h-5 sm:h-6 bg-pink-400 rounded-full inline-block"></span>{t('welcome', 'news', locale)}
        </h2>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-gray-500 text-sm animate-pulse">{t('common', 'loading', locale)}</p>
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
            <p className="text-gray-500 text-sm">{t('welcome', 'noNews', locale)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(WelcomeTab);
