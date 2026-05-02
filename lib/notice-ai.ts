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

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}]/u;
const QUESTION_MARK_NOISE_PATTERN = /(?:\?[\s?.!,:;]*){3,}/;

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

function extractRequiredNumberFacts(text: string): string[] {
    return Array.from(new Set(text.match(/\d+/g) ?? []));
}

function extractRequiredKoreanFacts(text: string): string[] {
    return Array.from(new Set(text.match(/[가-힣]{2,}/g) ?? []));
}

function preservesRequiredNumberFacts(sourceText: string, resultText: string): boolean {
    const requiredFacts = extractRequiredNumberFacts(sourceText);
    return requiredFacts.every((fact) => resultText.includes(fact));
}

function preservesRequiredKoreanFacts(sourceText: string, resultText: string): boolean {
    const requiredFacts = extractRequiredKoreanFacts(sourceText);
    if (!requiredFacts.length) {
        return true;
    }

    return requiredFacts.every((fact) => resultText.includes(fact));
}

function hasUnexpectedQuestionMarkNoise(sourceText: string, resultText: string): boolean {
    const sourceQuestionMarks = sourceText.match(/\?/g)?.length ?? 0;
    const resultQuestionMarks = resultText.match(/\?/g)?.length ?? 0;

    return resultQuestionMarks > sourceQuestionMarks + 2 || QUESTION_MARK_NOISE_PATTERN.test(resultText);
}

function isReliableNoticeResult(sourceText: string, resultText: string): boolean {
    return (
        preservesRequiredNumberFacts(sourceText, resultText) &&
        preservesRequiredKoreanFacts(sourceText, resultText) &&
        !hasUnexpectedQuestionMarkNoise(sourceText, resultText)
    );
}

function addFallbackEmoji(line: string): string {
    const trimmed = line.trim();
    if (!trimmed) {
        return "";
    }

    return EMOJI_PATTERN.test(trimmed.slice(0, 4)) ? trimmed : `📌 ${trimmed}`;
}

