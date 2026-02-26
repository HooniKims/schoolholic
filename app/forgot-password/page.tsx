'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { resetPassword } from '@/lib/auth-firebase';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string };
            if (firebaseError.code === 'auth/user-not-found') {
                setError('등록되지 않은 이메일입니다.');
            } else if (firebaseError.code === 'auth/invalid-email') {
                setError('올바른 이메일 형식이 아닙니다.');
            } else {
                setError('비밀번호 재설정 이메일 발송에 실패했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md mx-auto px-4">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
                            스쿨홀릭
                        </h1>
                    </Link>
                    <p className="text-blue-200/60 text-sm mt-2">비밀번호 찾기</p>
                </div>

                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                    {success ? (
                        <div className="text-center space-y-4">
                            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                            <h2 className="text-xl font-bold text-white">이메일이 발송되었습니다</h2>
                            <p className="text-blue-200/70 text-sm leading-relaxed">
                                <strong className="text-white">{email}</strong>으로 비밀번호 재설정 링크를 보냈습니다.
                                <br />이메일을 확인해주세요.
                            </p>
                            <Link
                                href="/login"
                                className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300"
                            >
                                로그인으로 돌아가기
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <p className="text-blue-200/70 text-sm text-center mb-2">
                                가입 시 사용한 이메일을 입력하시면<br />비밀번호 재설정 링크를 보내드립니다.
                            </p>

                            {error && (
                                <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-400/30 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">이메일</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="example@email.com"
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        발송 중...
                                    </span>
                                ) : (
                                    '비밀번호 재설정 이메일 보내기'
                                )}
                            </button>

                            <p className="text-center text-sm text-white/50 mt-4">
                                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                    ← 로그인으로 돌아가기
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
