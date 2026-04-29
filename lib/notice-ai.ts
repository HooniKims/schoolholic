import {
    AVAILABLE_MODELS,
    DEFAULT_MODEL,
    LOCAL_LLM_CHAT_COMPLETIONS_ENDPOINT,
    buildChatCompletionBody,
    getLocalLlmApiKey,
    getModelOptionLabel,
} from "./local-llm";
import { sanitizeNoticeContent } from "./notice-content";

export { AVAILABLE_MODELS, DEFAULT_MODEL, getModelOptionLabel };

type SummarizeNoteOptions = {
    includeEnglishTranslation?: boolean;
};

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
    model?: string,
    options: SummarizeNoteOptions = {}
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
        "- 새 정보, 새 일정, 새 금액, 새 제출물은 절대 추가하지 않습니다.",
        "- 제목, 소제목, 마크다운 표기, 번호 목록을 새로 만들지 않습니다.",
        "- 각 문단이나 항목 첫머리에 과하지 않은 플랫 이모지를 붙입니다.",
        "- 첫 글자부터 최종 알림장 문구로 시작합니다.",
        "- 결과는 일반 텍스트만 출력합니다.",
        "- 응답에는 학부모에게 보낼 최종 알림장 본문만 포함합니다.",
        "- 작업 설명은 포함하지 않습니다.",
        "- Thinking Process, Analyze the Request, Refine, Final Formatting Check, Construct Final Output, Role, Goal, Output Requirement, Context, Date Reference 같은 분석/리파인/포맷 설명을 절대 출력하지 않습니다.",
    ].join("\n");

    const prompt = [
        "아래 원문을 일반 텍스트로 조금만 다듬어 주세요.",
        "원문 구조와 정보는 유지하고, 문장만 자연스럽게 고쳐 주세요.",
        "각 문단이나 항목 첫머리에 간단한 플랫 이모지를 붙여 주세요.",
        ...(options.includeEnglishTranslation
            ? [
                "응답에는 한국어 알림장 본문, --- 구분선, 영어 번역 본문만 포함해 주세요.",
                "학교에서 학부모에게 안내하는 톤의 영어 번역을 추가해서 다듬어줘. 형식은 한국어와 같게.",
                "한국어 본문 첫 줄 앞과 영어 번역 첫 줄 앞에 설명, 분석, 라벨을 붙이지 마세요.",
            ]
            : [
                "응답에는 학부모에게 보낼 알림장 본문만 포함해 주세요.",
                "본문 첫 줄 앞에 설명, 분석, 라벨을 붙이지 마세요.",
            ]),
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

        return sanitizeNoticeContent(rawResult);
    } catch (error) {
        console.error("Local LLM API Error:", error);
        throw error;
    }
}
