'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AvailableSlot, Period, COUNSELING_TOPICS, CounselingTopic, DEFAULT_PERIODS } from '@/types';
import { formatDateKorean } from '@/lib/utils';
import { CheckCircle2, Calendar, Clock, MessageSquare, User, Search } from 'lucide-react';
import Link from 'next/link';

export default function BookingPage() {
  const params = useParams();
  const teacherId = params.teacherId as string;

  const [step, setStep] = useState<1 | 2>(1);
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [topic, setTopic] = useState<CounselingTopic>('학업(성적)');
  const [content, setContent] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [periods, setPeriods] = useState<Period[]>(DEFAULT_PERIODS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // 교시 시간 및 상담 가능 시간 로드
  useEffect(() => {
    if (!teacherId) return;

    // 교사 설정 로드
    const loadTeacherSettings = async () => {
      try {
        const teachersQuery = query(
          collection(db, 'teachers'),
          where('id', '==', teacherId)
        );

        onSnapshot(teachersQuery, (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            if (data.periods) {
              setPeriods(data.periods);
            }
          }
        });
      } catch (error) {
        console.error('교사 설정 로드 오류:', error);
      }
    };

    // 상담 가능 시간 실시간 로드
    const slotsQuery = query(
      collection(db, 'availableSlots'),
      where('teacherId', '==', teacherId),
      where('status', '==', 'available')
    );

    const unsubscribe = onSnapshot(slotsQuery, (snapshot) => {
      const slots: AvailableSlot[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // 과거 날짜는 제외
        if (data.date >= new Date().toISOString().split('T')[0]) {
          slots.push({ id: doc.id, ...data } as AvailableSlot);
        }
      });
      setAvailableSlots(
        slots.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period)
      );
      setLoading(false);
    });

    loadTeacherSettings();

    return () => unsubscribe();
  }, [teacherId]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentNumber.trim() && studentName.trim()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !topic || !content.trim()) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // 슬롯 상태를 reserved로 변경
      const slotRef = doc(db, 'availableSlots', selectedSlot.id);
      await updateDoc(slotRef, { status: 'reserved' });

      // 예약 생성
      await addDoc(collection(db, 'reservations'), {
        teacherId,
        slotId: selectedSlot.id,
        studentNumber: studentNumber.trim(),
        studentName: studentName.trim(),
        date: selectedSlot.date,
        period: selectedSlot.period,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        topic,
        content: content.trim(),
        createdAt: Date.now(),
      });

      setSuccess(true);
    } catch (error) {
      console.error('예약 오류:', error);
      alert('예약에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="상담 예약">
        <LoadingSpinner />
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">예약이 완료되었습니다!</h2>
            <p className="text-gray-600">담당 선생님께서 확인하실 예정입니다.</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
            <h3 className="font-semibold mb-3 text-gray-900">예약 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">학번:</span>
                <span className="font-medium">{studentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">이름:</span>
                <span className="font-medium">{studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">날짜:</span>
                <span className="font-medium">{selectedSlot && formatDateKorean(selectedSlot.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">시간:</span>
                <span className="font-medium">
                  {selectedSlot && `${selectedSlot.startTime} - ${selectedSlot.endTime}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">주제:</span>
                <span className="font-medium">{topic}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-500">이 창을 닫으셔도 됩니다.</p>
            <Link href="/check-reservation">
              <Button variant="secondary" size="sm">
                <Search className="w-4 h-4 mr-2" />
                예약 확인 및 취소
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (step === 1) {
    return (
      <Layout title="상담 예약" description="학생 정보를 입력해주세요">
        <form onSubmit={handleStep1Submit} className="p-6 sm:p-8">
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2" />
                학번
              </label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="학번을 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2" />
                이름
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              다음
            </Button>
          </div>
        </form>
      </Layout>
    );
  }

  // Step 2: 상담 시간 선택 및 내용 작성
  return (
    <Layout title="상담 예약" description={`${studentName}님의 상담을 예약합니다`}>
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* 상담 가능 시간 선택 */}
          <div>
            <h3 className="flex items-center text-lg font-semibold mb-4">
              <Calendar className="w-5 h-5 mr-2" />
              상담 가능 시간
            </h3>

            {availableSlots.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>현재 예약 가능한 시간이 없습니다.</p>
                <p className="text-sm">나중에 다시 확인해주세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableSlots.map((slot) => {
                  const period = periods.find((p) => p.number === slot.period);
                  const isSelected = selectedSlot?.id === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        ${isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                        }
                      `}
                    >
                      <div className="font-semibold text-gray-900 mb-1">
                        {formatDateKorean(slot.date)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {period?.label} ({slot.startTime} - {slot.endTime})
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 상담 주제 선택 */}
          <div>
            <h3 className="flex items-center text-lg font-semibold mb-4">
              <MessageSquare className="w-5 h-5 mr-2" />
              상담 주제
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COUNSELING_TOPICS.map((topicOption) => (
                <button
                  key={topicOption}
                  type="button"
                  onClick={() => setTopic(topicOption)}
                  className={`
                    px-4 py-3 rounded-lg border-2 font-medium transition-all
                    ${topic === topicOption
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                    }
                  `}
                >
                  {topicOption}
                </button>
              ))}
            </div>
          </div>

          {/* 상담 내용 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">상담 내용</h3>
            <p className="text-sm text-gray-600 mb-3">
              상담하고 싶은 내용을 간단히 작성해주세요.
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예: 최근 수학 성적이 떨어져서 고민입니다. 어떻게 공부하면 좋을지 상담받고 싶습니다."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-32 resize-y"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {content.length}자
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => setStep(1)}
              variant="secondary"
              size="lg"
              className="flex-1"
            >
              이전
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              disabled={!selectedSlot || submitting}
            >
              {submitting ? '예약 중...' : '예약 신청'}
            </Button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
