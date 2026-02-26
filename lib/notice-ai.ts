// ===== 로컬 LLM (Ollama) 설정 =====
const OLLAMA_API_URL = "https://api.alluser.site";
const OLLAMA_API_KEY = process.env.NEXT_PUBLIC_OLLAMA_API_KEY || "";

export const AVAILABLE_MODELS = [
    { id: "qwen3:8b", name: "Qwen 3 8B (추천)", description: "균형 잡힌 성능" },
    { id: "glm-4.7-flash", name: "GLM-4.7-Flash", description: "초경량 빠른 응답" },
    { id: "gemma3:12b-it-q8_0", name: "Gemma 3 12B Q8", description: "최고 품질 (13GB)" },
    { id: "gemma3:12b-it-q4_K_M", name: "Gemma 3 12B Q4", description: "고품질 (8GB)" },
    { id: "gemma3:4b-it-q4_K_M", name: "Gemma 3 4B", description: "경량 (3.3GB)" },
    { id: "qwen3:4b", name: "Qwen 3 4B", description: "경량 빠른 응답" },
    { id: "llama3.1:8b", name: "Llama 3.1 8B", description: "범용 모델" },
];

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;

// ===== 핵심 API 호출 함수 =====

/**
 * Ollama API 1회 호출 (OpenAI 호환 엔드포인트)
 * 브라우저에서 직접 api.alluser.site로 호출
 */
