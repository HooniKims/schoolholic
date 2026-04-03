# Notice AI Plain Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 알림장 AI를 텍스트 다듬기 전용으로 전환하고, 신규 결과를 일반 텍스트로 표시하며, 모바일 입력창 스크롤 전파를 막는다.

**Architecture:** `lib/notice-ai.ts`의 모델 목록과 프롬프트를 단순화해 "다듬기" 전용 파이프라인으로 바꾼다. 교사/학부모 알림장 화면은 공통 일반 텍스트 표시 컴포넌트를 공유하고, `TouchScrollableTextarea`는 경계 스크롤 체인을 차단하도록 터치 처리 로직을 보강한다.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, date-fns, Firebase, fetch-based local LLM proxy

---

### Task 1: Refactor Notice AI Core

**Files:**
- Modify: `lib/notice-ai.ts`

- [ ] **Step 1: Replace the model list and default model**

```ts
export const AVAILABLE_MODELS = [
  {
    id: "gemma4:E2B",
    name: "Gemma 4 E2B",
    description: "응답속도: 기본보다 빠름 · 품질: 기본보다 낮음",
  },
  {
    id: "gemma4:E4B",
    name: "Gemma 4 E4B (기본)",
    description: "응답속도: 기준 · 품질: 기준",
  },
  {
    id: "gemma3:4b-it-q4_K_M",
    name: "Gemma 3 4B",
    description: "응답속도: 기본보다 빠름 · 품질: 기본보다 낮음",
  },
  {
    id: "qwen3:4b",
    name: "Qwen 3 4B",
    description: "응답속도: 기본보다 빠름 · 품질: 기본보다 낮음",
  },
  {
    id: "qwen3:8b",
    name: "Qwen 3 8B",
    description: "응답속도: 기본보다 약간 느림 · 품질: 기본과 비슷함",
  },
  {
    id: "gemma3:12b-it-q8_0",
    name: "Gemma 3 12B Q8",
    description: "응답속도: 기본보다 느림 · 품질: 기본보다 높음",
  },
];

export const DEFAULT_MODEL = "gemma4:E4B";
```

- [ ] **Step 2: Delete the markdown/category normalization pipeline**

Remove or bypass helpers tied to markdown generation:

```ts
// delete
type NoticeCategoryKey = ...
const NOTICE_CATEGORIES = ...
function parseNoticeItems(...) { ... }
function classifyNoticeItem(...) { ... }
function normalizeNoticeSummary(...) { ... }
```

Replace with a narrow text-only cleaner:

```ts
function cleanAssistantText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^\s*(제목|요약|정리 결과)\s*:\s*/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
```

- [ ] **Step 3: Rewrite the system and user prompts for light editing only**

```ts
const systemMessage = `
당신은 초등학교 알림장 문장을 다듬는 보조자입니다.
역할은 "새로 쓰기"가 아니라 "조금 다듬기"입니다.

규칙:
- 사용자가 쓴 정보, 순서, 줄바꿈을 유지합니다.
- 어색한 문장만 자연스럽게 고칩니다.
- 문체를 차분하고 통일된 한국어로 맞춥니다.
- 각 문단이나 항목 첫머리에 과하지 않은 플랫 이모지를 붙여도 됩니다.
- 새 정보, 새 일정, 새 금액, 새 제출물은 절대 추가하지 않습니다.
- 마크다운 제목, 섹션, 표, 번호 목록을 새로 만들지 않습니다.
- 결과는 일반 텍스트만 출력합니다.
`.trim();

const prompt = `
아래 원문을 일반 텍스트로 조금만 다듬어 주세요.
원문 구조와 정보는 유지하고, 문장만 자연스럽게 고쳐 주세요.

[원문]
${text}
`.trim();
```

- [ ] **Step 4: Return plain text instead of normalized markdown**

```ts
const rawResult = await generateWithRetry({
  systemMessage,
  prompt,
  model: model || DEFAULT_MODEL,
  temperature: 0.2,
});

return cleanAssistantText(cleanMetaInfo(rawResult));
```

- [ ] **Step 5: Verify the file still type-checks through lint**

Run: `npm run lint -- lib/notice-ai.ts`

Expected: ESLint exits with code `0` or reports that no matching files were linted by the narrowed path. If the narrowed lint command is unsupported, defer to the full repo lint in Task 4.

- [ ] **Step 6: Commit**

```bash
git add lib/notice-ai.ts
git commit -m "refactor: switch notice ai to plain text polishing"
```

### Task 2: Update Teacher Notice UI Copy and Rendering Flow

**Files:**
- Modify: `app/notice/teacher/page.tsx`
- Modify: `lib/i18n.ts`

- [ ] **Step 1: Update Korean and English UI strings from summarize to polish**

```ts
ko: {
  aiResult: "AI 다듬기 결과",
  preview: "보기",
  editDirectly: "직접 수정",
  aiPlaceholder: "AI가 다듬은 내용이 여기에 표시됩니다. 필요하면 바로 수정하세요.",
  summarizing: "다듬는 중...",
  aiSummarize: "AI로 다듬기",
  aiProcessing: "AI가 내용을 다듬는 중입니다...",
  aiCompleted: "다듬기가 완료되었습니다. 내용을 확인하고 저장하세요.",
}
```

```ts
en: {
  aiResult: "AI Polished Result",
  preview: "View",
  editDirectly: "Edit",
  aiPlaceholder: "AI-polished text will appear here. Edit it if needed.",
  summarizing: "Polishing...",
  aiSummarize: "Polish with AI",
  aiProcessing: "AI is polishing the text...",
  aiCompleted: "Polishing is complete. Review and save.",
}
```

- [ ] **Step 2: Replace markdown preview with plain text preview**

