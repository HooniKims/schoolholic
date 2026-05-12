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
    const withoutListMarkers = text.replace(/^\s*\d+[.)]\s*/gm, "");
    return Array.from(new Set(withoutListMarkers.match(/\d+/g) ?? []));
}

function extractRequiredKoreanFacts(text: string): string[] {
    return Array.from(new Set(text.match(/[가-힣]{2,}/g) ?? []));
}

function normalizeKoreanFact(fact: string): string {
    return fact
        .replace(/서로간/g, "서로")
        .replace(/(했습니다|하였습니다|드립니다|부탁드립니다|입니다|합니다|습니다|였습니다|되도록|하도록|있도록|않도록)$/g, "")
        .replace(/(에게|에서|에도|와|과|을|를|은|는|이|가|의)$/g, "");
}

function countPreservedKoreanFacts(facts: string[], resultText: string): number {
    return facts.filter((fact) => {
        if (resultText.includes(fact)) {
            return true;
        }

        const normalizedFact = normalizeKoreanFact(fact);
        return normalizedFact.length >= 2 && resultText.includes(normalizedFact);
    }).length;
}

function extractSourceItems(text: string): string[] {
    return text
        .replace(/\r\n/g, "\n")
        .split(/\n+/)
        .map(stripLeadingListMarker)
        .filter((line) => line.length >= 4);
}

function normalizeForCopyCheck(text: string): string {
    return text
        .replace(EMOJI_PATTERN, "")
        .replace(/^[\s\-*>\d.)]+/gm, "")
        .replace(/[ \t]+/g, " ")
        .trim();
}

function extractSourceFragments(text: string): string[] {
    return text
        .replace(/\r\n/g, "\n")
        .split(/[\n.!?。！？]+/)
        .map((fragment) => normalizeForCopyCheck(fragment))
        .filter((fragment) => fragment.length >= 4);
}

function isTooCloseToSource(sourceText: string, resultText: string): boolean {
    const fragments = extractSourceFragments(sourceText);
    if (!fragments.length) {
        return false;
    }

    const normalizedResult = normalizeForCopyCheck(resultText);
    return fragments.every((fragment) => normalizedResult.includes(fragment));
}

function stripLeadingListMarker(line: string): string {
    return line.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").trim();
}

function selectNoticeEmoji(line: string): string {
    if (/친구|외모|비하|존중|배려/.test(line)) {
        return "🤝";
    }
    if (/킥보드|자전거|원동기|안전|보호구|면허/.test(line)) {
        return "🛴";
    }
    if (/숙제|과제|익힘|문제|교과서/.test(line)) {
        return "📚";
    }
    if (/체육|운동|준비물/.test(line)) {
        return "🎒";
    }
    return "📌";
}

function formalizeFallbackLine(line: string): string {
    const withoutMarker = stripLeadingListMarker(line);
    const withoutEmoji = withoutMarker.replace(EMOJI_PATTERN, "").trim();
    const emoji = EMOJI_PATTERN.test(withoutMarker.slice(0, 4)) ? "" : `${selectNoticeEmoji(withoutEmoji)} `;

    return `${emoji}${withoutEmoji
        .replace(/서로간/g, "서로 간")
        .replace(/가정에도 적극적인 관심과 지도 부탁드립니다/g, "가정에서도 학생들의 안전한 이용 습관 형성을 위해 적극적인 관심과 지도를 부탁드립니다")
        .replace(/적극적인 관심과 지도 부탁드립니다/g, "적극적인 관심과 지도를 부탁드립니다")
        .replace(/지도했습니다/g, "지도하였습니다")
        .replace(/지도 부탁드립니다/g, "함께 지도해 주시기 바랍니다")
        .replace(/확인 부탁드립니다/g, "확인해 주시기 바랍니다")
        .replace(/가정에도/g, "가정에서도")
        .replace(/많이 있습니다/g, "늘어나고 있습니다")
        .replace(/필수입니다/g, "반드시 필요합니다")}`.trim();
}

function buildFormalizedFallbackNoticeText(sourceText: string): string {
    return sourceText
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trim() ? formalizeFallbackLine(line) : "")
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
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

    const preservedCount = countPreservedKoreanFacts(requiredFacts, resultText);
    if (requiredFacts.length <= 2) {
        return preservedCount >= 1;
    }

    if (requiredFacts.length >= 20) {
        return preservedCount >= 6;
    }

    return preservedCount / requiredFacts.length >= 0.6;
}

