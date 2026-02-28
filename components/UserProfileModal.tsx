'use client';

import React, { useState } from 'react';
import { X, UserX, AlertTriangle, CheckCircle } from 'lucide-react';
import { UserProfile } from '@/types/auth';
import { Timestamp } from 'firebase/firestore';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    onDeleteAccount: () => Promise<void>;
}

type ModalStep = 'profile' | 'confirm' | 'complete';

export default function UserProfileModal({
    isOpen,
    onClose,
    profile,
    onDeleteAccount,
}: UserProfileModalProps) {
    const [step, setStep] = useState<ModalStep>('profile');
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp || !timestamp.toDate) return '정보 없음';
        const date = timestamp.toDate();
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    const handleDeleteClick = () => {
        setStep('confirm');
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await onDeleteAccount();
            setStep('complete');
        } catch (error: any) {
            console.error('회원 탈퇴 오류:', error);
            if (error?.code === 'auth/requires-recent-login' || error?.message?.includes('requires-recent-login')) {
                alert('보안을 위해 로그아웃 후 다시 로그인한 다음 탈퇴를 진행해주세요.');
            } else {
                alert('회원 탈퇴에 실패했습니다. 다시 시도해주세요.');
            }
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        if (step === 'complete') {
            // 탈퇴 완료 후 닫으면 페이지 새로고침
            window.location.href = '/';
            return;
        }
        setStep('profile');
        setIsDeleting(false);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="bg-slate-800/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* 프로필 정보 단계 */}
                {step === 'profile' && (
                    <>
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-lg font-semibold text-white">내 정보</h3>
                            <button
                                onClick={handleClose}
                                className="text-white/40 hover:text-white/80 transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider">아이디</label>
                                <p className="text-white font-medium mt-1">{profile.email}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider">가입일</label>
                                <p className="text-white font-medium mt-1">{formatDate(profile.createdAt)}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider">역할</label>
                                <p className="text-white font-medium mt-1">
                                    {profile.role === 'teacher' ? '교사' : profile.role === 'admin' ? '관리자' : '학부모'}
                                </p>
                            </div>
                            {profile.schoolName && (
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider">학교</label>
                                    <p className="text-white font-medium mt-1">
                                        {profile.schoolName} {profile.grade}학년 {profile.classNum}반
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <button
                                onClick={handleDeleteClick}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium transition-all duration-200"
                            >
                                <UserX className="w-4 h-4" />
                                회원 탈퇴
                            </button>
                        </div>
                    </>
                )}

                {/* 탈퇴 확인 단계 */}
                {step === 'confirm' && (
                    <>
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-lg font-semibold text-white">회원 탈퇴 확인</h3>
                            <button
                                onClick={handleClose}
                                className="text-white/40 hover:text-white/80 transition-colors p-1"
                                disabled={isDeleting}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-400" />
                            </div>
                            <p className="text-white font-medium mb-2">정말 탈퇴하시겠습니까?</p>
                            <p className="text-white/50 text-sm leading-relaxed">
                                탈퇴 시 모든 계정 정보가 삭제되며<br />
                                복구할 수 없습니다.
                            </p>
                        </div>
                        <div className="flex gap-3 p-4 border-t border-white/10">
                            <button
                                onClick={handleClose}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 rounded-xl text-sm font-medium transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        처리 중...
                                    </>
                                ) : (
                                    '탈퇴하기'
                                )}
                            </button>
                        </div>
                    </>
                )}

                {/* 탈퇴 완료 단계 */}
                {step === 'complete' && (
                    <>
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">탈퇴가 완료되었습니다</h3>
                            <p className="text-white/50 text-sm leading-relaxed">
                                그동안 스쿨홀릭을 이용해주셔서<br />
                                감사합니다.
                            </p>
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <button
                                onClick={handleClose}
                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-all"
                            >
                                확인
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
