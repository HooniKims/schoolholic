'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface CalendarProps {
  selectedDates: string[];
  onDateSelect: (date: string) => void;
  minDate?: Date;
}

export default function Calendar({ selectedDates, onDateSelect, minDate = new Date() }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const date = new Date(year, month, day);
    const dateString = formatDate(date);

    // 과거 날짜는 선택 불가
    if (date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) {
      return;
    }

    onDateSelect(dateString);
  };

  const isSelected = (day: number) => {
    const date = formatDate(new Date(year, month, day));
    return selectedDates.includes(date);
  };

  const isPastDate = (day: number) => {
    const date = new Date(year, month, day);
    return date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const selected = isSelected(day);
    const past = isPastDate(day);

    days.push(
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        disabled={past}
        className={`
          aspect-square rounded-lg text-sm font-medium transition-all duration-200
          ${past
            ? 'text-gray-300 cursor-not-allowed'
            : selected
            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
          }
        `}
      >
        {day}
      </button>
    );
  }

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {year}년 {monthNames[month]}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div
            key={day}
            className="aspect-square flex items-center justify-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">{days}</div>
    </div>
  );
}