function preservesSourceItemCoverage(sourceText: string, resultText: string): boolean {
    const sourceItems = extractSourceItems(sourceText);
    if (sourceItems.length <= 1) {
        return true;
    }

    return sourceItems.every((item) => {
        const itemFacts = extractRequiredKoreanFacts(item);
        const distinctiveFacts = itemFacts.filter((fact) => {
            const normalizedFact = normalizeKoreanFact(fact);
            return !/^(가정|지도|부탁|주시기|관심|적극|함께|통해)$/.test(normalizedFact);
        });
        const coverageFacts = distinctiveFacts.length >= 3 ? distinctiveFacts : itemFacts;
        if (!coverageFacts.length) {
            return true;
        }

        const requiredCount = coverageFacts.length >= 8 ? 3 : Math.min(2, coverageFacts.length);
        return countPreservedKoreanFacts(coverageFacts, resultText) >= requiredCount;
    });
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
        preservesSourceItemCoverage(sourceText, resultText) &&
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
    return [
        "응답에는 학부모에게 보낼 한국어 알림장 본문만 포함해 주세요.",
        "본문 첫 줄 앞에 설명, 분석, 라벨을 붙이지 마세요.",
        "첫 글자는 반드시 알림장 본문 이모지 또는 원문 첫 단어로 시작해야 합니다.",
        ...(includeEnglishTranslation
            ? ["다른 언어 출력은 이후 별도 단계에서 처리하므로 여기서는 한국어 본문만 쓰세요."]
            : []),
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
        "당신은 초등학교 알림장 문장을 학부모용 가정통신문 문체로 다듬는 보조자입니다.",
        '역할은 원문 정보를 보존하면서 "공식 안내문처럼 다시 쓰기"입니다.',
        "",
        "규칙:",
        "- 사용자가 쓴 핵심 정보와 항목 순서는 유지하되, 표현은 그대로 복사하지 않습니다.",
        "- 원문의 숫자, 날짜, 시간, 요일은 반드시 유지합니다.",
        "- 짧은 메모를 그대로 베껴 쓰지 말고, 학부모에게 안내하는 완성된 문장으로 바꿉니다.",
        "- 이미 완성된 문장처럼 보여도 원문을 그대로 옮기지 말고 어미, 연결어, 안내 표현을 공식적인 문체로 다듬습니다.",
        "- 문체를 차분하고 공식적인 가정통신문 문체로 맞춥니다.",
        "- 명사형 메모나 단편 문장은 자연스러운 안내 문장으로 풀어 씁니다.",
        "- 새 정보, 새 일정, 새 금액, 새 제출물은 절대 추가하지 않습니다.",
        "- 제목, 소제목, 마크다운 표기, 번호 목록을 새로 만들지 않습니다.",
        "- 원문에 번호 목록이 있더라도 최종 본문에서는 번호 대신 가벼운 플랫 이모지로 항목을 구분합니다.",
        "- 각 문단이나 항목 첫머리에 과하지 않은 플랫 이모지를 붙입니다.",
        "- 설명, 분석, 라벨, 제목 없이 최종 알림장 본문만 출력합니다.",
    ].join("\n");

    const prompt = [
        "아래 원문을 학부모에게 전달할 공식 통신문 문체의 일반 텍스트로 다듬어 주세요.",
        "원문 정보와 항목 순서는 유지하되, 원문 문장을 그대로 복사하지 말고 더 정중하고 공식적인 안내문으로 다시 써 주세요.",
        "이미 문장형으로 입력된 내용도 어미와 연결 표현을 다듬어 가정통신문처럼 보이게 해 주세요.",
        "번호 목록 대신 각 문단이나 항목 첫머리에 간단한 플랫 이모지를 붙여 주세요.",
        ...buildOutputFormatInstruction(options.includeEnglishTranslation),
        "",
        "[원문]",
        text,
    ].join("\n");

    async function generateReliableKoreanResult(modelId: string): Promise<string> {
        let rawResult = await generateWithRetry({
            systemMessage,
            prompt,
            model: modelId,
            temperature: 0.2,
        });

        let sanitizedResult = sanitizeNoticeContent(rawResult);

        if (!isReliableNoticeResult(text, sanitizedResult) || isTooCloseToSource(text, sanitizedResult)) {
            const requiredFacts = extractRequiredNumberFacts(text);
            const requiredKoreanFacts = extractRequiredKoreanFacts(text);
            const repairPrompt = [
                "이전 출력에는 원문 정보 누락, 메타 설명, 깨진 문자, 또는 원문을 거의 그대로 옮긴 표현이 포함되었습니다.",
                requiredFacts.length ? `반드시 포함해야 하는 원문 숫자: ${requiredFacts.join(", ")}` : "",
                requiredKoreanFacts.length ? `반드시 포함해야 하는 원문 한국어 단어: ${requiredKoreanFacts.join(", ")}` : "",
                "새 정보나 작성 날짜를 추가하지 말고, 아래 원문의 정보만 유지해 다시 다듬어 주세요.",
                "원문 문장을 그대로 반복하지 말고, 공식적인 가정통신문 문체의 완성된 안내 문장으로 바꿔 주세요.",
                "번호 목록은 그대로 쓰지 말고, 각 항목 앞에 내용에 맞는 가벼운 플랫 이모지를 붙여 주세요.",
                "원문의 한국어를 물음표나 깨진 문자로 바꾸지 마세요.",
                "설명, 분석, 라벨 없이 최종 본문만 출력하세요.",
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

        if (isTooCloseToSource(text, sanitizedResult)) {
            const rewritePrompt = [
                "이전 출력이 원문을 그대로 반복하고 있습니다.",
                "원문 정보와 항목 순서는 유지하되 문장 표현은 반드시 바꿔 주세요.",
                "학부모에게 보내는 공식적인 가정통신문 문체로 정중하게 다시 작성해 주세요.",
                "번호 목록은 제거하고 각 항목 첫머리에 내용에 맞는 가벼운 플랫 이모지를 붙여 주세요.",
                "설명, 분석, 라벨 없이 최종 본문만 출력하세요.",
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
                prompt: rewritePrompt,
                model: modelId,
                temperature: 0.2,
            });
            sanitizedResult = sanitizeNoticeContent(rawResult);
        }

        if (!isReliableNoticeResult(text, sanitizedResult)) {
            sanitizedResult = sanitizeNoticeContent(buildFallbackNoticeText(text, sanitizedResult));
        }

        if (isTooCloseToSource(text, sanitizedResult)) {
            sanitizedResult = sanitizeNoticeContent(buildFormalizedFallbackNoticeText(text));
        }

        return sanitizedResult;
    }

    async function generateEnglishTranslation(koreanBody: string, modelId: string): Promise<string> {
        const translationSystemMessage = [
            "You translate Korean elementary school notices for parents.",
            "Output only the English translation body.",
            "Do not include analysis, labels, headings, markdown, or a separator.",
            "Keep the same line order and the same flat emoji at the beginning of each line.",
            "Use a calm, official school notice tone.",
        ].join("\n");
        const translationPrompt = [
            "아래 한국어 알림장 본문을 영어로 번역해 주세요.",
            "한국어 줄 수와 순서를 유지하고, 각 줄 첫머리의 이모지도 유지하세요.",
            "--- 구분선은 쓰지 마세요.",
            "설명, 분석, 라벨 없이 영어 번역 본문만 출력하세요.",
            "",
            "[한국어 알림장 본문]",
            koreanBody,
        ].join("\n");
        const rawTranslation = await generateWithRetry({
            systemMessage: translationSystemMessage,
            prompt: translationPrompt,
            model: modelId,
            temperature: 0.1,
        });

        return sanitizeNoticeContent(rawTranslation)
            .split("\n")
            .filter((line) => !/^---\s*$/.test(line))
            .join("\n")
            .trim();
    }

    async function generateNoticeResult(modelId: string): Promise<string> {
        const koreanResult = await generateReliableKoreanResult(modelId);

        if (!options.includeEnglishTranslation) {
            return koreanResult;
        }

        const englishResult = await generateEnglishTranslation(koreanResult, modelId);
        return sanitizeNoticeContent(`${koreanResult}\n---\n${englishResult}`);
    }

    const selectedModel = model || DEFAULT_MODEL;

    try {
        return await generateNoticeResult(selectedModel);
    } catch (error) {
        if (selectedModel !== DEFAULT_MODEL && isRecoverableLocalLlmError(error)) {
            try {
                return await generateNoticeResult(DEFAULT_MODEL);
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
