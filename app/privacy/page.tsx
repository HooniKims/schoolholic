'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Globe, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

type PolicyRow = {
  category: string;
  purpose: string;
  items: string;
  retention: string;
};

type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type PolicyLocale = {
  title: string;
  badge: string;
  summary: string;
  effectiveDate: string;
  intro: string[];
  collectionHeading: string;
  collectionRows: PolicyRow[];
  sections: PolicySection[];
  transferHeading: string;
  transferIntro: string[];
  transferRows: Array<{ label: string; value: string }>;
  contactHeading: string;
  contactRows: Array<{ label: string; value: string }>;
};

const policyContent: Record<'ko' | 'en', PolicyLocale> = {
  ko: {
    title: '개인정보처리방침',
    badge: 'Privacy Policy',
    summary:
      'Schoolholic 서비스에서 수집·이용하는 개인정보, 보관기간, 이용자의 권리 및 안전조치 기준을 안내합니다.',
    effectiveDate: '시행일: 2026년 3월 15일',
    intro: [
      'Schoolholic(이하 "서비스")는 「개인정보 보호법」 등 관계 법령을 준수하며, 이용자의 개인정보를 적법하고 안전하게 처리합니다.',
      '본 방침은 서비스 운영 과정에서 처리되는 개인정보의 항목, 목적, 보유기간, 국외 이전 가능성 및 이용자의 권리 행사 방법을 설명합니다.',
    ],
    collectionHeading: '1. 처리하는 개인정보 항목, 목적 및 보유기간',
    collectionRows: [
      {
        category: '회원가입 및 로그인',
        purpose: '회원 식별, 가입 및 로그인, 계정 관리, 학교 및 학급 기반 서비스 제공',
        items:
          '이메일, 비밀번호(인증용), 이름, 회원 유형(교사/학부모/관리자), 학교명, 학교코드, 학년, 반, 사용자 식별값(uid), 생성일시, 수정일시',
        retention:
          '회원 탈퇴 시까지. 다만 관계 법령에 따라 보존이 필요한 경우 해당 기간까지',
      },
      {
        category: '학부모 추가정보',
        purpose: '알림장 조회, 담임교사 자동 매칭, 상담 예약 및 조회',
        items: '학생 이름, 담임교사 매칭 정보(matchedTeacherId)',
        retention: '회원 탈퇴 시까지',
      },
      {
        category: '계정보호 및 보안관리',
        purpose: '비정상 로그인 시도 탐지, 계정 잠금 및 보안 관리',
        items: '로그인 실패 횟수, 계정 잠금 여부',
        retention: '잠금 해제 또는 회원 탈퇴 시까지',
      },
      {
        category: '알림장 작성 및 조회',
        purpose: '알림장 작성, 저장, 수정, 조회, 학부모 열람 제공',
        items: '알림장 날짜, 교사 원문 메모, AI 요약문, 교사 식별자, 수정일시',
        retention: '이용자가 삭제하거나 회원 탈퇴 시까지',
      },
      {
        category: '상담 가능 시간 관리',
        purpose: '상담 가능 시간 등록 및 운영',
        items: '교사 식별자, 상담 가능 일자, 교시, 시작 시간, 종료 시간, 예약 상태, 생성일시',
        retention: '이용자가 삭제하거나 회원 탈퇴 시까지',
      },
      {
        category: '상담 예약 및 조회',
        purpose: '상담 예약, 조회, 취소, 상담 이력 관리',
        items:
          '학생 이름, 학년, 반, 교사 식별자, 예약 일시, 상담 주제, 상담 내용, 상담 방식(대면/전화/기타), 기타 방식 입력 내용, 생성일시',
        retention:
          '예약일이 속한 학년도 종료 시까지. 다만 관계 법령 또는 분쟁 대응을 위해 필요한 경우 해당 기간까지',
      },
      {
        category: '서비스 환경 설정',
        purpose: '서비스 표시 언어 유지',
        items: '언어 설정값',
        retention: '이용자가 브라우저에서 삭제할 때까지',
      },
    ],
    sections: [
      {
        title: '2. 개인정보의 수집 방법',
        bullets: [
          '회원가입, 프로필 수정, 상담 예약, 알림장 작성 과정에서 이용자가 직접 입력',
          '이메일/비밀번호 로그인 또는 Google 로그인 등 외부 인증수단을 통한 계정 인증 결과 수신',
          '서비스 이용 과정에서 예약, 알림장, 계정 보안 정보 자동 생성',
          '브라우저 저장소(localStorage)를 통한 언어 설정 저장',
        ],
      },
      {
        title: '3. 개인정보의 제3자 제공',
        paragraphs: [
          '서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.',
          '다만 이용자가 사전에 동의한 경우 또는 법령에 특별한 규정이 있거나 법령상 의무를 준수하기 위하여 불가피한 경우에는 예외로 할 수 있습니다.',
        ],
      },
      {
        title: '4. 외부 서비스 이용 및 처리위탁',
        bullets: [
          'Firebase Authentication: 회원가입, 로그인, Google 로그인, 비밀번호 재설정, 계정 인증',
          'Cloud Firestore: 회원 정보, 알림장, 상담 가능 시간, 상담 예약 등 서비스 데이터 저장',
          '외부 AI API: 교사가 입력한 알림장 원문을 요약하는 AI 기능 처리',
          '서비스 운영 구조나 계약 관계가 변경되는 경우, 변경 사항은 본 방침 또는 별도 공지를 통해 안내합니다.',
        ],
      },
      {
        title: '6. 개인정보의 파기절차 및 파기방법',
        paragraphs: [
          '서비스는 개인정보 보유기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.',
        ],
        bullets: [
          '전자적 파일 형태의 정보는 복구 또는 재생이 불가능한 방법으로 삭제합니다.',
          '종이 문서 형태의 정보는 분쇄하거나 소각하는 방법으로 파기합니다.',
        ],
      },
      {
        title: '7. 정보주체의 권리·의무 및 행사방법',
        paragraphs: [
          '이용자는 언제든지 자신의 개인정보에 대하여 열람, 정정, 삭제, 처리정지, 동의 철회 및 회원탈퇴를 요구할 수 있습니다.',
          '이용자는 서비스 내 기능 또는 아래 문의처를 통해 학생 이름, 학년/반, 상담 예약, 알림장 등 일부 정보를 직접 수정하거나 삭제할 수 있습니다.',
          '법정대리인이나 위임받은 대리인을 통한 권리 행사도 가능하며, 관련 법령에 따라 필요한 서류 제출을 요청할 수 있습니다.',
          '법령에서 정한 일부 경우에는 열람, 정정, 삭제, 처리정지 요구가 제한될 수 있습니다.',
        ],
      },
      {
        title: '8. 개인정보의 안전성 확보조치',
        bullets: [
          '회원 유형별 권한 분리 및 접근 범위 제한',
          '인증 서비스와 접근통제를 통한 비인가 접근 방지',
          '로그인 실패 누적 시 계정 잠금 기능 적용',
          '개인정보 전송 구간 보호를 위한 보안 통신(HTTPS) 사용',
          '개인정보 접근 권한의 최소화',
        ],
      },
      {
        title: '9. 만 14세 미만 아동의 개인정보 처리',
        paragraphs: [
          '서비스는 교사, 학부모, 관리자 계정을 대상으로 하며, 만 14세 미만 아동의 직접 회원가입을 예정하지 않습니다.',
          '다만 학부모 계정을 통해 학생 이름 등 학생 관련 정보가 입력될 수 있으며, 해당 정보는 학급 운영, 알림장 제공, 상담 예약 목적 범위 내에서만 처리합니다.',
        ],
      },
      {
        title: '10. 자동으로 수집하는 장치의 설치·운영 및 거부',
        paragraphs: [
          '서비스는 광고 또는 행태분석 목적의 자체 쿠키를 운영하지 않습니다. 다만 서비스 언어 유지 등을 위해 브라우저 저장소(localStorage)를 사용할 수 있습니다.',
        ],
        bullets: [
          '이용자는 브라우저 설정에서 저장된 정보를 삭제할 수 있습니다.',
          '이용자는 브라우저 설정에서 저장 기능을 제한할 수 있습니다.',
        ],
      },
      {
        title: '12. 권익침해 구제방법',
        bullets: [
          '개인정보분쟁조정위원회: 1833-6972 / www.kopico.go.kr',
          '개인정보침해신고센터: 118 / privacy.kisa.or.kr',
          '경찰청 사이버범죄 신고시스템: 182 / ecrm.police.go.kr',
        ],
      },
      {
        title: '13. 개인정보처리방침의 변경',
        bullets: [
          '본 방침은 2026년 3월 15일부터 적용됩니다.',
          '내용의 추가, 삭제 또는 수정이 있는 경우 서비스 공지사항 또는 별도 안내를 통해 사전에 고지합니다.',
          '이용자 권리에 중대한 변경이 있는 경우에는 최소 30일 전에 고지합니다.',
        ],
      },
    ],
    transferHeading: '5. 개인정보의 국외 이전',
    transferIntro: [
      '서비스는 Firebase Authentication 기반 인증 기능을 사용하므로, 회원가입 및 로그인 과정에서 개인정보가 국외 서버에서 처리될 수 있습니다.',
      '이는 Google 로그인뿐 아니라 이메일/비밀번호 로그인에도 동일하게 적용될 수 있습니다.',
      '알림장 AI 요약 기능은 외부 API를 이용하여 동작하며, 향후 실제 국외 이전이 발생하거나 이전 항목이 구체화되는 경우에는 그 내용을 본 방침 또는 별도 안내를 통해 고지합니다.',
    ],
    transferRows: [
      { label: '이전받는 자', value: 'Firebase Authentication(Google 제공 인증 서비스)' },
      { label: '이전 국가', value: '미국' },
      { label: '이전 시점 및 방법', value: '회원가입, 로그인, 계정 인증 처리 시 정보통신망을 통한 전송' },
      {
        label: '이전 항목',
        value:
          '이메일, 사용자 식별값(uid), 인증 관련 식별정보, 접속 IP, 사용자 환경 정보(user agent) 등 인증 과정에서 처리되는 정보',
      },
      { label: '이전 목적', value: '회원 인증, 로그인 처리, 계정 관리, 비정상 로그인 탐지 및 보안 관리' },
      {
        label: '보유 및 이용기간',
        value: '계정 삭제 또는 서비스 이용 종료 시까지, 또는 관련 법령 및 서비스 제공에 필요한 기간까지',
      },
      {
        label: '거부 시 효과',
        value: '이용자가 해당 이전을 원하지 않을 경우 회원가입 및 로그인 등 서비스 핵심 기능 이용이 제한될 수 있습니다.',
      },
    ],
    contactHeading: '11. 개인정보 보호책임자 및 문의처',
    contactRows: [
      { label: '개인정보 보호책임자', value: '김형훈' },
      { label: '직책', value: '등촌중학교 교사' },
      { label: '이메일', value: 'greenguyhh@gmail.com' },
      { label: '연락처', value: '02-6380-8339' },
      { label: '개인정보 열람·정정·삭제·처리정지 청구 접수처', value: '상기 이메일 또는 연락처' },
    ],
  },
  en: {
    title: 'Privacy Policy',
    badge: 'Schoolholic',
    summary:
      'This page explains what personal data Schoolholic processes, why it is processed, how long it is retained, and what rights users have.',
    effectiveDate: 'Effective date: March 15, 2026',
    intro: [
      'Schoolholic ("the Service") complies with applicable privacy laws and processes users\' personal data lawfully and securely.',
      'This policy explains the categories of personal data processed in connection with the Service, the purposes of processing, retention periods, possible cross-border transfers, and how users may exercise their rights.',
    ],
    collectionHeading: '1. Categories of Personal Data, Purposes, and Retention Periods',
    collectionRows: [
      {
        category: 'Sign-up and login',
        purpose: 'User identification, sign-up, login, account management, and school/class-based service operation',
        items:
          'Email address, password for authentication, name, user role (teacher/parent/admin), school name, school code, grade, class, user identifier (uid), created at, updated at',
        retention:
          'Until account deletion, unless a longer retention period is required by applicable law',
      },
      {
        category: 'Additional parent information',
        purpose: 'Notice viewing, automatic homeroom teacher matching, counseling booking and inquiry',
        items: 'Student name, matched homeroom teacher information (matchedTeacherId)',
        retention: 'Until account deletion',
      },
      {
        category: 'Account protection and security',
        purpose: 'Detection of abnormal login attempts, account lock management, and security control',
        items: 'Failed login count, account lock status',
        retention: 'Until unlock or account deletion',
      },
      {
        category: 'Notice creation and viewing',
        purpose: 'Creating, saving, editing, viewing, and delivering notices to parents',
        items: 'Notice date, teacher memo, AI-generated summary, teacher identifier, updated at',
        retention: 'Until deleted by the user or until account deletion',
      },
      {
        category: 'Counseling availability management',
        purpose: 'Registration and operation of available counseling time slots',
        items: 'Teacher identifier, available date, period, start time, end time, booking status, created at',
        retention: 'Until deleted by the user or until account deletion',
      },
      {
        category: 'Counseling reservations and inquiries',
        purpose: 'Booking, viewing, canceling, and managing counseling records',
        items:
          'Student name, grade, class, teacher identifier, reservation date and time, counseling topic, counseling details, counseling method (in-person/phone/other), additional method text, created at',
        retention:
          'Until the end of the academic year that includes the reservation date, unless a longer period is required by law or dispute handling needs',
      },
      {
        category: 'Service preferences',
        purpose: 'Maintaining the selected display language',
        items: 'Language preference value',
        retention: 'Until removed by the user from the browser',
      },
    ],
    sections: [
      {
        title: '2. Methods of Collection',
        bullets: [
          'Information entered directly by users during sign-up, profile updates, counseling bookings, and notice creation',
          'Authentication results received through email/password login or external sign-in providers such as Google login',
          'Reservation, notice, and account security data generated automatically while using the Service',
          'Language preference stored through browser storage (localStorage)',
        ],
      },
      {
        title: '3. Provision to Third Parties',
        paragraphs: [
          'As a rule, the Service does not provide users\' personal data to external third parties.',
          'Exceptions may apply where the user has provided prior consent or where disclosure is required by law or unavoidable to comply with a legal obligation.',
        ],
      },
      {
        title: '4. External Services and Outsourced Processing',
        bullets: [
          'Firebase Authentication: sign-up, login, Google login, password reset, and account authentication',
          'Cloud Firestore: storage of member profiles, notices, available counseling slots, and reservation data',
          'External AI API: AI summarization of teacher-written notice content',
          'If the service structure or contractual arrangement changes, the updated details will be disclosed through this policy or a separate notice.',
        ],
      },
      {
        title: '6. Deletion Procedures and Methods',
        paragraphs: [
          'The Service deletes personal data without delay once the retention period expires or the purpose of processing has been fulfilled.',
        ],
        bullets: [
          'Electronic files are deleted in a manner that prevents recovery or restoration.',
          'Paper documents, if any, are destroyed by shredding or incineration.',
        ],
      },
      {
        title: '7. Rights of Data Subjects and How to Exercise Them',
        paragraphs: [
          'Users may request access, correction, deletion, suspension of processing, withdrawal of consent, and account deletion at any time.',
          'Some information, such as student names, grade/class information, counseling reservations, and notices, can be edited or deleted directly through the Service or by contacting the person in charge listed below.',
          'Rights may also be exercised through a legal representative or authorized agent, in which case supporting documents may be required under applicable law.',
          'Certain requests may be restricted where permitted by law.',
        ],
      },
      {
        title: '8. Security Measures',
        bullets: [
          'Role-based separation of permissions and limited access scopes',
          'Prevention of unauthorized access through authentication and access controls',
          'Account lock features after repeated failed login attempts',
          'Use of secure communication channels (HTTPS) for data transmission',
          'Minimum necessary access rights to personal data',
        ],
      },
      {
        title: '9. Personal Data of Children Under 14',
        paragraphs: [
          'The Service is intended for teacher, parent, and administrator accounts and does not plan direct registration by children under 14.',
          'Student-related information such as student names may still be entered through parent accounts, and such information is processed only within the scope necessary for class notices and counseling bookings.',
        ],
      },
      {
        title: '10. Automatic Collection Tools and Refusal Options',
        paragraphs: [
          'The Service does not operate its own cookies for advertising or behavioral analytics. It may use browser storage (localStorage) to remember service language preferences.',
        ],
        bullets: [
          'Users may delete stored information through their browser settings.',
          'Users may also restrict storage functions through their browser settings.',
        ],
      },
      {
        title: '12. Remedies for Privacy Infringement',
        bullets: [
          'Personal Information Dispute Mediation Committee: +82-1833-6972 / www.kopico.go.kr',
          'Personal Information Infringement Report Center: 118 / privacy.kisa.or.kr',
          'Korean National Police Agency Cybercrime Report System: 182 / ecrm.police.go.kr',
        ],
      },
      {
        title: '13. Changes to This Privacy Policy',
        bullets: [
          'This policy takes effect on March 15, 2026.',
          'If content is added, removed, or revised, the Service will provide prior notice through a service announcement or separate notice.',
          'If a change materially affects users\' rights, notice will be given at least 30 days in advance.',
        ],
      },
    ],
    transferHeading: '5. Cross-Border Transfer of Personal Data',
    transferIntro: [
      'Because the Service uses Firebase Authentication for account authentication, personal data may be processed on servers located outside Korea during sign-up and login.',
      'This may apply not only to Google login, but also to email/password authentication flows that rely on Firebase Authentication.',
      'The AI notice summary feature uses an external API. If actual cross-border transfer occurs for that function or the transferred items become definite, the relevant details will be disclosed through this policy or a separate notice.',
    ],
    transferRows: [
      { label: 'Recipient', value: 'Firebase Authentication (authentication service provided by Google)' },
      { label: 'Country', value: 'United States' },
      { label: 'Timing and method', value: 'Transferred over network communications during sign-up, login, and account authentication' },
      {
        label: 'Transferred items',
        value:
          'Email address, user identifier (uid), authentication-related identifiers, IP address, user agent, and other data processed during authentication',
      },
      { label: 'Purpose', value: 'User authentication, login processing, account management, abnormal login detection, and security control' },
      {
        label: 'Retention and use period',
        value: 'Until account deletion or service termination, or longer if required by law or necessary for service operation',
      },
      {
        label: 'Effect of refusal',
        value: 'If the user does not agree to such transfer where consent is required, core features such as sign-up and login may be restricted.',
      },
    ],
    contactHeading: '11. Privacy Officer and Contact Information',
    contactRows: [
      { label: 'Privacy officer', value: 'KIM HYEONG HOON' },
      { label: 'Title', value: 'Teacher at Deungchon Middle School' },
      { label: 'Email', value: 'greenguyhh@gmail.com' },
      { label: 'Phone', value: '02-6380-8339' },
      { label: 'Requests for access, correction, deletion, or suspension', value: 'Please contact the email address or phone number above' },
    ],
  },
};

