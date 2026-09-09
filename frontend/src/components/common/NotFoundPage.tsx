import React from 'react';
import { Lock, Home, RefreshCw } from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
  onLogout?: () => void;
  attemptedPath?: string;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onGoHome,
  onLogout,
  attemptedPath
}) => {
  return (
    <div className="min-h-screen bg-[#F4F8FA] flex flex-col justify-center items-center px-4 py-12 text-[#002E4E] relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2582A1]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FDB931]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-lg bg-white rounded-3xl border border-[#D8E6ED] shadow-xl p-8 sm:p-10 text-center space-y-6 relative">
        {/* Apollo University Logo */}
        <div className="inline-flex p-3 rounded-2xl bg-white shadow-xs border border-[#D8E6ED] mx-auto">
          <img
            src="/Apollo Vector image.svg"
            alt="The Apollo University"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* 404 Status Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Lock className="w-3.5 h-3.5" />
            <span>Profile Restricted / 404</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#002E4E] tracking-tight">
            404
          </h1>
          <h2 className="text-lg sm:text-xl font-bold text-[#002E4E]">
            Page Not Found or Access Restricted
          </h2>
          <p className="text-xs sm:text-sm text-[#4A6375] leading-relaxed max-w-md mx-auto">
            The platform operates strictly on <strong>Super Admin</strong> and <strong>Faculty</strong> profiles. Other legacy role routes and undefined URLs are frozen.
          </p>
          {attemptedPath && (
            <div className="inline-block px-3 py-1 rounded-lg bg-[#F0F6F9] border border-[#D8E6ED] text-[11px] font-mono text-[#2582A1]">
              Attempted: {attemptedPath}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGoHome}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#002E4E] hover:bg-[#1C6982] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Active Dashboard</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sign In with Different Account</span>
            </button>
          )}
        </div>

        {/* Institutional Footer */}
        <div className="pt-4 border-t border-[#D8E6ED] text-[11px] text-[#829BA8]">
          The Apollo University • Smart Timetable & Scheduling Platform
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
