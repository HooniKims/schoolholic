'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Unlock, RefreshCw, AlertCircle, User, Mail, GraduationCap, Users } from 'lucide-react';
import { getLockedAccounts, unlockAccount } from '@/lib/auth-firebase';
import { useAuth } from '@/components/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { UserProfile } from '@/types/auth';

function AdminContent() {
    const { profile } = useAuth();
    const [lockedAccounts, setLockedAccounts] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    const fetchLockedAccounts = async () => {
        setLoading(true);
        try {
            const accounts = await getLockedAccounts();
            setLockedAccounts(accounts);
        } catch (error) {
            console.error('잠긴 계정 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLockedAccounts();
    }, []);

    const handleUnlock = async (uid: string, name: string) => {
        setUnlocking(uid);
        setMessage('');
        try {
            await unlockAccount(uid);
            setMessage(`${name}님의 계정이 잠금 해제되었습니다.`);
            await fetchLockedAccounts();
        } catch (error) {
            console.error('잠금 해제 오류:', error);
            setMessage('계정 잠금 해제에 실패했습니다.');
        } finally {
            setUnlocking(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-3xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Shield className="w-7 h-7 text-amber-400" />
                            관리자 페이지
                        </h1>
                        <p className="text-blue-200/60 text-sm mt-1">잠긴 계정을 관리합니다</p>
                    </div>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-sm text-white/70 hover:text-white transition-all"
                    >
                        ← 홈으로
                    </Link>
                </div>

                {/* Success/Error Message */}
                {message && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl mb-6 ${message.includes('실패') ? 'bg-red-500/15 border border-red-400/30' : 'bg-emerald-500/15 border border-emerald-400/30'
                        }`}>
                        <AlertCircle className={`w-5 h-5 ${message.includes('실패') ? 'text-red-400' : 'text-emerald-400'}`} />
                        <p className={`text-sm ${message.includes('실패') ? 'text-red-300' : 'text-emerald-300'}`}>{message}</p>
                    </div>
                )}

                {/* Locked Accounts */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">
                            🔒 잠긴 계정 ({lockedAccounts.length})
                        </h2>
                        <button
                            onClick={fetchLockedAccounts}
                            disabled={loading}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="새로고침"
                        >
                            <RefreshCw className={`w-5 h-5 text-white/60 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-3 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
                        </div>
                    ) : lockedAccounts.length === 0 ? (
                        <div className="text-center py-12">
                            <Unlock className="w-12 h-12 text-emerald-400/50 mx-auto mb-3" />
                            <p className="text-white/50 text-sm">잠긴 계정이 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lockedAccounts.map((account) => (
                                <div
                                    key={account.uid}
                                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${account.role === 'teacher' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                                            }`}>
                                            {account.role === 'teacher' ? (
                                                <GraduationCap className="w-5 h-5 text-emerald-400" />
                                            ) : (
                                                <Users className="w-5 h-5 text-blue-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white text-sm">{account.name}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${account.role === 'teacher' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                                                    }`}>
                                                    {account.role === 'teacher' ? '교사' : '학부모'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Mail className="w-3 h-3 text-white/30" />
                                                <span className="text-xs text-white/50">{account.email}</span>
                                            </div>
                                            <span className="text-xs text-red-400/70">
                                                실패 횟수: {account.failedLoginAttempts}회
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleUnlock(account.uid, account.name)}
                                        disabled={unlocking === account.uid}
                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {unlocking === account.uid ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                해제 중...
                                            </>
                                        ) : (
                                            <>
                                                <Unlock className="w-4 h-4" />
                                                잠금 해제
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    return (
        <AuthGuard allowedRoles={['admin']}>
            <AdminContent />
        </AuthGuard>
    );
}