function SectionCard({ title, paragraphs, bullets }: PolicySection) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
      {paragraphs && (
        <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}
      {bullets && (
        <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PrivacyPage() {
  const { language, setLanguage, t } = useLanguage();
  const content = policyContent[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-emerald-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToMain')}
            </Link>
            <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-100/70 px-4 py-2 text-sm font-medium text-cyan-900">
              <ShieldCheck className="h-4 w-4" />
              {content.badge}
            </div>
          </div>

          <button
            onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            title={language === 'ko' ? 'Switch to English' : 'Switch to Korean'}
          >
            <Globe className="h-4 w-4" />
            {language === 'ko' ? 'English' : '한국어'}
          </button>
        </div>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-xl shadow-cyan-900/5 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-950 via-cyan-950 to-emerald-950 px-6 py-10 text-white sm:px-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
              <FileText className="h-3.5 w-3.5" />
              {content.badge}
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{content.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-cyan-50/90 sm:text-base">{content.summary}</p>
            <p className="mt-5 text-sm font-medium text-emerald-200">{content.effectiveDate}</p>
          </div>

          <div className="space-y-6 px-6 py-8 sm:px-10 sm:py-10">
            <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-8">
              <div className="space-y-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
                {content.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <ul className="space-y-3 pt-2">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                    <span>
                      {language === 'ko'
                        ? '서비스는 비밀번호 원문을 별도로 저장하지 않으며, 인증 서비스에서 처리합니다.'
                        : 'The Service does not separately store plain-text passwords. Authentication-related password data is handled by the authentication service.'}
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                    <span>
                      {language === 'ko'
                        ? '서비스는 원칙적으로 주민등록번호 등 고유식별정보를 수집하지 않습니다.'
                        : 'As a rule, the Service does not collect national identification numbers or similar unique identifiers.'}
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                    <span>
                      {language === 'ko'
                        ? '알림장 원문, 상담 내용 등 자유입력란에는 이용자가 직접 개인정보를 기재할 수 있으므로 불필요한 개인정보 입력은 자제해 주시기 바랍니다.'
                        : 'Users may directly enter personal information in free-text fields such as notice content or counseling details, so unnecessary personal information should not be entered.'}
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-8">
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{content.collectionHeading}</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200 text-left text-sm text-slate-700">
                  <thead className="bg-slate-100 text-slate-900">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                        {language === 'ko' ? '구분' : 'Category'}
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                        {language === 'ko' ? '처리 목적' : 'Purpose'}
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                        {language === 'ko' ? '처리 항목' : 'Items'}
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                        {language === 'ko' ? '보유기간' : 'Retention'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.collectionRows.map((row) => (
                      <tr key={row.category} className="align-top odd:bg-white even:bg-slate-50/70">
                        <td className="border-b border-slate-200 px-4 py-4 font-medium text-slate-900">{row.category}</td>
                        <td className="border-b border-slate-200 px-4 py-4">{row.purpose}</td>
                        <td className="border-b border-slate-200 px-4 py-4">{row.items}</td>
                        <td className="border-b border-slate-200 px-4 py-4">{row.retention}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-8">
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{content.transferHeading}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
                {content.transferIntro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
                  <tbody>
                    {content.transferRows.map((row, index) => (
                      <tr key={row.label} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <th className="w-48 border-b border-slate-200 bg-slate-100 px-4 py-4 font-semibold text-slate-900">
                          {row.label}
                        </th>
                        <td className="border-b border-slate-200 px-4 py-4">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {content.sections.map((section) => (
              <SectionCard key={section.title} {...section} />
            ))}

            <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-8">
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{content.contactHeading}</h2>
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
                  <tbody>
                    {content.contactRows.map((row, index) => (
                      <tr key={row.label} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <th className="w-56 border-b border-slate-200 bg-slate-100 px-4 py-4 font-semibold text-slate-900">
                          {row.label}
                        </th>
                        <td className="border-b border-slate-200 px-4 py-4">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
