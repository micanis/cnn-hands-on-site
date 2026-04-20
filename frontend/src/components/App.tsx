import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback, Suspense } from 'react';
import { Show, SignInButton, UserButton, SignOutButton } from '@clerk/astro/react';
import { $userStore } from '@clerk/astro/client';
import { LuSun, LuMoon, LuMonitor, LuSettings, LuX, LuLogIn, LuLock } from 'react-icons/lu';
import { WelcomeSkeleton, SlidesSkeleton, ItemsSkeleton, QASkeleton } from './ui/Skeletons';
import { materialApi, questionApi, surveyApi } from '../services/api';
import type { Material, Question, Survey, NewsItem, Tab } from '../types';
import { t } from '../i18n/translations';
import type { Locale } from '../i18n/translations';

// React.lazy による遅延ロード（タブ単位でコード分割）
const WelcomeTab = React.lazy(() => import('./tabs/WelcomeTab'));
const SlidesTab = React.lazy(() => import('./tabs/SlidesTab'));
const ItemsTab = React.lazy(() => import('./tabs/ItemsTab'));
const QATab = React.lazy(() => import('./tabs/QATab'));

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeTab') || 'Tab1'
    }
    return 'Tab1'
  })
  // --- テーマ管理 (light / dark / system) ---
  type ThemeMode = 'light' | 'dark' | 'system';
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as ThemeMode) || 'system'
    }
    return 'system'
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  });

  // OS のカラースキーム変更を監視
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // テーマ選択を localStorage に保存
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 実際にダークモードを適用するかどうかの算出値
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark);

  // --- 言語管理 ---
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('locale') as Locale) || 'ja'
    }
    return 'ja'
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // --- データキャッシュ用のState ---
  const [isLoading, setIsLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [slides, setSlides] = useState<Material[] | null>(null);
  const [items, setItems] = useState<Material[] | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [surveys, setSurveys] = useState<Survey[] | null>(null);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

  const user = useSyncExternalStore($userStore.listen, $userStore.get, $userStore.get);
  const userEmail = user?.primaryEmailAddress?.emailAddress || ""

  const isAdmin = useMemo(() => {
    if (!userEmail) return false;
    const adminEmails = JSON.parse(import.meta.env.PUBLIC_ADMIN_EMAILS || "[]");
    return adminEmails.includes(userEmail);
  }, [userEmail]);

  const isAllowed = useMemo(() => {
    if (!userEmail) return false;
    if (isAdmin) return true;

    const guestEmails = JSON.parse(import.meta.env.PUBLIC_GUEST_EMAILS || "[]");
    if (guestEmails.includes(userEmail)) return true;

    const domains: string[] = JSON.parse(
      import.meta.env.PUBLIC_ALLOWED_DOMAINS || "[]"
    );
    if (domains.length === 0) return false;

    const escapedDomains = domains.map((d) => d.replace(/\./g, "\\."));
    const studentPattern = new RegExp(`^[a-zA-Z0-9_.+-]+@(${escapedDomains.join("|")})$`);

    return studentPattern.test(userEmail);
  }, [userEmail, isAdmin]);

  const tabs: Tab[] = [
    { id: 'Tab1', label: t('tabs', 'home', locale) },
    { id: 'Tab2', label: t('tabs', 'slides', locale) },
    { id: 'Tab3', label: t('tabs', 'items', locale) },
    { id: 'Tab4', label: t('tabs', 'qa', locale) }
  ];

  // --- データ取得ロジック（API サービス経由） ---
  useEffect(() => {
    const fetchTabData = async () => {
      const isDataCached =
        (activeTab === 'Tab1' && news !== null) ||
        (activeTab === 'Tab2' && slides !== null) ||
        (activeTab === 'Tab3' && items !== null) ||
        (activeTab === 'Tab4' && questions !== null && surveys !== null);

      if (isDataCached) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        switch (activeTab) {
          case 'Tab1':
            if (news === null) {
              const data = await materialApi.list();
              const latestMaterials = [...data].reverse().slice(0, 3);
              const generatedNews = latestMaterials.map(item => ({
                date: "New",
                text: `新しい${item.category === 'slide' ? 'スライド' : 'アイテム'}「${item.title}」が公開されました。`,
                tag: item.category === 'slide' ? 'Slides' : 'Items'
              }));
              setNews(generatedNews);
            }
            break;
          case 'Tab2':
            if (slides === null) {
              const data = await materialApi.list('slide');
              setSlides(data);
            }
            break;
          case 'Tab3':
            if (items === null) {
              const data = await materialApi.list('item');
              setItems(data);
            }
            break;
          case 'Tab4':
            if (questions === null) {
              const data = await questionApi.list();
              setQuestions(data);
            }
            if (surveys === null) {
              const data = await surveyApi.listActive();
              setSurveys(data);
            }
            break;
        }
      } catch (error) {
        console.error("Failed to fetch tab data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTabData();
  }, [activeTab]);

  const refreshSlides = useCallback(async () => {
    const data = await materialApi.list('slide');
    setSlides(data);
  }, []);

  const refreshItems = useCallback(async () => {
    const data = await materialApi.list('item');
    setItems(data);
  }, []);

  const refreshQuestions = useCallback(async () => {
    const data = await questionApi.list();
    setQuestions(data);
  }, []);

  const refreshSurveys = useCallback(async () => {
    const data = await surveyApi.listActive();
    setSurveys(data);
  }, []);

  return (
    <>
      <Show when="signed-out">
        <div className={`w-full h-screen flex flex-col items-center justify-center transition-colors duration-300 px-4 ${isDark ? 'dark bg-neutral-950' : 'bg-gray-100'}`}>
          <div className="bg-white dark:bg-neutral-900/80 backdrop-blur-xl p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-200 dark:border-neutral-800 max-w-md w-full text-center animate-fade-in">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gray-200 dark:bg-neutral-800 flex items-center justify-center">
              <LuLogIn className="w-7 h-7 sm:w-8 sm:h-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-white">{t('auth', 'portalTitle', locale)}</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 sm:mb-8">{t('auth', 'signInPrompt', locale)}</p>
            <SignInButton mode="modal">
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer transition-colors text-sm sm:text-base">
                {t('auth', 'signInGoogle', locale)}
              </button>
            </SignInButton>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        {!isAllowed ? (
          <div className={`w-full h-screen flex flex-col items-center justify-center transition-colors duration-300 px-4 ${isDark ? 'dark bg-neutral-950' : 'bg-gray-100'}`}>
            <div className="bg-white dark:bg-neutral-900/80 backdrop-blur-xl p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-200 dark:border-neutral-800 max-w-md w-full text-center animate-fade-in">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <LuLock className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">{t('auth', 'restricted', locale)}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                <span className="font-semibold text-gray-700 dark:text-gray-200 break-all">{userEmail}</span>
                {t('auth', 'restrictedMsg', locale)}
              </p>
              <SignOutButton>
                <button className="w-full py-3 bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-white text-white dark:text-gray-900 font-bold rounded-xl cursor-pointer transition-colors text-sm sm:text-base">
                  {t('auth', 'switchAccount', locale)}
                </button>
              </SignOutButton>
            </div>
          </div>
        ) : (
          <div className={`w-full h-screen overflow-hidden transition-colors duration-300 select-none font-sans ${isDark ? 'dark' : ''}`}>
            <div className="bg-gray-100 dark:bg-black h-full">
              <div className="max-w-6xl mx-auto h-full p-2 sm:p-4 flex flex-col gap-2 sm:gap-4">
                {/* --- Header --- */}
                <header className="flex-shrink-0 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border border-gray-200 dark:border-neutral-800 rounded-2xl px-3 sm:px-4 py-3">
                  <div className="relative flex flex-col sm:flex-row items-center gap-3">
                    {/* タブ（完全中央） */}
                    <div className="w-full sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                      <div className="bg-gray-200/70 dark:bg-neutral-800/70 p-1.5 rounded-2xl flex items-center relative sm:min-w-[32rem]">
                        {/* アクティブタブのインジケーター */}
                        <div
                          className={`absolute top-1.5 bottom-1.5 bg-white dark:bg-neutral-700 rounded-xl shadow-md transition-all duration-300 ease-in-out`}
                          style={{
                            width: `calc((100% - 2 * 0.375rem) / ${tabs.length})`,
                            left: `calc(0.375rem + ${tabs.findIndex(tab => tab.id === activeTab)} * ((100% - 2 * 0.375rem) / ${tabs.length}))`,
                          }}
                        />
                        {tabs.map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative z-10 w-full py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-black ${activeTab === tab.id
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                              }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* コントロール（右端固定） */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 sm:ml-auto">
                      <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors">
                        <LuSettings className="w-5 h-5" />
                      </button>
                      <div className="w-px h-6 bg-gray-200 dark:bg-neutral-700"></div>
                      <UserButton />
                    </div>
                  </div>
                </header>

                {/* --- Content Area --- */}
                <main className="flex-1 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-y-auto">
                  <div className="p-4 sm:p-8 h-full">
                    {activeTab === 'Tab1' && (
                      <Suspense fallback={<WelcomeSkeleton />}>
                        <WelcomeTab isLoading={isLoading} news={news} locale={locale} surveys={surveys} onGoToFeedback={() => setActiveTab('Tab4')} />
                      </Suspense>
                    )}
                    {activeTab === 'Tab2' && (
                      <Suspense fallback={<SlidesSkeleton />}>
                        <SlidesTab isAdmin={isAdmin} isLoading={isLoading} slides={slides} onRefresh={refreshSlides} locale={locale} />
                      </Suspense>
                    )}
                    {activeTab === 'Tab3' && (
                      <Suspense fallback={<ItemsSkeleton />}>
                        <ItemsTab isAdmin={isAdmin} isLoading={isLoading} items={items} onUploadSuccess={refreshItems} locale={locale} />
                      </Suspense>
                    )}
                    {activeTab === 'Tab4' && (
                      <Suspense fallback={<QASkeleton />}>
                        <QATab isAdmin={isAdmin} isLoading={isLoading} questions={questions} onQuestionSubmit={refreshQuestions} surveys={surveys} onSurveyRefresh={refreshSurveys} userEmail={userEmail} locale={locale} />
                      </Suspense>
                    )}
                  </div>
                </main>
              </div>
            </div>

            {/* --- Settings Modal --- */}
            {isSettingsOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg p-4 animate-fade-in">
                <div className="bg-gray-50 dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-neutral-800">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('settings', 'title', locale)}</h2>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors">
                      <LuX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">{t('settings', 'signedInAs', locale)}</label>
                      <div className="p-3 bg-white dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700 flex items-center gap-3 min-w-0">
                        <UserButton />
                        <span className="font-medium text-xs sm:text-sm text-gray-800 dark:text-gray-200 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
                      </div>
                    </div>

                    {/* テーマ選択 */}
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">{t('settings', 'appearance', locale)}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['light', 'dark', 'system'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setTheme(mode)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${theme === mode
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                              }`}
                          >
                            {mode === 'light' && <LuSun className={`w-5 h-5 ${theme === mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />}
                            {mode === 'dark' && <LuMoon className={`w-5 h-5 ${theme === mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />}
                            {mode === 'system' && <LuMonitor className={`w-5 h-5 ${theme === mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />}
                            <span className={`text-xs font-medium ${theme === mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {t('settings', mode, locale)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 言語選択 */}
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">{t('settings', 'language', locale)}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {([['ja', '日本語'], ['en', 'English']] as const).map(([code, label]) => (
                          <button
                            key={code}
                            onClick={() => setLocale(code)}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${locale === code
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                              }`}
                          >
                            <span className={`text-sm font-medium ${locale === code ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                              {label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-neutral-800 space-y-2">
                      <SignOutButton>
                        <button className="w-full text-left px-3 py-2.5 text-red-600 dark:text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/30 font-semibold rounded-lg cursor-pointer transition-colors">
                          {t('settings', 'signOut', locale)}
                        </button>
                      </SignOutButton>

                      <button onClick={() => setIsSettingsOpen(false)} className="w-full text-left px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-neutral-800/60 font-semibold rounded-lg cursor-pointer transition-colors">
                        {t('settings', 'close', locale)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Show>
    </>
  );
}