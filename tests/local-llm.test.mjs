import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

function loadTsModule(relativePath) {
    const filename = path.join(import.meta.dirname, "..", relativePath);
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const cjsModule = { exports: {} };
    const sandbox = {
        module: cjsModule,
        exports: cjsModule.exports,
        process,
        __dirname: path.dirname(filename),
        __filename: filename,
    };

    vm.runInNewContext(output, sandbox, { filename });
    return cjsModule.exports;
}

test("local LLM models expose the approved Gemma 4 options including 12B", () => {
    const { AVAILABLE_MODELS, DEFAULT_MODEL, getModelOptionLabel } = loadTsModule("lib/local-llm.ts");

    assert.equal(DEFAULT_MODEL, "gemma4:e2b");
    assert.deepEqual(
        plain(AVAILABLE_MODELS.map(({ id, name, description, requestModel }) => ({
            id,
            name,
            description,
            requestModel,
        }))),
        [
            {
                id: "gemma4:e4b",
                name: "Gemma 4 E4B",
                description: "가벼운 모델, 빠른 응답",
                requestModel: "google/gemma-4-e4b",
            },
            {
                id: "gemma4:e2b",
                name: "Gemma 4 E2B",
                description: "기본 모델, 가장 빠른 응답",
                requestModel: "google/gemma-4-e2b",
            },
            {
                id: "lmstudio:gemma-4-12b-it",
                name: "Gemma 4 12B",
                description: "기본보다 느림, 긴 글 품질 보강",
                requestModel: "gemma-4-12b-it",
            },
            {
                id: "lmstudio:gemma-4-26b-a4b-it-q4ks",
                name: "Gemma 4 26B Q4",
                description: "가장 느림, 품질 우선",
                requestModel: "gemma-4-26b-a4b-it",
            },
        ]
    );
    assert.deepEqual(
        plain(AVAILABLE_MODELS.map(getModelOptionLabel)),
        [
            "Gemma 4 E4B - 가벼운 모델, 빠른 응답",
            "Gemma 4 E2B - 기본 모델, 가장 빠른 응답",
            "Gemma 4 12B - 기본보다 느림, 긴 글 품질 보강",
            "Gemma 4 26B Q4 - 가장 느림, 품질 우선",
        ]
    );
});

test("local LLM requests use the LM Studio endpoint and mapped model names", () => {
    const {
        AVAILABLE_MODELS,
        LOCAL_LLM_CHAT_COMPLETIONS_ENDPOINT,
        buildChatCompletionBody,
        getLocalModelConfig,
    } = loadTsModule("lib/local-llm.ts");

    assert.equal(LOCAL_LLM_CHAT_COMPLETIONS_ENDPOINT, "https://lm.alluser.site/v1/chat/completions");

    const expected = new Map([
        ["gemma4:e4b", { requestModel: "google/gemma-4-e4b", maxTokens: 3072 }],
        ["gemma4:e2b", { requestModel: "google/gemma-4-e2b", maxTokens: 2048 }],
        ["lmstudio:gemma-4-12b-it", { requestModel: "gemma-4-12b-it", maxTokens: 4096 }],
        ["lmstudio:gemma-4-26b-a4b-it-q4ks", { requestModel: "gemma-4-26b-a4b-it", maxTokens: 4096 }],
    ]);

    for (const model of AVAILABLE_MODELS) {
        const config = getLocalModelConfig(model.id);
        const body = buildChatCompletionBody({
            systemMessage: "시스템 지시문",
            userPrompt: "사용자 프롬프트",
            modelId: model.id,
            temperature: 0.7,
        });
        const modelExpectation = expected.get(model.id);

        assert.equal(config.requestModel, modelExpectation.requestModel);
        assert.equal(body.model, modelExpectation.requestModel);
        assert.equal(body.max_tokens, modelExpectation.maxTokens);
        assert.equal(body.reasoning_effort, "none");
        assert.equal(body.stream, false);
        assert.deepEqual(plain(body.messages), [
            { role: "system", content: "시스템 지시문" },
            { role: "user", content: "사용자 프롬프트" },
        ]);
    }
});

test("local LLM default model falls back to Gemma 4 E2B", () => {
    const { buildChatCompletionBody, getLocalModelConfig } = loadTsModule("lib/local-llm.ts");

    assert.equal(getLocalModelConfig().id, "gemma4:e2b");
    assert.equal(getLocalModelConfig("missing-model").id, "gemma4:e2b");
    assert.equal(
        buildChatCompletionBody({
            systemMessage: "system",
            userPrompt: "prompt",
        }).model,
        "google/gemma-4-e2b"
    );
});

test("local LLM max token floors are enforced for larger models", () => {
    const { buildChatCompletionBody } = loadTsModule("lib/local-llm.ts");

    assert.equal(
        buildChatCompletionBody({
            systemMessage: "system",
            userPrompt: "prompt",
            modelId: "gemma4:e2b",
            maxTokens: 1024,
        }).max_tokens,
        1024
    );
    assert.equal(
        buildChatCompletionBody({
            systemMessage: "system",
            userPrompt: "prompt",
            modelId: "gemma4:e4b",
            maxTokens: 1024,
        }).max_tokens,
        3072
    );
    assert.equal(
        buildChatCompletionBody({
            systemMessage: "system",
            userPrompt: "prompt",
            modelId: "lmstudio:gemma-4-12b-it",
            maxTokens: 1024,
        }).max_tokens,
        4096
    );
    assert.equal(
        buildChatCompletionBody({
            systemMessage: "system",
            userPrompt: "prompt",
            modelId: "lmstudio:gemma-4-26b-a4b-it-q4ks",
            maxTokens: 1024,
        }).max_tokens,
        4096
    );
});
