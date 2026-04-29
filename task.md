# 작업 요약

## 요청

- OpenAI를 사용하지 않고 알림장 AI 생성 기능을 로컬 LLM 전용 구조로 정리한다.
- 모델 목록은 Gemma 4 계열 3개만 남기고 기본값은 `gemma4:e2b`로 고정한다.
- 모든 요청은 `https://lm.alluser.site/v1/chat/completions`로 보낸다.
- 관련 테스트를 추가하고 검증한다.

## 변경 사항

- `lib/local-llm.ts`를 추가해 모델 목록, 기본 모델, 드롭다운 라벨, 실제 요청 모델 매핑, 요청 body, max_tokens 규칙을 공통화했다.
- `lib/notice-ai.ts`는 새 로컬 LLM 유틸을 사용하도록 정리했다.
- `/notice/teacher` 모델 드롭다운은 공통 라벨 함수로 표시하도록 연결했다.
- 불필요한 외부 AI 패키지 의존성을 제거했다.
- `tests/local-llm.test.js`를 추가해 모델 목록, endpoint, model 매핑, 기본값, max_tokens 하한을 검증한다.
- `.env.local.example`은 `NEXT_PUBLIC_LOCAL_LLM_API_KEY` 기준으로 정리했다.

## 현재 로컬 LLM 기준

- 기본 모델: `gemma4:e2b`
- endpoint: `https://lm.alluser.site/v1/chat/completions`
- 인증 헤더: `X-API-Key`
- 환경변수: `NEXT_PUBLIC_LOCAL_LLM_API_KEY`

## 모델 매핑

| 표시 ID | 표시 이름 | 실제 요청 model |
|---|---|---|
| `gemma4:e4b` | Gemma 4 E4B | `google/gemma-4-e4b` |
| `gemma4:e2b` | Gemma 4 E2B | `google/gemma-4-e2b` |
| `lmstudio:gemma-4-26b-a4b-it-q4ks` | Gemma 4 26B Q4 | `gemma-4-26b-a4b-it` |

## 검증 완료

- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- 운영 코드 문자열 검색

참고: `npm run build`는 성공했으며, 기존과 같은 `baseline-browser-mapping` 데이터 갱신 안내만 출력되었다.
