'use client';

import Link from 'next/link';
import { Bell, Calendar, Settings, Users, MessageCircle, CalendarPlus } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-[30%] right-[10%] w-[300px] h-[300px] border border-white/5 rounded-full" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-xs font-bold tracking-wider uppercase text-cyan-300 mb-6">
            Smart School Platform
          </span>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
            스쿨홀릭
          </h1>
          <p className="text-lg text-blue-200/80 max-w-2xl mx-auto leading-relaxed">
            학부모 커뮤니케이션을 빠르게. 중요한 알림은 놓치지 않고,<br className="hidden sm:block" />
            상담 일정은 실시간으로 간편 예약하세요.
          </p>
        </div>

        {/* Main Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* 알림장 카드 */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-4xl select-none group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 drop-shadow-md">📋</span>
              알림장
            </h2>
            <p className="text-blue-200/70 mb-6 text-sm leading-relaxed">
              <strong className="text-emerald-300 font-semibold">학급에서 전하는 안내사항을</strong> 학부모에게 전달합니다.<br />
              <strong className="text-white font-medium">날짜별 알림장</strong>을 간편하게 확인할 수 있습니다.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/notice/teacher"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 text-sm active:scale-[0.98] hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/40"
              >
                <Settings className="w-4 h-4" />
                교사용
              </Link>
              <Link
                href="/notice/parents"
                className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 text-sm active:scale-[0.98] hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-500/40"
              >
                <Users className="w-4 h-4" />
                학부모용
              </Link>
            </div>
          </div>

          {/* 상담 예약 카드 */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-4xl select-none group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 drop-shadow-md">🗓️</span>
              상담 예약
            </h2>
            <p className="text-blue-200/70 mb-6 text-sm leading-relaxed">
              교사와 학부모를 위한 <strong className="text-blue-300 font-semibold">온라인 상담 예약</strong> 관리 시스템입니다.<br />
              <strong className="text-white font-medium">시간대 설정, 예약, 조회</strong>를 간편하게 처리합니다.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/teacher"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 text-sm active:scale-[0.98] hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/40"
              >
                <Settings className="w-4 h-4" />
                교사용
              </Link>
              <Link
                href="/parent"
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 text-sm active:scale-[0.98] hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/40"
              >
                <CalendarPlus className="w-4 h-4" />
                학부모용
              </Link>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
          <MessageCircle className="w-8 h-8 text-blue-300 mx-auto mb-3 opacity-70" />
          <h3 className="font-semibold text-white mb-2">처음 방문하셨나요?</h3>
          <p className="text-sm text-blue-200/70 max-w-lg mx-auto">
            <strong className="text-white">교사</strong>는 알림장을 작성·관리하고 상담 시간을 설정할 수 있습니다.
            <br />
            <strong className="text-white">학부모</strong>는 알림장을 확인하고 상담을 예약할 수 있습니다.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-blue-300/40 mt-12">
          © 2026 스쿨홀릭. Powered by HooniKim
        </p>
      </div>
    </div>
  );
}