Update the teacher page import:

```ts
import { NoticePlainText } from '@/components/NoticePlainText';
```

Replace the preview block:

```tsx
<div className="p-4 bg-gray-50 rounded-xl border border-gray-200 min-h-[200px]">
  <NoticePlainText content={summary} />
</div>
```

- [ ] **Step 3: Keep direct edit mode but keep textarea behavior unchanged**

```tsx
<TouchScrollableTextarea
  className="w-full min-h-[200px] p-4 border border-gray-200 rounded-xl bg-gray-50 font-sans text-base resize-y focus:ring-2 focus:ring-emerald-500 focus:border-transparent [transform:translateZ(0)]"
  value={summary}
  onChange={(e) => setSummary(e.target.value)}
  placeholder={t('aiPlaceholder')}
/>
```

- [ ] **Step 4: Verify lint for the touched UI files**

Run: `npm run lint -- app/notice/teacher/page.tsx lib/i18n.ts`

Expected: exit code `0`, or fall back to full repo lint if the narrowed command is unsupported.

- [ ] **Step 5: Commit**

```bash
git add app/notice/teacher/page.tsx lib/i18n.ts
git commit -m "feat: update teacher notice ui for plain text ai polishing"
```

### Task 3: Add Shared Plain Text Notice Renderer and Switch Parent View

**Files:**
- Create: `components/NoticePlainText.tsx`
- Modify: `app/notice/parents/page.tsx`
- Modify: `app/notice/teacher/page.tsx`

- [ ] **Step 1: Create a shared plain text renderer**

```tsx
type NoticePlainTextProps = {
  content: string;
  className?: string;
};

export function NoticePlainText({ content, className }: NoticePlainTextProps) {
  return (
    <div
      className={[
        "whitespace-pre-wrap break-words text-[15px] leading-7 text-gray-800",
        className,
      ].filter(Boolean).join(" ")}
    >
      {content}
    </div>
  );
}
```

- [ ] **Step 2: Switch the parent page to the shared renderer**

```tsx
import { NoticePlainText } from '@/components/NoticePlainText';
```

```tsx
{summary ? (
  <div className="max-w-none">
    <NoticePlainText content={summary} />
  </div>
) : (
  ...
)}
```

- [ ] **Step 3: Remove the markdown renderer dependency from notice pages**

Delete these imports from notice pages:

```ts
import { NoticeMarkdown } from '@/components/NoticeMarkdown';
```

Keep `components/NoticeMarkdown.tsx` in the repo unless it becomes unused elsewhere. If it is unused after the switch, delete it in the same task.

- [ ] **Step 4: Verify imports and dead code through lint**

Run: `npm run lint -- app/notice/teacher/page.tsx app/notice/parents/page.tsx components/NoticePlainText.tsx`

Expected: exit code `0`, or use the full repo lint in Task 4 if the narrowed command is unsupported.

- [ ] **Step 5: Commit**

```bash
git add app/notice/teacher/page.tsx app/notice/parents/page.tsx components/NoticePlainText.tsx components/NoticeMarkdown.tsx
git commit -m "refactor: render notice content as plain text"
```

### Task 4: Harden Mobile Textarea Scroll Containment and Run Full Verification

**Files:**
- Modify: `components/TouchScrollableTextarea.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Rewrite touch handling to block page scroll chaining at boundaries**

Use a direction-aware handler:

```ts
const touchStateRef = useRef({
  startY: 0,
  lastY: 0,
  startScrollTop: 0,
});

const handleTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0];
  touchStateRef.current.startY = touch.clientY;
  touchStateRef.current.lastY = touch.clientY;
  touchStateRef.current.startScrollTop = element.scrollTop;
};

const handleTouchMove = (event: TouchEvent) => {
  if (event.touches.length !== 1) return;
  if (element.scrollHeight <= element.clientHeight) return;

  const currentY = event.touches[0].clientY;
  const deltaFromStart = touchStateRef.current.startY - currentY;
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  const nextScrollTop = Math.min(Math.max(touchStateRef.current.startScrollTop + deltaFromStart, 0), maxScrollTop);

  if (nextScrollTop !== element.scrollTop) {
    element.scrollTop = nextScrollTop;
  }

  event.preventDefault();
  touchStateRef.current.lastY = currentY;
};
```

- [ ] **Step 2: Tighten textarea styles to prefer internal scrolling**

```ts
const scrollStyle: CSSProperties = {
  ...style,
  overflowY: 'auto',
  overscrollBehaviorY: 'contain',
  WebkitOverflowScrolling: 'touch',
  touchAction: 'pan-y',
};
```

If the global rule is still needed, keep it minimal:

```css
textarea {
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}
```

- [ ] **Step 3: Run full repo verification**

Run: `npm run lint`

Expected: exit code `0`

- [ ] **Step 4: Manual verification checklist**

Check all of these in the browser:

```text
1. /notice/teacher 에서 기본 모델이 gemma4:E4B로 선택된다.
2. 모델 목록에서 llama3.1:8b, gemma3:12b-it-q4_K_M 가 보이지 않는다.
3. AI 결과가 마크다운 섹션 없이 일반 텍스트로 표시된다.
4. AI 결과를 직접 수정하면 줄바꿈과 들여쓰기가 그대로 유지된다.
5. /notice/parents 에서 신규 저장 결과가 일반 텍스트로 보인다.
6. 모바일에서 입력창을 길게 작성한 뒤 위아래로 스와이프해도 페이지 전체가 같이 움직이지 않는다.
```

- [ ] **Step 5: Commit**

```bash
git add components/TouchScrollableTextarea.tsx app/globals.css
git commit -m "fix: contain mobile notice textarea scrolling"
```
