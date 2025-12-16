import React from 'react';
import { Language } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  language: Language;
  onToggleLanguage: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onBack, showBack, language, onToggleLanguage }) => {
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {showBack && (
              <button 
                onClick={onBack}
                className={`p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors ${isRTL ? '' : 'rotate-180'}`}
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </button>
            )}
            <h1 className="text-xl md:text-2xl font-bold text-blue-500">
              {title || (isRTL ? "المدرس الذكي" : "Smart Tutor")} 🎓
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={onToggleLanguage}
                className="px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-colors"
            >
                {language === 'ar' ? 'English' : 'عربي'}
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold hidden md:flex">
                AI
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 pb-20">
        {children}
      </main>
    </div>
  );
};

export default Layout;