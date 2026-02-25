'use client';

import { useState, useEffect, FormEvent } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, onSnapshot, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import Calendar from '@/components/Calendar';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmModal from '@/components/ConfirmModal';
import { Period, AvailableSlot, Reservation, DEFAULT_PERIODS } from '@/types';
import { formatDate, formatDateKorean, generateId } from '@/lib/utils';
import { Clock, Trash2, Settings, Calendar as CalendarIcon, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TeacherPage() {
  const TEACHER_PASSWORD =
    process.env.NEXT_PUBLIC_TEACHER_PASSWORD || 'teacher1234';

  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authChecking, setAuthChecking] = useState(true);

  const [teacherId] = useState(
    process.env.NEXT_PUBLIC_TEACHER_ID || 'default_teacher_id'
  );

  const [periods, setPeriods] = useState<Period[]>(DEFAULT_PERIODS);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<{ [date: string]: number[] }>({});
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('teacherAuthorizedAt');
    if (stored) {
      const ts = parseInt(stored, 10);
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (!Number.isNaN(ts) && Date.now() - ts < ONE_DAY) {
        setAuthorized(true);
      }
    }
    setAuthChecking(false);
  }, []);

  // 교시 시간 로드
  useEffect(() => {
    if (!teacherId) return;

    const loadPeriods = async () => {
      try {
        const periodsDoc = await getDocs(
          query(collection(db, 'teachers'), where('id', '==', teacherId))
        );

        if (!periodsDoc.empty) {
          const data = periodsDoc.docs[0].data();
          if (data.periods) {
            setPeriods(data.periods);
          }
        }
      } catch (error) {
        console.error('교시 로드 오류:', error);
      }
    };

    loadPeriods();
  }, [teacherId]);

  // 상담 가능 시간 및 예약 현황 실시간 로드
  useEffect(() => {
    if (!teacherId) return;

    const today = formatDate(new Date()); // YYYY-MM-DD 형식

    // 인덱스 없이 작동하도록 단일 where 조건만 사용하고 클라이언트에서 필터링
    const slotsQuery = query(
      collection(db, 'availableSlots'),
      where('teacherId', '==', teacherId)
    );

    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('teacherId', '==', teacherId)
    );

    const unsubscribeSlots = onSnapshot(slotsQuery, (snapshot) => {
      const slots: AvailableSlot[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as AvailableSlot;
        // 클라이언트 측에서 날짜 필터링
        if (data.date >= today) {
          slots.push({ id: doc.id, ...data });
        }
      });
      setAvailableSlots(slots);
      setLoading(false);
    });

    const unsubscribeReservations = onSnapshot(reservationsQuery, (snapshot) => {
      const reservs: Reservation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Reservation;
        // 클라이언트 측에서 날짜 필터링
        if (data.date >= today) {
          reservs.push({ id: doc.id, ...data });
        }
      });
      setReservations(reservs.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period));
    });

    return () => {
      unsubscribeSlots();
      unsubscribeReservations();
    };
  }, [teacherId]);

  // 교시 시간 저장
  const savePeriods = async () => {
    try {
      const teachersRef = collection(db, 'teachers');
      const q = query(teachersRef, where('id', '==', teacherId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(teachersRef, {
          id: teacherId,
          periods: periods,
          createdAt: Date.now(),
        });
      } else {
        const docRef = doc(db, 'teachers', querySnapshot.docs[0].id);
        await updateDoc(docRef, { periods });
      }

      alert('교시 시간이 저장되었습니다.');
      setShowSettings(false);
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 날짜 선택 핸들러
  const handleDateSelect = (date: string) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter((d) => d !== date));
      const newSelectedPeriods = { ...selectedPeriods };
      delete newSelectedPeriods[date];
      setSelectedPeriods(newSelectedPeriods);
    } else {
      setSelectedDates([...selectedDates, date].sort());
    }
  };

  // 교시 선택 핸들러
  const handlePeriodToggle = (date: string, periodNum: number) => {
    const currentPeriods = selectedPeriods[date] || [];
    if (currentPeriods.includes(periodNum)) {
      setSelectedPeriods({
        ...selectedPeriods,
        [date]: currentPeriods.filter((p) => p !== periodNum),
      });
    } else {
      setSelectedPeriods({
        ...selectedPeriods,
        [date]: [...currentPeriods, periodNum].sort(),
      });
    }
  };

  // 상담 시간 설정 완료
  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordInput === TEACHER_PASSWORD) {
      setAuthorized(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('teacherAuthorizedAt', String(Date.now()));
      }
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleSaveSlots = async () => {
    try {
      const slotsToAdd: Partial<AvailableSlot>[] = [];

      Object.entries(selectedPeriods).forEach(([date, periods]) => {
        periods.forEach((periodNum) => {
          const period = DEFAULT_PERIODS.find((p) => p.number === periodNum);
          if (period) {
            // 이미 존재하는지 확인
            const exists = availableSlots.some(
              (slot) => slot.date === date && slot.period === periodNum
            );

            if (!exists) {
              slotsToAdd.push({
                teacherId,
                date,
                period: periodNum,
                startTime: period.startTime,
                endTime: period.endTime,
                status: 'available',
                createdAt: Date.now(),
              });
            }
          }
        });
      });

      for (const slot of slotsToAdd) {
        await addDoc(collection(db, 'availableSlots'), slot);
      }

      setSelectedDates([]);
      setSelectedPeriods({});
      alert('상담 가능 시간이 설정되었습니다.');
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 슬롯 삭제
  const handleDeleteSlot = (slotId: string) => {
    setConfirmModal({
      isOpen: true,
      title: '상담 시간 삭제',
      message: '이 시간대를 삭제하시겠습니까?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'availableSlots', slotId));
        } catch (error) {
          console.error('삭제 오류:', error);
          alert('삭제에 실패했습니다.');
        }
      },
    });
  };

  // 예약 취소 (교사)
  const handleCancelReservation = (reservation: Reservation) => {
    setConfirmModal({
      isOpen: true,
      title: '예약 취소',
      message: `${reservation.studentName}(${reservation.studentNumber})의 예약을 취소하시겠습니까?`,
      onConfirm: async () => {
        try {
          const reservationRef = doc(db, 'reservations', reservation.id);
          const slotRef = doc(db, 'availableSlots', reservation.slotId);

          await runTransaction(db, async (transaction) => {
            transaction.delete(reservationRef);
            transaction.update(slotRef, { status: 'available' });
          });

          alert('예약이 취소되었습니다.');
        } catch (error) {
          console.error('예약 취소 오류:', error);
          alert('예약 취소에 실패했습니다.');
        }
      },
    });
  };

  // Excel 내보내기
  const handleExportToExcel = () => {
    if (reservations.length === 0) {
      alert('내보낼 예약 데이터가 없습니다.');
      return;
    }

    // 데이터 준비
    const data = reservations.map((reservation) => {
      const period = periods.find((p) => p.number === reservation.period);
      let consultationTypeStr = '';
      if (reservation.consultationType === 'face') consultationTypeStr = '대면 상담';
      else if (reservation.consultationType === 'phone') consultationTypeStr = '전화 상담';
      else if (reservation.consultationType === 'etc') consultationTypeStr = `기타 (${reservation.consultationTypeEtc || ''})`;

      return {
        '학번': reservation.studentNumber,
        '이름': reservation.studentName,
        '날짜': formatDateKorean(reservation.date),
        '교시': period?.label || `${reservation.period}교시`,
        '시간': `${reservation.startTime} - ${reservation.endTime}`,
        '상담 주제': reservation.topic,
        '상담 방식': consultationTypeStr,
        '상담 내용': reservation.content,
        '예약 일시': new Date(reservation.createdAt).toLocaleString('ko-KR'),
      };
    });

    // 워크북 생성
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '상담 예약 목록');

    // 파일 다운로드
    const fileName = `상담예약_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (authChecking) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (!authorized) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <form
            onSubmit={handlePasswordSubmit}
            className="w-full max-w-sm bg-white shadow-md rounded-lg p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-center">교사 전용 페이지</h2>
            <p className="text-sm text-gray-600 text-center">
              비밀번호를 입력해 주세요.
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [transform:translateZ(0)]"
              placeholder="비밀번호"
            />
            <Button type="submit" className="w-full">
              입장하기
            </Button>
          </form>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout title="교사 대시보드">
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout title="상담 예약 관리" description="상담 가능한 날짜와 시간을 설정하고 예약 현황을 확인하세요">
      <div className="p-6 sm:p-8">
        {/* 교시 설정 버튼 */}
        <div className="mb-6">
          <Button
            onClick={() => setShowSettings(!showSettings)}
            variant="secondary"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            교시 시간 설정
          </Button>
        </div>

        {/* 교시 설정 패널 */}
        {showSettings && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">교시별 시간 설정</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {periods.map((period, index) => (
                <div key={period.number} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-16">{period.label}</span>
                  <input
                    type="time"
                    value={period.startTime}
                    onChange={(e) => {
                      const newPeriods = [...periods];
                      newPeriods[index].startTime = e.target.value;
                      setPeriods(newPeriods);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={period.endTime}
                    onChange={(e) => {
                      const newPeriods = [...periods];
                      newPeriods[index].endTime = e.target.value;
                      setPeriods(newPeriods);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
            <Button onClick={savePeriods} size="sm">
              시간 저장
            </Button>
          </div>
        )}

        {/* 날짜 선택 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            상담 가능 날짜 선택
          </h3>
          <Calendar selectedDates={selectedDates} onDateSelect={handleDateSelect} />
        </div>

        {/* 선택된 날짜별 교시 선택 */}
        {selectedDates.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              교시 선택
            </h3>
            <div className="space-y-4">
              {selectedDates.map((date) => (
                <div key={date} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3 text-gray-900">
                    {formatDateKorean(date)}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {periods.map((period) => {
                      const isSelected = selectedPeriods[date]?.includes(period.number);
                      return (
                        <button
                          key={period.number}
                          onClick={() => handlePeriodToggle(date, period.number)}
                          className={`
                            px-3 py-2 rounded-lg text-sm font-medium transition-all
                            ${isSelected
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                            }
                          `}
                        >
                          {period.label}
                          <div className="text-xs opacity-90 mt-1">
                            {period.startTime}-{period.endTime}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button onClick={handleSaveSlots} size="lg" className="w-full sm:w-auto">
                상담 시간 설정 완료
              </Button>
            </div>
          </div>
        )}

        {/* 설정된 상담 가능 시간 목록 */}
        {availableSlots.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">설정된 상담 가능 시간</h3>
            <div className="space-y-2">
              {availableSlots
                .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period)
                .map((slot) => {
                  const period = periods.find((p) => p.number === slot.period);
                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${slot.status === 'reserved'
                        ? 'bg-gray-100 border-gray-300'
                        : 'bg-white border-gray-200'
                        }`}
                    >
                      <div className="flex-1">
                        <span className="font-medium">{formatDateKorean(slot.date)}</span>
                        <span className="mx-2 text-gray-400">|</span>
                        <span className="text-gray-700">
                          {period?.label} ({slot.startTime}-{slot.endTime})
                        </span>
                        {slot.status === 'reserved' && (
                          <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            예약됨
                          </span>
                        )}
                      </div>
                      {slot.status === 'available' && (
                        <Button
                          onClick={() => handleDeleteSlot(slot.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 예약 현황 */}
        {reservations.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-semibold">예약 현황 ({reservations.length}건)</h3>
              <Button
                onClick={handleExportToExcel}
                variant="secondary"
                size="sm"
                className="mt-2 sm:mt-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Excel 내보내기
              </Button>
            </div>
            <div className="space-y-4">
              {reservations.map((reservation) => {
                const period = periods.find((p) => p.number === reservation.period);
                return (
                  <div
                    key={reservation.id}
                    className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">
                          {reservation.studentNumber} - {reservation.studentName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDateKorean(reservation.date)} {period?.label}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleCancelReservation(reservation)}
                        variant="ghost"
                        size="sm"
                        className="mt-2 sm:mt-0 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        취소
                      </Button>
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">시간:</span> {reservation.startTime} - {reservation.endTime}
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">주제:</span> {reservation.topic}
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">방식:</span>{' '}
                      {reservation.consultationType === 'face'
                        ? '대면 상담'
                        : reservation.consultationType === 'phone'
                          ? '전화 상담'
                          : `기타 (${reservation.consultationTypeEtc || ''})`}
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">내용:</span> {reservation.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {availableSlots.length === 0 && reservations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>아직 설정된 상담 시간이 없습니다.</p>
            <p className="text-sm">달력에서 날짜를 선택하여 상담 가능 시간을 설정하세요.</p>
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
        confirmText="삭제"
      />
    </Layout>
  );
}
