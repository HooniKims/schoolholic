'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Calendar, CalendarPlus, CheckCircle2, Clock, MessageSquare, Search, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmModal from '@/components/ConfirmModal';
import { AvailableSlot, COUNSELING_TOPICS, CounselingTopic, Period, Reservation, DEFAULT_PERIODS } from '@/types';
import { formatDateKorean } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';

type Tab = 'book' | 'check';

export default function ParentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('book');

  // 로그인 안 된 상태면 로그인 페이지로 이동
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="학부모(보호자) 페이지" description="상담 예약 및 예약 확인">
      <div className="max-w-4xl mx-auto">
        {/* 탭 네비게이션 */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('book')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition-all ${activeTab === 'book'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <CalendarPlus className="w-5 h-5 inline-block mr-2" />
            예약하기
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('check')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition-all ${activeTab === 'check'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Search className="w-5 h-5 inline-block mr-2" />
            예약 조회 / 취소
          </button>
        </div>

        {activeTab === 'book' ? <BookingTab /> : <CheckTab />}
      </div>
    </Layout>
  );
}

type Step = 1 | 2 | 3;

function BookingTab() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [topic, setTopic] = useState<CounselingTopic>(COUNSELING_TOPICS[0]);
  const [content, setContent] = useState('');
  const [consultationType, setConsultationType] = useState<'face' | 'phone' | 'etc'>('face');
  const [consultationTypeEtc, setConsultationTypeEtc] = useState('');
  const [loading, setLoading] = useState(false);
  const [periods] = useState<Period[]>(DEFAULT_PERIODS);
  const [teacherId, setTeacherId] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    cancelText: null as string | null,
  });

  // 로그인한 학부모 프로필에서 매칭된 교사 ID(matchedTeacherId)를 가져옵니다.
  useEffect(() => {
    const fetchMatchedTeacherId = async () => {
      if (!user?.uid) return;

      try {
        const userDoc = await getDocs(
          query(collection(db, 'users'), where('uid', '==', user.uid))
        );

        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          if (userData.matchedTeacherId) {
            setTeacherId(userData.matchedTeacherId);
          }
        }
      } catch (error) {
        console.error('Error fetching matched teacherId:', error);
      }
    };
    fetchMatchedTeacherId();
  }, [user]);

  useEffect(() => {
    if (!teacherId) return;

    const q = query(
      collection(db, 'availableSlots'),
      where('teacherId', '==', teacherId),
      where('status', '==', 'available'),
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const slots: AvailableSlot[] = [];
      snapshot.forEach(docSnap => {
        slots.push({ id: docSnap.id, ...(docSnap.data() as Omit<AvailableSlot, 'id'>) });
      });

      const today = new Date().toISOString().split('T')[0];
      const filtered = slots
        .filter(slot => slot.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);

      setAvailableSlots(filtered);
    });

    return () => unsubscribe();
  }, [teacherId]);

  const handleStudentInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim() || !studentName.trim()) {
      alert('학번과 이름을 모두 입력해 주세요.');
      return;
    }
    setStep(2);
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (consultationType === 'etc' && !consultationTypeEtc.trim()) {
      alert('기타 상담 방식을 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const slotRef = doc(db, 'availableSlots', selectedSlot.id);
      const reservationRef = collection(db, 'reservations');

      await runTransaction(db, async transaction => {
        const slotDoc = await transaction.get(slotRef);

        if (!slotDoc.exists() || slotDoc.data().status !== 'available') {
          throw new Error('이미 예약된 시간이거나 슬롯을 찾을 수 없습니다.');
        }

        transaction.update(slotRef, { status: 'reserved' });

        // A new reservation document is created with a random ID
        transaction.set(doc(reservationRef), {
          teacherId: selectedSlot.teacherId,
          slotId: selectedSlot.id,
          studentNumber: studentNumber.trim(),
          studentName: studentName.trim(),
          date: selectedSlot.date,
          period: selectedSlot.period,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          topic,
          content: content.trim(),
          consultationType,
          consultationTypeEtc: consultationType === 'etc' ? consultationTypeEtc.trim() : '',
          createdAt: Date.now(),
        });
      });

      setConfirmModal({
        isOpen: true,
        title: '예약 완료',
        message: '상담 예약이 완료되었습니다.\n예약 확인은 예약 조회/취소 탭에서 확인하실 수 있습니다.',
        cancelText: null,
        onConfirm: () => {
          setStep(1);
          setStudentNumber('');
          setStudentName('');
          setSelectedSlot(null);
          setTopic(COUNSELING_TOPICS[0]);
          setContent('');
          setConsultationType('face');
          setConsultationTypeEtc('');
        },
      });
    } catch (error) {
      console.error('예약 오류:', error);
      setConfirmModal({
        isOpen: true,
        title: '예약 실패',
        message: '예약에 실패했습니다. 다른 시간을 선택하거나 선생님께 문의해주세요.',
        cancelText: null,
        onConfirm: () => {
          setStep(2); // On error, return to the time selection step
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleStudentInfoSubmit} className="space-y-6">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2" />
              학번
            </label>
            <input
              type="text"
              value={studentNumber}
              onChange={e => setStudentNumber(e.target.value)}
              placeholder="학번을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [transform:translateZ(0)]"
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
              onChange={e => setStudentName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [transform:translateZ(0)]"
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full">
            다음
          </Button>
        </form>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{studentNumber}</span> - {studentName}
            </div>
            <Button onClick={() => setStep(1)} variant="ghost" size="sm">
              정보 수정
            </Button>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          상담 가능한 시간을 선택하세요
        </h3>

        {availableSlots.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">예약 가능한 시간이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableSlots.map(slot => {
              const period = periods.find(p => p.number === slot.period);
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSlotSelect(slot)}
                  className="w-full p-4 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatDateKorean(slot.date)}{' '}
                      {period?.label ?? `${slot.period}교시`}
                    </div>
                    <div className="text-sm text-gray-600">
                      {slot.startTime} ~ {slot.endTime}
                    </div>
                  </div>
                  <Calendar className="w-5 h-5 text-blue-500" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // step === 3
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {selectedSlot && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <div className="font-medium text-gray-900 mb-1">
              {formatDateKorean(selectedSlot.date)}{' '}
              {periods.find(p => p.number === selectedSlot.period)?.label ??
                `${selectedSlot.period}교시`}
            </div>
            <div className="text-sm text-gray-700">
              {selectedSlot.startTime} ~ {selectedSlot.endTime}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleBookingSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상담 주제
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COUNSELING_TOPICS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={`px-3 py-2 rounded-lg text-sm border ${topic === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상담 방식
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="consultationType"
                value="face"
                checked={consultationType === 'face'}
                onChange={(e) => setConsultationType(e.target.value as 'face')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">대면 상담</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="consultationType"
                value="phone"
                checked={consultationType === 'phone'}
                onChange={(e) => setConsultationType(e.target.value as 'phone')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">전화 상담</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="consultationType"
                value="etc"
                checked={consultationType === 'etc'}
                onChange={(e) => setConsultationType(e.target.value as 'etc')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">기타</span>
            </label>
          </div>
          {consultationType === 'etc' && (
            <div className="mt-2">
              <input
                type="text"
                value={consultationTypeEtc}
                onChange={(e) => setConsultationTypeEtc(e.target.value)}
                placeholder="기타 상담 방식을 입력해 주세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상담 내용 (선택)
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none [transform:translateZ(0)]"
            placeholder="상담받고 싶은 내용을 간단히 적어 주세요."
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? '예약 처리 중...' : '예약 완료하기'}
        </Button>
      </form>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
}

function CheckTab() {
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    cancelText: null as string | null,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim() || !studentName.trim()) {
      alert('학번과 이름을 모두 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const q = query(
        collection(db, 'reservations'),
        where('studentNumber', '==', studentNumber.trim()),
        where('studentName', '==', studentName.trim()),
      );
      const snapshot = await getDocs(q);

      const result: Reservation[] = [];
      snapshot.forEach(docSnap => {
        result.push({ id: docSnap.id, ...(docSnap.data() as Omit<Reservation, 'id'>) });
      });

      result.sort(
        (a, b) => a.date.localeCompare(b.date) || a.period - b.period,
      );

      setReservations(result);
      setSearched(true);
    } catch (error) {
      console.error('예약 조회 오류:', error);
      alert('예약 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (reservation: Reservation) => {
    setConfirmModal({
      isOpen: true,
      title: '예약 취소',
      message: `${reservation.studentName}(${reservation.studentNumber})의 예약을 취소하시겠습니까?`,
      cancelText: '취소',
      onConfirm: async () => {
        try {
          const reservationRef = doc(db, 'reservations', reservation.id);
          const slotRef = doc(db, 'availableSlots', reservation.slotId);

          await runTransaction(db, async transaction => {
            transaction.delete(reservationRef);
            transaction.update(slotRef, { status: 'available' });
          });

          setReservations(prev => prev.filter(r => r.id !== reservation.id));
          // 예약 취소 성공 시에도 모달로 알림을 띄우는 것이 좋겠지만, 
          // 기존 로직 유지를 위해 alert 사용 또는 필요 시 변경 가능.
          // 여기서는 일단 alert 유지 (사용자 요청은 예약 완료 팝업이었음)
          alert('예약이 취소되었습니다.');
        } catch (error) {
          console.error('예약 취소 오류:', error);
          alert('예약 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-lg shadow-md p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2" />
              학번
            </label>
            <input
              type="text"
              value={studentNumber}
              onChange={e => setStudentNumber(e.target.value)}
              placeholder="학번을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [transform:translateZ(0)]"
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
              onChange={e => setStudentName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [transform:translateZ(0)]"
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
          {loading ? '조회 중...' : '예약 조회하기'}
        </Button>
      </form>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          예약 내역
        </h3>

        {loading && (
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        )}

        {!loading && searched && reservations.length === 0 && (
          <p className="text-gray-600 text-sm">조회된 예약 내역이 없습니다.</p>
        )}

        {!loading && reservations.length > 0 && (
          <div className="space-y-3">
            {reservations.map(reservation => (
              <div
                key={reservation.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    {formatDateKorean(reservation.date)}
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    {reservation.startTime} ~ {reservation.endTime}
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    {reservation.topic}
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    상담 방식: {reservation.consultationType === 'face' ? '대면 상담' : reservation.consultationType === 'phone' ? '전화 상담' : '기타'}
                    {reservation.consultationType === 'etc' && reservation.consultationTypeEtc && ` (${reservation.consultationTypeEtc})`}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleCancel(reservation)}
                >
                  <X className="w-4 h-4" />
                  예약 취소
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>


      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={true}
        confirmText="예약 취소"
        cancelText={confirmModal.cancelText}
      />
    </div >
  );
}