async function callOllamaAPI(
    systemMessage: string,
    userPrompt: string,
    model?: string,
    options: { temperature?: number; stream?: boolean } = {}
): Promise<string> {
    const { temperature = 0.7, stream = false } = options;

    const res = await fetch(`${OLLAMA_API_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": OLLAMA_API_KEY,
        },
        body: JSON.stringify({
            model: model || DEFAULT_MODEL,
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userPrompt },
            ],
            temperature,
            stream,
        }),
    });

    if (!res.ok) {
        let errorMessage = `서버 오류 (${res.status})`;
        try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
        } catch {
            // 무시
        }
        throw new Error(errorMessage);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

// ===== 텍스트 후처리 유틸 =====

/**
 * AI 출력에서 메타 정보(글자수, 분석 내용 등) 제거
 */
function cleanMetaInfo(text: string): string {
    if (!text) return text;

    // 괄호 안의 메타 정보: (약 500자), (글자수: 330) 등
    let cleaned = text.replace(/\s*\([^)]*\d+자[^)]*\)/g, '');
    cleaned = cleaned.replace(/\s*\([^)]*글자[^)]*\)/g, '');
    cleaned = cleaned.replace(/\s*\([^)]*자세한[^)]*\)/g, '');
    cleaned = cleaned.replace(/\s*\([^)]*내용\s*포함[^)]*\)/g, '');

    // 끝부분: "--- 330자" 또는 "[330자]"
    cleaned = cleaned.replace(/\s*[-─]+\s*\d+자\s*$/g, '');
    cleaned = cleaned.replace(/\s*\[\d+자\]\s*$/g, '');
    cleaned = cleaned.replace(/\s*\d+자\s*$/g, '');

    // 분석/검증 관련 문구 제거
    cleaned = cleaned.replace(/\s*\[분석[^\]]*\]/g, '');
    cleaned = cleaned.replace(/\s*\[검증[^\]]*\]/g, '');

    return cleaned.trim();
}

/**
 * 텍스트가 완전한 한국어 문장으로 끝나는지 확인
 */
function endsWithCompleteSentence(text: string): boolean {
    if (!text || !text.trim()) return false;
    const trimmed = text.trim();
    return /[함음임됨봄옴줌춤움늠름다요까니][.!?]\s*$/.test(trimmed);
}

// ===== 고수준 API 함수 =====

/**
 * Sandwich 기법 적용 — 추가 지침을 시스템/사용자 프롬프트 앞뒤에 삽입
 */
async function generateWithInstructions({
    systemMessage,
    prompt,
    additionalInstructions,
    model,
}: {
    systemMessage: string;
    prompt: string;
    additionalInstructions?: string;
    model?: string;
}): Promise<string> {
    // 추가 지침 → 시스템 메시지에 추가
    let finalSystemMessage = systemMessage;
    if (additionalInstructions) {
        finalSystemMessage += `\n\n사용자 추가 규칙 (최우선 준수):\n${additionalInstructions}`;
    }

    // 추가 지침 → 사용자 프롬프트 앞뒤에 감싸기 (Sandwich 기법)
    let finalPrompt = prompt;
    if (additionalInstructions && additionalInstructions.trim()) {
        const prefix = `[최우선 규칙] 다음 규칙을 반드시 지켜서 작성하라: ${additionalInstructions}\n\n`;
        const suffix = `\n\n[다시 한번 강조] 위 본문 작성 시 반드시 적용할 규칙: ${additionalInstructions}`;
        finalPrompt = prefix + prompt + suffix;
    }

    return callOllamaAPI(finalSystemMessage, finalPrompt, model);
}

/**
 * 자동 재시도 포함 API 호출
 * 문장이 불완전하게 끝나면 최대 2회 재시도
 */
async function generateWithRetry(params: {
    systemMessage: string;
    prompt: string;
    additionalInstructions?: string;
    model?: string;
}): Promise<string> {
    let content = await generateWithInstructions(params);

    if (!content.trim()) {
        throw new Error("AI 응답이 비어있습니다.");
    }

    const MAX_RETRIES = 2;
    for (let retry = 0; retry < MAX_RETRIES; retry++) {
        if (endsWithCompleteSentence(content)) break;

        console.log(`[재시도 ${retry + 1}/${MAX_RETRIES}] 문장 불완전: "...${content.slice(-30)}"`);

        const retryPrompt = `다음 텍스트는 문장이 중간에 끊겼습니다. 같은 내용을 완전한 문장으로 끝나도록 다시 작성하세요. 반드시 종결어미와 마침표로 끝내세요. 오직 본문만 출력하세요.\n\n불완전한 텍스트:\n${content}`;

        const retryContent = await callOllamaAPI(params.systemMessage, retryPrompt, params.model);

        if (retryContent.trim() && endsWithCompleteSentence(retryContent)) {
            content = retryContent;
            console.log(`[재시도 성공] 완전한 문장으로 수정됨`);
            break;
        } else if (retryContent.trim()) {
            content = retryContent;
        }
    }

    return content;
}

// ===== 알림장 요약 메인 함수 =====

/**
 * 교사의 알림장 메모를 AI로 정리하는 메인 함수
 * 
 * @param text - 교사가 작성한 메모 원문
 * @param dateObj - 알림장 날짜
 * @param model - 사용할 모델 (선택, 기본값: DEFAULT_MODEL)
 * @returns 정리된 알림장 텍스트
 */
export async function summarizeNote(
    text: string,
    dateObj: Date,
    model?: string
): Promise<string> {
    if (!text) return "";

    if (!OLLAMA_API_KEY) {
        throw new Error(
            "Ollama API 키가 설정되지 않았습니다. .env.local 파일에서 NEXT_PUBLIC_OLLAMA_API_KEY를 설정해주세요."
        );
    }

    // 날짜 포맷팅
    const d = new Date(dateObj);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const formattedDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;

    const systemMessage = `당신은 초등학교 담임선생님의 알림장 작성을 돕는 전문 비서입니다.
교사의 메모를 학부모와 학생 모두가 읽기 편한 알림장으로 정리합니다.

<문체 규칙>
- 친절하고 편안한 존댓말을 사용합니다 (~해요, ~합니다, ~드려요, ~주세요)
- 딱딱한 공문체를 사용하지 않습니다
- 학부모와 학생 모두에게 말하듯 따뜻하게 작성합니다
</문체 규칙>

<서식 규칙>
- 마크다운 서식을 적극 활용합니다
- 중요한 날짜, 시간, 장소, 준비물은 반드시 **굵게** 표시합니다
- 각 카테고리 아래에 불릿(-)을 사용하여 항목을 나열합니다
- 오직 정리된 알림장 본문만 출력합니다 (메타 정보, 글자수, 분석 내용은 출력하지 않습니다)
</서식 규칙>`;

    const prompt = `교사가 작성한 메모를 아래 형식에 맞춰 알림장으로 정리해주세요.

<출력 형식>
# ${formattedDate} 알림장 📋

## 카테고리 이모지 카테고리명
- 불릿으로 항목 나열
- **중요 정보**는 굵게 표시
</출력 형식>

<카테고리 목록 (해당 내용이 있는 카테고리만 사용)>
📚 학습 안내 — 수업, 시험, 숙제, 학습 관련
📦 준비물 — 가져올 것, 챙길 것
📅 일정 안내 — 행사, 체험학습, 특별 일정
🍽️ 급식/간식 — 급식, 간식, 식단 관련
👕 복장/생활 — 복장, 생활 지도, 규칙
💰 납부/제출 — 돈, 서류 제출 관련
📢 기타 안내 — 위 카테고리에 해당하지 않는 사항
</카테고리 목록>

<좋은 예시>
# 2026년 3월 5일(수) 알림장 📋

## 📚 학습 안내
- 내일 **수학 단원평가**가 있어요. 3단원까지 꼭 복습해 주세요!
- 독서록은 **금요일까지** 제출해 주세요.

## 📦 준비물
- **미술 도구** (크레파스, 스케치북)를 꼭 챙겨 주세요.
- 체육복은 **화요일, 목요일**에 입고 와주세요.

## 📅 일정 안내
- **3월 10일(월)** 봄 현장체험학습이 예정되어 있어요.
- 장소: **서울숲**, 준비물: 도시락, 돗자리
</좋은 예시>

<작성 시 주의>
- 첫 줄은 반드시 "# ${formattedDate} 알림장 📋"으로 시작합니다
- "학부모님께", "안녕하세요" 같은 인사말은 넣지 않습니다
- 내용이 1~2개뿐이라면 카테고리 1~2개만 사용해도 됩니다
- 원본 메모에 없는 내용을 임의로 추가하지 않습니다
</작성 시 주의>

**교사 메모 원문:**
${text}`;

    try {
        const rawResult = await generateWithRetry({
            systemMessage,
            prompt,
            model: model || DEFAULT_MODEL,
        });

        // 후처리: 메타 정보 제거
        const processed = cleanMetaInfo(rawResult);

        return processed;
    } catch (error) {
        console.error("Local LLM API Error:", error);
        throw error;
    }
}
