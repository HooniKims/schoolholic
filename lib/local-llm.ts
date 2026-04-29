export const LOCAL_LLM_BASE_URL = "https://lm.alluser.site";
export const LOCAL_LLM_CHAT_COMPLETIONS_ENDPOINT = `${LOCAL_LLM_BASE_URL}/v1/chat/completions`;

export type LocalModelOption = {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly requestModel: string;
    readonly defaultMaxTokens: number;
    readonly minMaxTokens?: number;
};

export const AVAILABLE_MODELS = [
    {
        id: "gemma4:e4b",
        name: "Gemma 4 E4B",
        description: "기본 모델, 기준 속도기준 품질",
        requestModel: "google/gemma-4-e4b",
        defaultMaxTokens: 3072,
        minMaxTokens: 3072,
    },
    {
        id: "gemma4:e2b",
        name: "Gemma 4 E2B",
        description: "기본보다 빠름, 품질은 간단",
        requestModel: "google/gemma-4-e2b",
        defaultMaxTokens: 2048,
    },
    {
        id: "lmstudio:gemma-4-26b-a4b-it-q4ks",
        name: "Gemma 4 26B Q4",
        description: "느리지만 품질 높음",
        requestModel: "gemma-4-26b-a4b-it",
        defaultMaxTokens: 4096,
        minMaxTokens: 4096,
    },
] as const satisfies readonly LocalModelOption[];

export const DEFAULT_MODEL = "gemma4:e2b";

export function getModelOptionLabel(model: LocalModelOption): string {
    return `${model.name} - ${model.description}`;
}

export function getLocalModelConfig(modelId?: string): LocalModelOption {
    return (
        AVAILABLE_MODELS.find((model) => model.id === modelId) ||
        AVAILABLE_MODELS.find((model) => model.id === DEFAULT_MODEL) ||
        AVAILABLE_MODELS[0]
    );
}

function resolveMaxTokens(model: LocalModelOption, maxTokens?: number): number {
    if (typeof maxTokens !== "number") {
        return model.defaultMaxTokens;
    }

    if (typeof model.minMaxTokens === "number") {
        return Math.max(maxTokens, model.minMaxTokens);
    }

    return maxTokens;
}

export function buildChatCompletionBody(params: {
    systemMessage: string;
    userPrompt: string;
    modelId?: string;
    temperature?: number;
    maxTokens?: number;
}) {
    const model = getLocalModelConfig(params.modelId || DEFAULT_MODEL);

    return {
        model: model.requestModel,
        messages: [
            { role: "system", content: params.systemMessage },
            { role: "user", content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: resolveMaxTokens(model, params.maxTokens),
        reasoning_effort: "none",
        stream: false,
    };
}

export function getLocalLlmApiKey(): string {
    return process.env.NEXT_PUBLIC_LOCAL_LLM_API_KEY || "";
}
