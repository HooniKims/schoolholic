'use client';

import React, { useState, useEffect } from 'react';
import ReactCalendar from 'react-calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import 'react-calendar/dist/Calendar.css';
import { getNoteByDate } from '@/lib/notice-firebase';

export default function NoticeParentsPage() {
    const [date, setDate] = useState<Date>(new Date());
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadNote = async () => {
            setIsLoading(true);
            setSummary('');

            try {
                const dateStr = format(date, 'yyyy-MM-dd');
                const data = await getNoteByDate(dateStr);
                if (data && data.summary) {
                    setSummary(data.summary);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        loadNote();
    }, [date]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-4 h-4 mr-1" /> 메인으로
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">📋 알림장</h1>
                    <div />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
                            <ReactCalendar
                                onChange={(value) => setDate(value as Date)}
                                value={date}
                                locale="ko-KR"
                                calendarType="gregory"
                                className="!w-full !border-none !font-sans"
                            />
                            <p className="text-center text-sm text-gray-400 mt-3">
                                날짜를 선택하여 가정통신문을 확인하세요.
                            </p>
                        </div>
                    </div>

                    {/* Note Display */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 min-h-[400px]">
                            <h2 className="text-xl font-bold text-emerald-600 mb-4 pb-3 border-b-2 border-gray-100">
                                {format(date, 'yyyy년 M월 d일 (EEE)', { locale: ko })} 알림장
                            </h2>

                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3"></div>
                                    <p>내용을 불러오는 중입니다...</p>
                                </div>
                            ) : summary ? (
                                <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown>{summary}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                                    <MessageCircle size={48} className="mb-4 opacity-50" />
                                    <p className="font-medium">등록된 알림장이 없습니다.</p>
                                    <p className="text-sm">다른 날짜를 선택해보세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
