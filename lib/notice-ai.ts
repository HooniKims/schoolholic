// ===== 로컬 LLM (Ollama) 설정 =====
const OLLAMA_API_URL = "https://api.alluser.site";
const OLLAMA_API_KEY = process.env.NEXT_PUBLIC_OLLAMA_API_KEY || "";

export const AVAILABLE_MODELS = [
    {
        id: "gemma4:E2B",
        name: "Gemma 4 E2B",
        description: "응답속도: 기본보다 빠름 · 품질: 기본보다 낮음",
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
        id: "gemma4:E4B",
        name: "Gemma 4 E4B (기본)",
        description: "응답속도: 기준 · 품질: 기준",
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
] as const;

export const DEFAULT_MODEL = "gemma4:E4B";

async function callOllamaAPI(
    systemMessage: string,
    userPrompt: string,
    model?: string,
    options: { temperature?: number; stream?: boolean } = {}
): Promise<string> {
    const { temperature = 0.2, stream = false } = options;

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
            // ignore malformed error body
        }
        throw new Error(errorMessage);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

function cleanMetaInfo(text: string): string {
    if (!text) {
        return text;
    }

    let cleaned = text.replace(/\r\n/g, "\n");
    cleaned = cleaned.replace(/^\s*(다듬은 내용|수정본|정리 결과)\s*:\s*/i, "");
    cleaned = cleaned.replace(/\s*\([^)]*(글자|문체|검토|수정|다듬기)[^)]*\)\s*/gi, " ");
    cleaned = cleaned.replace(/\s*\[(분석|검토|검증)[^\]]*\]\s*/gi, " ");
    cleaned = cleaned.replace(/^\s*#{1,6}\s+/gm, "");
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
    cleaned = cleaned.replace(/__(.*?)__/g, "$1");
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

    return cleaned.trim();
}

function endsWithCompleteSentence(text: string): boolean {
    if (!text || !text.trim()) {
        return false;
    }

    const trimmed = text.trim();
    if (trimmed.includes("\n")) {
        return true;
    }

    return /[.!?…]$/.test(trimmed) || /[함음임됨봄옴줌춤움늠름다요까니죠]$/.test(trimmed);
}

async function generateWithRetry(params: {
    systemMessage: string;
    prompt: string;
    model?: string;
    temperature?: number;
}): Promise<string> {
    let content = await callOllamaAPI(
        params.systemMessage,
        params.prompt,
        params.model,
        { temperature: params.temperature }
    );

    if (!content.trim()) {
        throw new Error("AI 응답이 비어있습니다.");
    }

    const maxRetries = 2;
    for (let retry = 0; retry < maxRetries; retry += 1) {
        if (endsWithCompleteSentence(content)) {
            break;
        }

        const retryPrompt = [
            "방금 출력한 내용을 같은 의미 그대로 다시 마무리해 주세요.",
            "새 정보를 추가하지 말고, 일반 텍스트만 출력해 주세요.",
            "",
            "[이전 출력]",
            content,
        ].join("\n");

        const retryContent = await callOllamaAPI(
            params.systemMessage,
            retryPrompt,
            params.model,
            { temperature: params.temperature }
        );

        if (retryContent.trim()) {
            content = retryContent;
        }
    }

    return content;
}

function formatNoticeDate(dateObj: Date): string {
    const d = new Date(dateObj);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export async function summarizeNote(
    text: string,
    dateObj: Date,
    model?: string
): Promise<string> {
    if (!text) {
        return "";
    }

    if (!OLLAMA_API_KEY) {
        throw new Error(
            "Ollama API 키가 설정되지 않았습니다. .env.local 파일에서 NEXT_PUBLIC_OLLAMA_API_KEY를 설정해주세요."
        );
    }

    const systemMessage = [
        "당신은 초등학교 알림장 문장을 다듬는 보조자입니다.",
        '역할은 "새로 쓰기"가 아니라 "조금 다듬기"입니다.',
        "",
        "규칙:",
        "- 사용자가 쓴 정보, 순서, 줄바꿈, 들여쓰기를 최대한 유지합니다.",
        "- 어색한 문장만 자연스럽게 고칩니다.",
        "- 문체를 차분하고 통일된 한국어로 맞춥니다.",
        "- 각 문단이나 항목 첫머리에 과하지 않은 플랫 이모지를 붙여도 됩니다.",
        "- 새 정보, 새 일정, 새 금액, 새 제출물은 절대 추가하지 않습니다.",
        "- 제목, 소제목, 마크다운 표기, 번호 목록을 새로 만들지 않습니다.",
        "- 결과는 일반 텍스트만 출력합니다.",
    ].join("\n");

    const prompt = [
        "아래 원문을 일반 텍스트로 조금만 다듬어 주세요.",
        "원문 구조와 정보는 유지하고, 문장만 자연스럽게 고쳐 주세요.",
        "필요하면 줄 첫머리에 간단한 플랫 이모지를 붙여도 됩니다.",
        `작성 날짜 참고: ${formatNoticeDate(dateObj)}`,
        "",
        "[원문]",
        text,
    ].join("\n");

    try {
        const rawResult = await generateWithRetry({
            systemMessage,
            prompt,
            model: model || DEFAULT_MODEL,
            temperature: 0.2,
        });

        return cleanMetaInfo(rawResult);
    } catch (error) {
        console.error("Local LLM API Error:", error);
        throw error;
    }
}
