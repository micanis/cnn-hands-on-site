import React, { useState, useEffect, useSyncExternalStore, useMemo } from 'react';
import { Show, SignInButton, UserButton, SignOutButton } from '@clerk/astro/react';
import { $userStore } from '@clerk/astro/client';
import { Sun, Moon, Settings, X, LogIn } from 'lucide-react';

// 切り出したタブをインポート
import WelcomeTab from './tabs/WelcomeTab';
import SlidesTab from './tabs/SlidesTab';
import ItemsTab from './tabs/ItemsTab';
import QATab from './tabs/QATab';

// --- 型定義 ---
interface Tab { id: string; label: string; }

// 各タブで使われるデータモデルの型定義
interface Material {
  id: number;
  title: string;
  pages?: number;
  category: string;
  file_path: string;
}

interface Question {
  id: number;
  session: string;
  content: string;
  created_at: string;
}

interface NewsItem {
  date: string;
  text: string;
  tag: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeTab') || 'Tab1'
    }
    return 'Tab1'
  })
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // --- データキャッシュ用のState ---
  const [isLoading, setIsLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [slides, setSlides] = useState<Material[] | null>(null);
  const [items, setItems] = useState<Material[] | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);

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
    { id: 'Tab1', label: 'Home' },
    { id: 'Tab2', label: 'Slides' },
    { id: 'Tab3', label: 'Items' },
    { id: 'Tab4', label: 'Q&A' }
  ];

  // --- データ取得ロジック ---
  useEffect(() => {
    const fetchTabData = async () => {
      // 対応するデータがキャッシュにない場合のみローディング状態にする
      const isDataCached = 
        (activeTab === 'Tab1' && news !== null) ||
        (activeTab === 'Tab2' && slides !== null) ||
        (activeTab === 'Tab3' && items !== null) ||
        (activeTab === 'Tab4' && questions !== null);

      if (isDataCached) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        switch (activeTab) {
          case 'Tab1':
            if (news === null) {
              const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/materials`);
              const data: Material[] = await res.json();
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
              const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/materials?category=slide`);
              const data = await res.json();
              setSlides(data);
            }
            break;
          case 'Tab3':
            if (items === null) {
              const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/materials?category=item`);
              const data = await res.json();
              setItems(data);
            }
            break;
          case 'Tab4':
            if (questions === null) {
              const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/questions`);
              const data = await res.json();
              setQuestions(data);
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

  const refreshItems = async () => {
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/materials?category=item`);
    const data = await res.json();
    setItems(data);
  };

  const refreshQuestions = async () => {
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/questions`);
    const data = await res.json();
    setQuestions(data);
  };

  return (
    <>
      <Show when="signed-out">
        <div className={`w-full h-screen flex flex-col items-center justify-center transition-colors duration-300 ${isDarkMode ? 'dark bg-neutral-950' : 'bg-gray-100'}`}>
          <div className="bg-white dark:bg-neutral-900/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-gray-200 dark:border-neutral-800 max-w-md w-full text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gray-200 dark:bg-neutral-800 flex items-center justify-center">
              <LogIn className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Class Portal</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in to continue</p>
            <SignInButton mode="modal">
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer transition-colors">
                Sign in with Google
              </button>
            </SignInButton>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        {!isAllowed ? (
          <div className={`w-full h-screen flex flex-col items-center justify-center transition-colors duration-300 ${isDarkMode ? 'dark bg-neutral-950' : 'bg-gray-100'}`}>
            <div className="bg-white dark:bg-neutral-900/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-gray-200 dark:border-neutral-800 max-w-md w-full text-center animate-fade-in">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                🔒
              </div>
              <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Access Restricted</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                Sorry, the account <span className="font-semibold text-gray-700 dark:text-gray-200">{userEmail}</span> is not authorized to access this portal.
                <br/><br/>
                Please try again with your university-issued email address.
              </p>
              <SignOutButton>
                <button className="w-full py-3 bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-white text-white dark:text-gray-900 font-bold rounded-xl cursor-pointer transition-colors">
                  Sign in with a different account
                </button>
              </SignOutButton>
            </div>
          </div>
        ) : (
        <div className={`w-full h-screen overflow-hidden transition-colors duration-300 select-none font-sans ${isDarkMode ? 'dark' : ''}`}>
          <div className="bg-gray-100 dark:bg-black h-full">
            <div className="max-w-6xl mx-auto h-full p-4 flex flex-col gap-4">
              {/* --- Header --- */}
              <header className="flex-shrink-0 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border border-gray-200 dark:border-neutral-800 rounded-2xl px-4 py-3">
                <div className="flex items-center justify-center relative">
                  {/* タブ */}
                  <div className="bg-gray-200/70 dark:bg-neutral-800/70 p-1.5 rounded-2xl flex items-center relative w-4/5 max-w-lg">
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
                        className={`relative z-10 w-full py-2 text-sm font-semibold rounded-xl transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-black ${
                          activeTab === tab.id
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* コントロール */}
                  <div className="absolute right-4 flex items-center gap-3">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors">
                      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors">
                      <Settings className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-gray-200 dark:bg-neutral-700"></div>
                    <UserButton />
                  </div>
                </div>
              </header>

              {/* --- Content Area --- */}
              <main className="flex-1 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-y-auto">
                <div className="p-4 sm:p-8 h-full">
                  {activeTab === 'Tab1' && <WelcomeTab isLoading={isLoading} news={news} />}
                  {activeTab === 'Tab2' && <SlidesTab isLoading={isLoading} slides={slides} />}
                  {activeTab === 'Tab3' && <ItemsTab isAdmin={isAdmin} isLoading={isLoading} items={items} onUploadSuccess={refreshItems} />}
                  {activeTab === 'Tab4' && <QATab isLoading={isLoading} questions={questions} onQuestionSubmit={refreshQuestions} />}
                </div>
              </main>
            </div>
          </div>

          {/* --- Settings Modal --- */}
          {isSettingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg p-4 animate-fade-in">
              <div className="bg-gray-50 dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-neutral-800">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors">
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Signed in as</label>
                    <div className="p-3 bg-white dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700 flex items-center gap-3">
                      <UserButton /> 
                      <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{user?.primaryEmailAddress?.emailAddress}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-neutral-800 space-y-2">
                    <SignOutButton>
                      <button className="w-full text-left px-3 py-2.5 text-red-600 dark:text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/30 font-semibold rounded-lg cursor-pointer transition-colors">
                        Sign Out
                      </button>
                    </SignOutButton>
                    
                    <button onClick={() => setIsSettingsOpen(false)} className="w-full text-left px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-neutral-800/60 font-semibold rounded-lg cursor-pointer transition-colors">
                      Close
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