function buildFallbackNoticeText(sourceText: string, previousResult?: string): string {
    const koreanBody = sourceText
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map(addFallbackEmoji)
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const englishSection = previousResult?.split("\n---\n").slice(1).join("\n---\n").trim();

    if (englishSection && /[A-Za-z]/.test(englishSection) && !hasUnexpectedQuestionMarkNoise(sourceText, englishSection)) {
        return `${koreanBody}\n---\n${englishSection}`;
    }

    return koreanBody;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isRecoverableLocalLlmError(error: unknown): boolean {
    return /model\s+unloaded|model\s+not\s+found|server\s+오류\s*\(5\d\d\)|fetch\s+failed|network/i.test(getErrorMessage(error));
}

function buildOutputFormatInstruction(includeEnglishTranslation?: boolean): string[] {
    return includeEnglishTranslation
        ? [
            "응답에는 한국어 알림장 본문, --- 구분선, 영어 번역 본문만 포함해 주세요.",
            "학교에서 학부모에게 안내하는 톤의 영어 번역을 추가해서 다듬어줘. 형식은 한국어와 같게.",
            "한국어 본문 첫 줄 앞과 영어 번역 첫 줄 앞에 설명, 분석, 라벨을 붙이지 마세요.",
            "첫 글자는 반드시 알림장 본문 이모지 또는 원문 첫 단어로 시작해야 합니다.",
        ]
        : [
            "응답에는 학부모에게 보낼 알림장 본문만 포함해 주세요.",
            "본문 첫 줄 앞에 설명, 분석, 라벨을 붙이지 마세요.",
            "첫 글자는 반드시 알림장 본문 이모지 또는 원문 첫 단어로 시작해야 합니다.",
        ];
}

export async function summarizeNote(
    text: string,
    _dateObj: Date,
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
        "- 원문의 숫자, 날짜, 시간, 요일은 반드시 유지합니다.",
        "- 어색한 문장만 자연스럽게 고칩니다.",
        "- 문체를 차분하고 통일된 한국어로 맞춥니다.",
        "- 새 정보, 새 일정, 새 금액, 새 제출물은 절대 추가하지 않습니다.",
        "- 제목, 소제목, 마크다운 표기, 번호 목록을 새로 만들지 않습니다.",
        "- 각 문단이나 항목 첫머리에 과하지 않은 플랫 이모지를 붙입니다.",
        "- 설명, 분석, 라벨, 제목 없이 최종 알림장 본문만 출력합니다.",
    ].join("\n");

    const prompt = [
        "아래 원문을 일반 텍스트로 조금만 다듬어 주세요.",
        "원문 구조와 정보는 유지하고, 문장만 자연스럽게 고쳐 주세요.",
        "각 문단이나 항목 첫머리에 간단한 플랫 이모지를 붙여 주세요.",
        ...buildOutputFormatInstruction(options.includeEnglishTranslation),
        "",
        "[원문]",
        text,
    ].join("\n");

    async function generateReliableResult(modelId: string): Promise<string> {
        let rawResult = await generateWithRetry({
            systemMessage,
            prompt,
            model: modelId,
            temperature: 0.2,
        });

        let sanitizedResult = sanitizeNoticeContent(rawResult);

        if (!isReliableNoticeResult(text, sanitizedResult)) {
            const requiredFacts = extractRequiredNumberFacts(text);
            const requiredKoreanFacts = extractRequiredKoreanFacts(text);
            const repairPrompt = [
                "이전 출력에는 원문 정보 누락, 메타 설명, 또는 깨진 문자가 포함되었습니다.",
                requiredFacts.length ? `반드시 포함해야 하는 원문 숫자: ${requiredFacts.join(", ")}` : "",
                requiredKoreanFacts.length ? `반드시 포함해야 하는 원문 한국어 단어: ${requiredKoreanFacts.join(", ")}` : "",
                "새 정보나 작성 날짜를 추가하지 말고, 아래 원문의 정보만 유지해 다시 다듬어 주세요.",
                "원문의 한국어를 물음표나 깨진 문자로 바꾸지 마세요.",
                "설명, 분석, 라벨 없이 최종 본문만 출력하세요.",
                "각 문단이나 항목 첫머리에 간단한 플랫 이모지를 붙여 주세요.",
                ...buildOutputFormatInstruction(options.includeEnglishTranslation),
                "",
                "[원문]",
                text,
                "",
                "[이전 출력]",
                sanitizedResult,
            ].filter(Boolean).join("\n");

            rawResult = await generateWithRetry({
                systemMessage,
                prompt: repairPrompt,
                model: modelId,
                temperature: 0.1,
            });
            sanitizedResult = sanitizeNoticeContent(rawResult);
        }

        if (!isReliableNoticeResult(text, sanitizedResult)) {
            sanitizedResult = sanitizeNoticeContent(buildFallbackNoticeText(text, sanitizedResult));
        }

        return sanitizedResult;
    }

    const selectedModel = model || DEFAULT_MODEL;

    try {
        return await generateReliableResult(selectedModel);
    } catch (error) {
        if (selectedModel !== DEFAULT_MODEL && isRecoverableLocalLlmError(error)) {
            try {
                return await generateReliableResult(DEFAULT_MODEL);
            } catch (defaultModelError) {
                if (isRecoverableLocalLlmError(defaultModelError)) {
                    return sanitizeNoticeContent(buildFallbackNoticeText(text));
                }

                console.error("Local LLM default model fallback error:", defaultModelError);
                throw defaultModelError;
            }
        }

        if (isRecoverableLocalLlmError(error)) {
            return sanitizeNoticeContent(buildFallbackNoticeText(text));
        }

        console.error("Local LLM API Error:", error);
        throw error;
    }
}
