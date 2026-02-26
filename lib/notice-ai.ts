// ===== 로컬 LLM (Ollama) 설정 =====
const OLLAMA_API_URL = "https://api.alluser.site";
const OLLAMA_API_KEY = process.env.NEXT_PUBLIC_OLLAMA_API_KEY || "";

// ===== 사용 가능한 모델 목록 =====
export const AVAILABLE_MODELS = [
    { id: "qwen3:8b", name: "Qwen 3 8B (추천)", description: "균형 잡힌 성능" },
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

    const systemMessage = "당신은 교사의 알림장 작성을 돕는 유능한 비서입니다. 입력받은 메모를 가독성 좋은 알림장 형식으로 정리합니다.";

    const prompt = `다음은 교사가 작성한 알림장 메모입니다. 이를 **학생과 학부모(보호자)** 모두가 보기 편하도록 정리해주세요.

**작성 규칙:**
1. **헤더 필수**: 맨 첫 줄은 반드시 "# ${formattedDate} 전달사항"으로 시작하세요.
2. **인사말 생략**: "학부모님께", "안녕하세요" 같은 인사말이나 수신자 호칭은 **절대 넣지 마세요**.
3. **핵심 내용만**: 바로 본론으로 들어가서 전달 사항을 명확하게 작성하세요.
4. **가독성**: 
   - 중요한 정보는 **굵게** 표시하세요.
   - 항목이 여러 개면 목록(Bullet points)으로 정리하세요.
   - 준비물, 시간, 장소 등은 눈에 띄게 구분하세요.

**메모 내용:**
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
