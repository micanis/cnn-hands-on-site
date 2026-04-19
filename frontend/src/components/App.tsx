import React, { useState, useEffect, useSyncExternalStore } from 'react';
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
interface BgArea { id: string; targetTab: string; tabActiveColor: string; bgClass: string; hoverClass: string; borderClass: string; positionClass: string; pulseColor: string; }
interface BgPulseInfo { area: string | null; color: string; }

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeTab') || 'Tab1'
    }
    return 'Tab1'
  })
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [bgPulseInfo, setBgPulseInfo] = useState<BgPulseInfo>({ area: null, color: '' });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])
  
  const user = useSyncExternalStore($userStore.listen, $userStore.get, $userStore.get);
  const userEmail = user?.primaryEmailAddress?.emailAddress || ""

  const adminEmails = JSON.parse(import.meta.env.PUBLIC_ADMIN_EMAILS || "[]")
  console.log(adminEmails)
  const isAdmin = adminEmails.includes(userEmail)

  const isAllowedUser = () => {
    if (!userEmail) return false

    if (isAdmin) return true

    const guestEmails = JSON.parse(import.meta.env.PUBLIC_GUEST_EMAILS || "[]")
    if (guestEmails.includes(userEmail)) return true

    const domains: string[] = JSON.parse(
      import.meta.env.PUBLIC_ALLOWED_DOMAINS || "[]"
    );

    const escapedDomains = domains.map((d) =>
      d.replace(/\./g, "\\.")
    );

    const studentPattern: RegExp = new RegExp(
      `^[a-zA-Z0-9_.+-]+@(${escapedDomains.join("|")})$`
    );
    if (studentPattern.test(userEmail)) return true

    return false
  }

  const isAllowed = isAllowedUser()

  const tabs: Tab[] = [
    { id: 'Tab1', label: 'Home' },
    { id: 'Tab2', label: 'Slides' },
    { id: 'Tab3', label: 'Items' },
    { id: 'Tab4', label: 'Q&A' }
  ];

  const bgAreas: BgArea[] = [
    { id: '左上', targetTab: 'Tab1', tabActiveColor: 'bg-pink-200 dark:bg-pink-900', bgClass: 'bg-pink-50 dark:bg-[#1a1114]', hoverClass: 'hover:bg-pink-100 dark:hover:bg-[#2a1b20]', borderClass: 'border-r border-b border-gray-200 dark:border-gray-800', positionClass: 'items-start justify-start', pulseColor: 'bg-pink-200' },
    { id: '右上', targetTab: 'Tab2', tabActiveColor: 'bg-blue-200 dark:bg-blue-900', bgClass: 'bg-blue-50 dark:bg-[#11161f]', hoverClass: 'hover:bg-blue-100 dark:hover:bg-[#1a2333]', borderClass: 'border-b border-gray-200 dark:border-gray-800', positionClass: 'items-start justify-end', pulseColor: 'bg-blue-200' },
    { id: '左下', targetTab: 'Tab3', tabActiveColor: 'bg-emerald-200 dark:bg-emerald-900', bgClass: 'bg-emerald-50 dark:bg-[#111a14]', hoverClass: 'hover:bg-emerald-100 dark:hover:bg-[#192b1f]', borderClass: 'border-r border-gray-200 dark:border-gray-800', positionClass: 'items-end justify-start', pulseColor: 'bg-emerald-200' },
    { id: '右下', targetTab: 'Tab4', tabActiveColor: 'bg-orange-200 dark:bg-orange-900', bgClass: 'bg-orange-50 dark:bg-[#1f1611]', hoverClass: 'hover:bg-orange-100 dark:hover:bg-[#332219]', borderClass: '', positionClass: 'items-end justify-end', pulseColor: 'bg-orange-200' }
  ];

  const getTabActiveColor = (tabId: string) => bgAreas.find(a => a.targetTab === tabId)?.tabActiveColor || 'bg-gray-200';

  const handleBgClick = (area: BgArea) => {
    setActiveTab(area.targetTab);
    setBgPulseInfo({ area: area.id, color: area.pulseColor });
    setTimeout(() => setBgPulseInfo({ area: null, color: '' }), 500);
  };

  return (
    <>
      <Show when="signed-out">
        <div className={`w-full h-screen flex flex-col items-center justify-center transition-colors duration-300 ${isDarkMode ? 'dark bg-neutral-900' : 'bg-gray-50'}`}>
          <div className="bg-white dark:bg-neutral-800 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-neutral-700 max-w-md w-full text-center animate-fade-in">
            <LogIn className="w-12 h-12 text-blue-600 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-8 dark:text-white">Class Portal</h1>
            <SignInButton mode="modal">
              <button className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl cursor-pointer">Googleでログイン</button>
            </SignInButton>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        {!isAllowed ? (
          <div className={`w-full h-screen flex flex-col items-center justify-center transition-colors duration-300 ${isDarkMode ? 'dark bg-neutral-900' : 'bg-gray-50'}`}>
            <div className="bg-white dark:bg-neutral-800 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-neutral-700 max-w-md w-full text-center animate-fade-in">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🔒</div>
              <h1 className="text-2xl font-bold mb-4 dark:text-white">アクセスが制限されています</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                申し訳ありませんが、このアカウント（<span className="font-bold text-gray-700 dark:text-gray-200">{userEmail}</span>）にはクラスポータルへのアクセス権が付与されていません。<br/><br/>
                大学発行のメールアドレスで再度ログインをお試しください。
              </p>
              <SignOutButton>
                <button className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl cursor-pointer">
                  別のアカウントでログイン
                </button>
              </SignOutButton>
            </div>
          </div>
        ) : (
        <div className={`w-full h-screen relative overflow-hidden transition-colors duration-300 select-none ${isDarkMode ? 'dark' : ''}`}>
          <div className="absolute inset-0 bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-200">
            {/* 背景エリア */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {bgAreas.map((area) => (
                <div key={area.id} onClick={() => handleBgClick(area)} className={`${area.bgClass} ${area.hoverClass} ${area.borderClass} ${area.positionClass} p-8 flex cursor-pointer transition-colors duration-300 relative overflow-hidden`}>
                  <span className="text-xl tracking-wide font-medium opacity-20 dark:opacity-10">{tabs.find(t => t.id === area.targetTab)?.label}</span>
                  {bgPulseInfo.area === area.id && <div className="absolute inset-0 bg-white/40 animate-ping rounded-full scale-150" />}
                </div>
              ))}
            </div>

            {/* パネル */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
              <div className="pointer-events-auto w-[95vw] sm:w-[80vw] h-[90vh] sm:h-[80vh] max-w-[1200px] bg-neutral-100 dark:bg-neutral-800 rounded-xl shadow-2xl p-3 sm:p-4 flex flex-col border border-transparent dark:border-neutral-700">
                
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-4 mt-1 relative z-10">
                  <div className="w-24 hidden sm:block"></div>
                  <div className="bg-gray-200/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-full flex p-1.5 shadow-inner border border-gray-300/30 dark:border-neutral-700/50 overflow-x-auto">
                    {tabs.map((tab, index) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
  className={`relative px-4 sm:px-10 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer [-webkit-tap-highlight-color:transparent]
    ${index !== 0 ? '-ml-3 sm:-ml-5' : ''}
    ${isActive ? `z-20 ${getTabActiveColor(tab.id)} text-gray-900 dark:text-white` 
               : `text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200`}
  `}
  style={{ 
    zIndex: isActive ? 20 : 10 - index,
    outline: 'none',        /* ここを追加：アウトラインを完全に消す */
    boxShadow: isActive ? '0 4px 10px -2px rgba(0,0,0,0.15)' : 'none', /* ここを追加：アクティブ時以外のシャドウを消す */
  }}>
  {tab.label}
</button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 w-auto sm:w-24 justify-end pr-2">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-full bg-white dark:bg-neutral-700 cursor-pointer shadow-sm">
                      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-full bg-white dark:bg-neutral-700 cursor-pointer shadow-sm">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* コンテンツエリア */}
                <div className="flex-1 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-y-auto">
                  <div className="p-4 sm:p-8 h-full">
                    <div className={`h-full ${activeTab === 'Tab1' ? 'block' : 'hidden'}`}><WelcomeTab /></div>
                    <div className={`h-full ${activeTab === 'Tab2' ? 'block' : 'hidden'}`}><SlidesTab /></div>
                    <div className={`h-full ${activeTab === 'Tab3' ? 'block' : 'hidden'}`}>
                      <ItemsTab isAdmin={isAdmin}/>
                      </div>
                    <div className={`h-full ${activeTab === 'Tab4' ? 'block' : 'hidden'}`}><QATab /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* モーダル（簡略化） */}
            {isSettingsOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-neutral-800 w-full max-w-md rounded-2xl shadow-2xl p-6 border dark:border-neutral-700 animate-fade-in pointer-events-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white">設定</h2>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-1 cursor-pointer"><X className="w-6 h-6 text-gray-500" /></button>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">ログイン中</label>
                      <div className="p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg border dark:border-neutral-700 flex items-center gap-3">
                        <UserButton /> 
                        <span className="font-medium text-sm dark:text-gray-200">{user?.primaryEmailAddress?.emailAddress}</span>
                      </div>
                    </div>

                    {/* ★追加: ログアウトボタン */}
                    <div className="pt-2 border-t border-gray-100 dark:border-neutral-700">
                      <SignOutButton>
                        <button className="w-full py-2.5 mb-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 font-bold rounded-lg cursor-pointer transition-colors">
                          ログアウト
                        </button>
                      </SignOutButton>
                      
                      <button onClick={() => setIsSettingsOpen(false)} className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-lg cursor-pointer">
                        閉じる
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
  )}
      </Show>
    </>
  );
}