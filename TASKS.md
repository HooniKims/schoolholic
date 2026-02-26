# 스쿨홀릭 (Schoolholic) - 통합 학교 커뮤니케이션 플랫폼

## 프로젝트 개요
- **프레임워크**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **배포 대상**: Vercel
- **Firebase**: Firestore (알림장 & 상담 예약 데이터)
  - 기존 데이터베이스 구조와 문서를 그대로 유지 (데이터 손실 없음)
  - 알림장(`notes`), 교사정보(`teachers`), 상담슬롯(`availableSlots`), 예약정보(`reservations`) 컬렉션 공존
- **AI**: 로컬 LLM (Ollama via api.alluser.site 프록시, 브라우저 직접 호출)
- **디자인/UI**: 
  - 기본 폰트: 가독성을 높인 **Pretendard** 적용
  - 다크 테마 기반 글래스모피즘(Glassmorphism)
  - 직관적인 이모지 타이틀 및 인터랙티브 호버 애니메이션(Hover Glow & Translate) 적용

## 라우트 구조
| 경로 | 설명 |
|------|------|
| `/` | 메인 랜딩 페이지 |
| `/notice/teacher` | 알림장 - 교사용 (작성/AI정리/저장/삭제) |
| `/notice/parents` | 알림장 - 학부모용 (날짜별 조회) |
| `/teacher` | 상담 예약 - 교사용 (시간 설정/예약 관리) |
| `/parent` | 상담 예약 - 학부모용 (예약/조회/취소) |
| `/booking/[teacherId]` | 상담 예약 - 교사 링크 직접 접근 |
| `/check-reservation` | 상담 예약 조회 및 취소 |

## 완료된 작업
- [x] 깃허브 레포지토리 복제 (schoolalarm, counseling-reservation)
- [x] Next.js 기반 통합 프로젝트 구조 설정
- [x] 알림장(schoolalarm) 기능을 Vite→Next.js로 마이그레이션
  - [x] TeacherPage → `/notice/teacher` (TSX 변환)
  - [x] ParentPage → `/notice/parents` (TSX 변환)
  - [x] 서비스 파일 마이그레이션 (notice-firebase.ts, notice-ai.ts)
  - [x] 환경변수 VITE_ → NEXT_PUBLIC_ 전환 (기존 DB 구조 완벽 보존)
- [x] 상담예약(counseling-reservation) 기능 루트로 이동
- [x] 통합 메인 페이지 생성 (app/page.tsx)
- [x] package.json 통합 (모든 의존성 병합)
- [x] .env.local.example 통합 (Firebase + Upstage API 키)
- [x] 불필요한 원본 폴더 삭제 (schoolalarm/, counseling-reservation/)
- [x] UI/UX 개선
  - [x] 전역 기본 폰트를 Pretendard로 변경하여 가독성 개선
  - [x] 메인 페이지 설명 문구 줄바꿈 및 강조 텍스트 적용 ("학급에서 전하는 안내사항을")
  - [x] 메인 페이지 푸터 텍스트 변경 ("Powered by HooniKim")
  - [x] 버튼 호버 시 3D 상승 효과 및 테마별 네온 글로우 섀도우 추가
  - [x] 메인 기능 설명 아이콘을 직관적인 이모지(📋, 🗓️)로 교체 및 애니메이션 추가
  - [x] 파비콘(`icon.svg`)을 모던한 학사모 형태로 변경
- [x] 통합 프로젝트 깃허브 업로드 (HooniKims/schoolholic)
- [x] 알림장 AI를 Upstage Solar Mini → 로컬 LLM (Ollama) 으로 전환
  - [x] notice-ai.ts: OpenAI SDK → 브라우저 직접 fetch (api.alluser.site 프록시)
  - [x] 자동 재시도 로직, 텍스트 후처리, Sandwich 기법 적용
  - [x] 교사 페이지에 AI 모델 선택 드롭다운 UI 추가
  - [x] 환경변수 NEXT_PUBLIC_UPSTAGE_API_KEY → NEXT_PUBLIC_OLLAMA_API_KEY 변경

## 예정된 작업
- [ ] Vercel 배포
- [ ] 환경 변수 Vercel에 설정 (.env.local 내용 기반)
- [ ] 통합 테스트 (알림장 + 상담 예약 동시 기능 연동 확인)