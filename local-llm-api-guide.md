# 로컬 LLM API 연동 가이드

이 프로젝트의 알림장 AI 다듬기 기능은 OpenAI 없이 `https://lm.alluser.site` 기반 로컬 LM Studio 엔드포인트만 사용한다.

## 엔드포인트

| 항목 | 값 |
|---|---|
| base URL | `https://lm.alluser.site` |
| chat completions endpoint | `https://lm.alluser.site/v1/chat/completions` |
| 인증 헤더 | `X-API-Key` |
| 환경변수 | `NEXT_PUBLIC_LOCAL_LLM_API_KEY` |

## 사용 모델

| 표시 ID | 표시 이름 | 설명 | 실제 요청 model | max_tokens |
|---|---|---|---|---|
| `gemma4:e4b` | Gemma 4 E4B | 기준 속도기준 품질 | `google/gemma-4-e4b` | 최소 3072 |
| `gemma4:e2b` | Gemma 4 E2B | 기본 모델, 기본보다 빠름, 품질은 간단 | `google/gemma-4-e2b` | 기존 계산값 사용 |
| `lmstudio:gemma-4-26b-a4b-it-q4ks` | Gemma 4 26B Q4 | 느리지만 품질 높음 | `gemma-4-26b-a4b-it` | 최소 4096 |

기본 선택 모델은 `gemma4:e2b`이다.

## 요청 형식

```ts
await fetch("https://lm.alluser.site/v1/chat/completions", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NEXT_PUBLIC_LOCAL_LLM_API_KEY || "",
    },
    body: JSON.stringify({
        model: "google/gemma-4-e2b",
        messages: [
            { role: "system", content: "시스템 지시문" },
            { role: "user", content: "사용자 프롬프트" },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        reasoning_effort: "none",
        stream: false,
    }),
});
```

## 프로젝트 구현 위치

- 공통 모델/엔드포인트/요청 body: `lib/local-llm.ts`
- 알림장 AI 다듬기 호출: `lib/notice-ai.ts`
- 교사용 모델 선택 UI: `app/notice/teacher/page.tsx`
- 모델 매핑 테스트: `tests/local-llm.test.mjs`

## 검증 명령

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## 문자열 검증

운영 코드 범위(`app`, `components`, `lib`, `package.json`, `package-lock.json`)에 이전 외부 AI 호출 주소, 이전 프록시 주소, 구형 모델명이 남지 않았는지 확인한다.
