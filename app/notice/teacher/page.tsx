'use client';

import React, { useState, useEffect } from 'react';
import ReactCalendar from 'react-calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Sparkles, Save, Trash2, Loader2, List, X, CheckSquare, Square, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import 'react-calendar/dist/Calendar.css';
import { summarizeNote, AVAILABLE_MODELS, DEFAULT_MODEL } from '@/lib/notice-ai';
import { saveNote, getNoteByDate, deleteNote, getAllNotes } from '@/lib/notice-firebase';
import { useAuth } from '@/components/AuthContext';

export default function NoticeTeacherPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [date, setDate] = useState<Date>(new Date());
    const [note, setNote] = useState('');
    const [summary, setSummary] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [isEditingSummary, setIsEditingSummary] = useState(false);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

    // List Management States
    const [showList, setShowList] = useState(false);
    const [noteList, setNoteList] = useState<{ date: string; summary?: string }[]>([]);
    const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());

    // Load note when date changes
    // 로그인 안 된 상태면 로그인 페이지로 이동
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;

        const loadNote = async () => {
            setIsFetching(true);
            setNote('');
            setSummary('');
            setStatusMsg('');

            try {
                const dateStr = format(date, 'yyyy-MM-dd');
                const data = await getNoteByDate(dateStr, user.uid);
                if (data) {
                    setNote(data.originalContent || '');
                    setSummary(data.summary || '');
                }
            } catch (err) {
                console.error(err);
                setStatusMsg('데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setIsFetching(false);
            }
        };

        loadNote();
    }, [date, user]);



    const handleSummarize = async () => {
        if (!note.trim()) {
            alert('메모 내용을 입력해주세요.');
            return;
        }

        setIsSummarizing(true);
        setStatusMsg('AI가 내용을 정리 중입니다...');

        try {
            const result = await summarizeNote(note, date, selectedModel);
            setSummary(result);
            setIsEditingSummary(false);
            setStatusMsg('정리가 완료되었습니다. 내용을 확인하고 저장하세요.');
        } catch (err) {
            console.error(err);
            setStatusMsg('AI 호출 중 오류가 발생했습니다. API 키를 확인해주세요.');
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleSave = async () => {
        if (!note.trim() && !summary.trim()) {
            alert('저장할 내용이 없습니다.');
            return;
        }

        setIsSaving(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            await saveNote(dateStr, note, summary, user.uid);
            setStatusMsg('성공적으로 저장되었습니다!');
            setTimeout(() => setStatusMsg(''), 3000);
        } catch (err) {
            console.error(err);
            setStatusMsg('저장 중 오류가 발생했습니다. Firebase 설정을 확인해주세요.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('정말로 이 날짜의 기록을 삭제하시겠습니까?')) return;

        setIsSaving(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            await deleteNote(dateStr, user.uid);
            setNote('');
            setSummary('');
            setStatusMsg('삭제되었습니다.');
            setTimeout(() => setStatusMsg(''), 3000);
        } catch (err) {
            console.error(err);
            setStatusMsg('삭제 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // List Management Functions
    const openListModal = async () => {
        setShowList(true);
        setIsFetching(true);
        try {
            const notes = await getAllNotes(user.uid);
            const validNotes = notes.filter((n) => n.date);
            setNoteList(validNotes);
            setSelectedNotes(new Set());
        } catch (err) {
            console.error(err);
            alert('목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsFetching(false);
        }
    };

    const toggleNoteSelection = (dateStr: string) => {
        const newSelected = new Set(selectedNotes);
        if (newSelected.has(dateStr)) {
            newSelected.delete(dateStr);
        } else {
            newSelected.add(dateStr);
        }
        setSelectedNotes(newSelected);
    };

    const toggleSelectAll = () => {
        if (noteList.length === 0) return;
        const allSelected = noteList.length > 0 && noteList.every((item) => selectedNotes.has(item.date));
        if (allSelected) {
            setSelectedNotes(new Set());
        } else {
            const allDates = new Set(noteList.map((item) => item.date));
            setSelectedNotes(allDates);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedNotes.size === 0) {
            alert('삭제할 항목을 선택해주세요.');
            return;
        }
        if (!window.confirm(`선택한 ${selectedNotes.size}개의 알림장을 삭제하시겠습니까?`)) return;

        setIsFetching(true);
        try {
            const deletePromises = Array.from(selectedNotes).map((dateStr) => deleteNote(dateStr, user.uid));
            await Promise.all(deletePromises);

            const notes = await getAllNotes(user.uid);
            const validNotes = notes.filter((n) => n.date);
            setNoteList(validNotes);
            setSelectedNotes(new Set());

            const currentDateStr = format(date, 'yyyy-MM-dd');
            if (selectedNotes.has(currentDateStr)) {
                setNote('');
                setSummary('');
            }

            alert('삭제되었습니다.');
        } catch (err) {
            console.error(err);
            alert('일괄 삭제 중 오류가 발생했습니다.');
        } finally {
            setIsFetching(false);
        }
    };

    const isAllSelected = noteList.length > 0 && noteList.every((item) => selectedNotes.has(item.date));

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center px-4">
                <div className="w-5 h-5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="notice-page min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-4 h-4 mr-1" /> 메인으로
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">📋 알림장 관리</h1>
                    <div />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
                            <ReactCalendar
                                onChange={(value) => setDate(value as Date)}
                                value={date}
                                locale="ko-KR"
                                calendarType="gregory"
                                className="!w-full !border-none !font-sans"
                            />
                            <p className="text-center text-sm text-gray-400 mt-3">날짜를 선택하여 내용을 작성하거나 확인하세요.</p>
                        </div>
                        <button
                            onClick={openListModal}
                            className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors"
                        >
                            <List size={20} />
                            전체 목록 관리
                        </button>
                    </div>

                    {/* Editor Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-emerald-600">
                                    {format(date, 'yyyy년 M월 d일 (EEE)', { locale: ko })} 전달 사항
                                </h2>
                                {statusMsg && <span className="text-sm text-emerald-600 font-medium">{statusMsg}</span>}
                            </div>

                            {/* AI 모델 선택 */}
                            <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                                <span className="text-sm font-semibold text-purple-700 whitespace-nowrap">🤖 AI 모델</span>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                >
                                    {AVAILABLE_MODELS.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} — {m.description}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <textarea
                                className="w-full min-h-[150px] p-4 border border-gray-200 rounded-xl font-sans text-base resize-y mb-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent [transform:translateZ(0)]"
                                placeholder={isFetching ? '내용을 불러오는 중...' : '오늘의 전달 사항을 자유롭게 입력하세요...'}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />

                            {summary && (
                                <div className="flex-grow flex flex-col gap-2 mt-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold text-amber-600">AI 정리 결과</h4>
                                        <button
                                            onClick={() => setIsEditingSummary(!isEditingSummary)}
                                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            {isEditingSummary ? '미리보기' : '직접 수정'}
                                        </button>
                                    </div>

                                    {isEditingSummary ? (
                                        <textarea
                                            className="w-full min-h-[200px] p-4 border border-gray-200 rounded-xl bg-gray-50 font-sans text-base resize-y focus:ring-2 focus:ring-emerald-500 focus:border-transparent [transform:translateZ(0)]"
                                            value={summary}
                                            onChange={(e) => setSummary(e.target.value)}
                                            placeholder="AI가 정리한 내용이 여기에 표시됩니다. 필요시 수정하세요."
                                        />
                                    ) : (
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 min-h-[200px] overflow-y-auto max-h-[400px] prose prose-sm max-w-none">
                                            <ReactMarkdown>{summary}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={handleSummarize}
                                    disabled={isSummarizing || !note.trim() || isFetching}
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {isSummarizing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                    {isSummarizing ? '정리 중...' : 'AI로 정리하기'}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || isFetching}
                                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    저장
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isSaving || isFetching || (!note && !summary)}
                                    className="flex items-center justify-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    <Trash2 size={20} />
                                    삭제
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Modal */}
            {showList && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">알림장 목록 관리</h3>
                            <button onClick={() => setShowList(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto border-b border-gray-100">
                            {noteList.length === 0 ? (
                                <p className="p-8 text-center text-gray-400">등록된 알림장이 없습니다.</p>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {noteList.map((item) => (
                                        <li
                                            key={item.date}
                                            className={`px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedNotes.has(item.date) ? 'bg-emerald-50' : ''}`}
                                            onClick={() => toggleNoteSelection(item.date)}
                                        >
                                            <div className={selectedNotes.has(item.date) ? 'text-emerald-600' : 'text-gray-300'}>
                                                {selectedNotes.has(item.date) ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="font-semibold text-gray-900">{item.date}</div>
                                                <div className="text-sm text-gray-400 truncate">
                                                    {item.summary ? item.summary.substring(0, 50) + '...' : '(내용 없음)'}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="p-4 flex items-center justify-between">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                {isAllSelected ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} className="text-gray-300" />}
                                전체 선택 ({selectedNotes.size}/{noteList.length})
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedNotes.size === 0 || isFetching}
                                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={16} />
                                선택 삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
