'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Globe, Scale } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

type TermsSection = {
  title: string;
  paragraphs: string[];
};

type TermsLocale = {
  title: string;
  badge: string;
  summary: string;
  effectiveDate: string;
  sections: TermsSection[];
};

const termsContent: Record<'ko' | 'en', TermsLocale> = {
  ko: {
    title: '이용약관',
    badge: 'Schoolholic Terms',
    summary:
      '스쿨홀릭의 알림장, 상담예약, AI 요약 및 계정 기능 이용에 관한 기본 사항과 이용자·서비스 제공자의 권리와 의무를 안내합니다.',
    effectiveDate: '시행일: 2026년 6월 22일',
    sections: [
      {
        title: '스쿨홀릭 이용약관',
        paragraphs: [
          '스쿨홀릭 이용약관에 오신 것을 환영합니다. 본 약관은 Schoolholic 서비스 이용에 관한 기본적인 사항을 정합니다.',
          '스쿨홀릭은 교사가 알림장을 작성하고 AI 도움을 받아 문장을 다듬으며, 학부모가 알림장을 확인하고 상담 예약을 진행할 수 있도록 돕는 교육 지원 서비스입니다.',
        ],
      },
      {
        title: '제1조 (목적)',
        paragraphs: [
          '본 약관은 스쿨홀릭이 제공하는 통합 학급 커뮤니케이션 서비스의 이용과 관련하여 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.',
        ],
      },
      {
        title: '제2조 (서비스의 제공)',
        paragraphs: [
          '서비스는 교사용 알림장 작성 및 저장, AI 기반 알림장 문장 다듬기, 학부모용 알림장 조회, 상담 가능 시간 등록, 상담 예약·조회·취소, 회원가입 및 로그인 기능을 제공할 수 있습니다.',
          '서비스의 구체적인 기능은 운영 상황, 기술 환경, 법령 및 학교 현장의 필요에 따라 변경되거나 중단될 수 있습니다.',
          'AI가 생성하거나 다듬은 문장은 교육적 참고 자료이며, 교사는 실제 발송 또는 공유 전에 정확성, 적절성, 개인정보 포함 여부를 최종 확인해야 합니다.',
        ],
      },
      {
        title: '제3조 (서비스 이용 대상)',
        paragraphs: [
          '서비스의 계정 가입 대상은 교사, 학부모 및 관리자입니다. 이용자는 본인의 실제 정보와 소속 학교·학급 정보를 정확하게 입력해야 합니다.',
          '학부모는 자녀의 알림장 확인과 상담 예약을 위해 필요한 최소한의 학생 정보를 입력할 수 있습니다.',
          '만 14세 미만 학생의 개인정보가 서비스 이용 과정에서 입력되는 경우, 교사와 학부모는 관련 법령 및 학교 방침에 따라 필요한 안내와 보호 조치를 해야 합니다.',
        ],
      },
      {
        title: '제4조 (계정 및 보안)',
        paragraphs: [
          '이용자는 자신의 계정과 비밀번호를 안전하게 관리해야 하며, 계정을 제3자에게 양도하거나 공유해서는 안 됩니다.',
          '비정상적인 로그인 시도, 타인의 정보 도용, 서비스 운영 방해가 확인되는 경우 서비스 이용이 제한될 수 있습니다.',
          '이용자는 계정 도용 또는 보안 사고가 의심되는 경우 즉시 서비스 운영자에게 알려야 합니다.',
        ],
      },
      {
        title: '제5조 (이용자의 의무)',
        paragraphs: [
          '이용자는 타인의 개인정보를 불필요하게 입력하거나 공개해서는 안 되며, 알림장 원문과 상담 내용 등 자유 입력란에 민감정보를 작성하지 않도록 주의해야 합니다.',
          '이용자는 타인의 정보를 도용하거나, 허위 정보를 입력하거나, 서비스 운영을 방해하거나, 저작권 등 타인의 권리를 침해해서는 안 됩니다.',
          '교사는 AI 요약 또는 문장 다듬기 결과를 그대로 신뢰하지 말고 학급 상황, 학생 수준, 학부모 안내 목적에 맞는지 검토해야 합니다.',
        ],
      },
      {
        title: '제6조 (서비스 제공자의 의무)',
        paragraphs: [
          '서비스 제공자는 안정적인 서비스 제공과 개인정보 보호를 위해 합리적인 보호조치를 적용합니다.',
          '서비스 제공자는 관련 법령과 개인정보처리방침을 준수하며, 서비스 개선을 위해 이용자의 의견을 검토할 수 있습니다.',
        ],
      },
      {
        title: '제7조 (저작권 및 입력 자료)',
        paragraphs: [
          '서비스의 화면 구성, 문구, 소프트웨어, 디자인 및 운영 자료에 관한 권리는 서비스 제공자 또는 정당한 권리자에게 있습니다.',
          '교사 또는 학부모가 입력한 알림장, 상담 예약 내용, 학교·학급 정보의 권리와 책임은 해당 이용자 또는 소속 기관의 정책에 따릅니다.',
          '이용자는 서비스에서 제공되는 자료를 무단 복제, 배포, 변형하거나 상업적 목적으로 이용해서는 안 됩니다.',
        ],
      },
      {
        title: '제8조 (개인정보 보호)',
        paragraphs: [
          '서비스는 개인정보 보호를 위해 개인정보처리방침을 별도로 공개합니다.',
          '이용자는 서비스 이용 과정에서 불필요한 개인정보나 민감정보를 입력하지 않아야 하며, 개인정보 처리와 관련한 자세한 내용은 개인정보처리방침을 따릅니다.',
        ],
      },
      {
        title: '제9조 (책임의 제한)',
        paragraphs: [
          '서비스 제공자는 천재지변, 불가항력, 외부 플랫폼 장애, 네트워크 장애, 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.',
          'AI 결과물의 정확성, 완전성, 적합성을 보증하지 않으며, 알림장 발송과 상담 예약 운영에 관한 최종 판단과 책임은 해당 기능을 사용하는 이용자에게 있습니다.',
          '서비스는 학교 공식 행정 시스템을 대체하지 않으며, 학교 또는 기관의 공식 절차가 필요한 업무에는 해당 절차를 우선 적용해야 합니다.',
        ],
      },
      {
        title: '제10조 (서비스 이용 제한 및 종료)',
        paragraphs: [
          '이용자가 본 약관 또는 관련 법령을 위반하거나 서비스 운영에 중대한 지장을 주는 경우, 서비스 제공자는 이용을 제한하거나 계정을 비활성화할 수 있습니다.',
          '이용자는 언제든지 회원탈퇴 또는 서비스 이용 종료를 요청할 수 있으며, 개인정보와 데이터 처리 기준은 개인정보처리방침에 따릅니다.',
        ],
      },
      {
        title: '제11조 (분쟁 해결)',
        paragraphs: [
          '서비스 이용과 관련한 분쟁은 상호 협의를 통해 해결함을 원칙으로 합니다.',
          '협의가 이루어지지 않을 경우 관련 법령과 관할 기준에 따라 해결합니다.',
        ],
      },
      {
        title: '제12조 (약관의 효력 및 변경)',
        paragraphs: [
          '본 약관은 2026년 6월 22일부터 시행됩니다.',
          '약관이 변경되는 경우 서비스 화면 또는 별도 공지 방법으로 사전에 안내합니다.',
          '이용자는 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하거나 회원탈퇴를 요청할 수 있습니다.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    badge: 'Schoolholic Terms',
    summary:
      'These terms explain the basic rules for using Schoolholic features including class notices, counseling reservations, AI-assisted editing, and account functions.',
    effectiveDate: 'Effective date: June 22, 2026',
    sections: [
      {
        title: 'Schoolholic Terms of Service',
        paragraphs: [
          'Welcome to the Schoolholic Terms of Service. These terms set out the basic conditions for using the Schoolholic service.',
          'Schoolholic is an educational support service that helps teachers create notices, refine text with AI assistance, and helps parents view notices and book counseling appointments.',
        ],
      },
      {
        title: '1. Purpose',
        paragraphs: [
          'These terms define the rights, obligations, and responsibilities between the service provider and users in connection with the integrated class communication service provided by Schoolholic.',
        ],
      },
      {
        title: '2. Service Features',
        paragraphs: [
          'The Service may provide teacher notice creation and storage, AI-assisted notice editing, parent notice viewing, counseling availability registration, reservation booking, reservation inquiry and cancellation, sign-up, and login features.',
          'Specific features may be changed or discontinued depending on operational conditions, technical environments, applicable laws, and the needs of school settings.',
          'AI-generated or AI-refined text is educational reference material. Teachers must review accuracy, appropriateness, and whether personal data is included before sending or sharing it.',
        ],
      },
      {
        title: '3. Eligible Users',
        paragraphs: [
          'Teacher, parent, and administrator accounts may use the Service. Users must provide accurate identity, school, and class information.',
          'Parents may enter minimum student information necessary to view notices and book counseling appointments.',
          'Where personal data of children under 14 is entered while using the Service, teachers and parents must provide appropriate guidance and protection in accordance with applicable laws and school policies.',
        ],
      },
      {
        title: '4. Accounts and Security',
        paragraphs: [
          'Users are responsible for keeping their accounts and passwords secure and must not transfer or share accounts with third parties.',
          'Service access may be restricted if abnormal login attempts, identity misuse, or interference with service operation is detected.',
          'Users must notify the service operator immediately if account misuse or a security incident is suspected.',
        ],
      },
      {
        title: '5. User Obligations',
        paragraphs: [
          'Users must not unnecessarily enter or disclose another person’s personal data, and should avoid entering sensitive information in free-text fields such as notice drafts and counseling details.',
          'Users must not impersonate others, enter false information, interfere with service operation, or infringe copyrights or other rights of third parties.',
          'Teachers must not rely on AI summaries or edited text without review, and must confirm that the output fits the class context, student level, and parent communication purpose.',
        ],
      },
      {
        title: '6. Provider Obligations',
        paragraphs: [
          'The service provider applies reasonable safeguards for stable service operation and personal data protection.',
          'The service provider complies with applicable laws and the Privacy Policy, and may review user feedback to improve the Service.',
        ],
      },
      {
        title: '7. Copyright and User Input',
        paragraphs: [
          'Rights to the Service’s interface, wording, software, design, and operational materials belong to the service provider or lawful rights holders.',
          'Rights and responsibilities for notices, counseling details, and school/class information entered by users are subject to the relevant user or institution policy.',
          'Users must not copy, distribute, modify, or commercially exploit materials provided through the Service without authorization.',
        ],
      },
      {
        title: '8. Privacy',
        paragraphs: [
          'The Service separately publishes a Privacy Policy for personal data protection.',
          'Users should not enter unnecessary personal data or sensitive information while using the Service. Details on personal data processing are governed by the Privacy Policy.',
        ],
      },
      {
        title: '9. Limitation of Liability',
        paragraphs: [
          'The service provider is not responsible for service interruptions caused by natural disasters, force majeure, external platform failures, network failures, or reasons attributable to the user.',
          'The service provider does not guarantee the accuracy, completeness, or suitability of AI output. Final judgment and responsibility for notice delivery and counseling reservation operation belong to the user operating the feature.',
          'The Service does not replace official school administrative systems. Where official school or institutional procedures are required, those procedures should be followed first.',
        ],
      },
      {
        title: '10. Restriction and Termination',
        paragraphs: [
          'If a user violates these terms or applicable laws, or materially interferes with service operation, the service provider may restrict use or deactivate the account.',
          'Users may request account deletion or termination of service use at any time. Personal data and data handling are governed by the Privacy Policy.',
        ],
      },
      {
        title: '11. Dispute Resolution',
        paragraphs: [
          'Disputes related to service use should be resolved through mutual consultation where possible.',
          'If consultation does not resolve the dispute, it will be handled according to applicable laws and jurisdictional standards.',
        ],
      },
      {
        title: '12. Effect and Changes',
        paragraphs: [
          'These terms take effect on June 22, 2026.',
          'If these terms are changed, prior notice will be provided through the service screen or another notice method.',
          'If a user does not agree to the changed terms, the user may stop using the Service or request account deletion.',
        ],
      },
    ],
  },
};

function TermsCard({ title, paragraphs }: TermsSection) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 backdrop-blur sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export default function TermsPage() {
  const { language, setLanguage, t } = useLanguage();
  const content = termsContent[language];

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
              <Scale className="h-4 w-4" />
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
            {content.sections.map((section) => (
              <TermsCard key={section.title} {...section} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
