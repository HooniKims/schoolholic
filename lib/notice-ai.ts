import {
    AVAILABLE_MODELS,
    DEFAULT_MODEL,
    LOCAL_LLM_CHAT_COMPLETIONS_ENDPOINT,
    buildChatCompletionBody,
    getLocalLlmApiKey,
    getModelOptionLabel,
} from "./local-llm";

export { AVAILABLE_MODELS, DEFAULT_MODEL, getModelOptionLabel };

async function callLocalLlmAPI(
    systemMessage: string,
    userPrompt: string,
    model?: string,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
    const apiKey = getLocalLlmApiKey();
    const { temperature = 0.2, maxTokens } = options;

    const res = await fetch(LOCAL_LLM_CHAT_COMPLETIONS_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
        },
        body: JSON.stringify(buildChatCompletionBody({
            systemMessage,
            userPrompt,
            modelId: model || DEFAULT_MODEL,
            temperature,
            maxTokens,
        })),
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
    let content = await callLocalLlmAPI(
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

        const retryContent = await callLocalLlmAPI(
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

    if (!getLocalLlmApiKey()) {
        throw new Error(
            "로컬 LLM API 키가 설정되지 않았습니다. .env.local 파일에서 NEXT_PUBLIC_LOCAL_LLM_API_KEY를 설정해주세요."
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
