import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadTsModule(relativePath, overrides = {}) {
    const filename = path.join(import.meta.dirname, "..", relativePath);
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const cjsModule = { exports: {} };
    const localLlm = overrides.localLlm ?? {
        AVAILABLE_MODELS: [],
        DEFAULT_MODEL: "gemma4:e4b",
        LOCAL_LLM_CHAT_COMPLETIONS_ENDPOINT: "https://lm.alluser.site/v1/chat/completions",
        buildChatCompletionBody: (params) => params,
        getLocalLlmApiKey: () => "test-key",
        getModelOptionLabel: (model) => model.name,
    };
    const noticeContent = overrides.noticeContent ?? (
        relativePath === "lib/notice-content.ts"
            ? {}
            : loadTsModule("lib/notice-content.ts", { noticeContent: {} })
    );
    const sandbox = {
        module: cjsModule,
        exports: cjsModule.exports,
        process,
        console,
        fetch: overrides.fetch,
        require: (moduleName) => {
            if (moduleName === "./local-llm") {
                return localLlm;
            }
            if (moduleName === "./notice-content") {
                return noticeContent;
            }

            throw new Error(`Unexpected require: ${moduleName}`);
        },
        __dirname: path.dirname(filename),
        __filename: filename,
    };

    vm.runInNewContext(output, sandbox, { filename });
    return cjsModule.exports;
}

test("summarizeNote returns only the polished notice text when the model includes method notes", async () => {
    const responses = [
        [
            "규칙 준수: 원문 정보를 유지했습니다.",
            "문체 변화: 안내문 톤으로 다듬었습니다.",
            "구조화: 항목별로 정리했습니다.",
            "",
            "요약 결과:",
            "내일은 체육복을 입고 등교합니다.",
            "수학 익힘책 32쪽을 풀어 옵니다.",
        ].join("\n"),
    ];
    const calls = [];
    const { summarizeNote } = loadTsModule("lib/notice-ai.ts", {
        fetch: async (url, request) => {
            calls.push({ url, request });
            return {
                ok: true,
                json: async () => ({
                    choices: [
                        {
                            message: {
                                content: responses.shift(),
                            },
                        },
                    ],
                }),
            };
        },
    });

    const result = await summarizeNote("내일 체육복. 수학 익힘책 32쪽.", new Date("2026-04-29T00:00:00+09:00"));

    assert.equal(calls.length, 1);
    assert.equal(result, "내일은 체육복을 입고 등교합니다.\n수학 익힘책 32쪽을 풀어 옵니다.");
});

test("summarizeNote adds English translation instructions when requested", async () => {
    const calls = [];
    const { summarizeNote } = loadTsModule("lib/notice-ai.ts", {
        fetch: async (url, request) => {
            calls.push({ url, request });
            return {
                ok: true,
                json: async () => ({
                    choices: [
                        {
                            message: {
                                content: [
                                    "내일은 체육복을 입고 등교합니다.",
                                    "---",
                                    "Students should wear PE uniforms to school tomorrow.",
                                ].join("\n"),
                            },
                        },
                    ],
                }),
            };
        },
    });

    const result = await summarizeNote(
        "내일 체육복.",
        new Date("2026-04-29T00:00:00+09:00"),
        "gemma4:e2b",
        { includeEnglishTranslation: true }
    );
    const requestBody = JSON.parse(calls[0].request.body);

    assert.match(
        requestBody.userPrompt,
        /학교에서 학부모에게 안내하는 톤의 영어 번역을 추가해서 다듬어줘\. 형식은 한국어와 같게\./
    );
    assert.match(requestBody.userPrompt, /한국어 알림장 본문, --- 구분선, 영어 번역 본문만 포함/);
    assert.match(requestBody.systemMessage, /원문의 숫자, 날짜, 시간, 요일/);
    assert.match(requestBody.systemMessage, /설명, 분석, 라벨/);
    assert.match(requestBody.systemMessage, /플랫 이모지를 붙입니다/);
    assert.match(requestBody.userPrompt, /플랫 이모지를 붙여 주세요/);
    assert.doesNotMatch(requestBody.systemMessage, /붙여도 됩니다/);
    assert.doesNotMatch(requestBody.userPrompt, /작성 날짜 참고/);
    assert.equal(requestBody.temperature, 0.2);
    assert.equal(
        result,
        "내일은 체육복을 입고 등교합니다.\n---\nStudents should wear PE uniforms to school tomorrow."
    );
});

test("summarizeNote retries when the model drops source date or time facts", async () => {
    const responses = [
        "😊 안녕하세요.\n---\n😊 Hello.",
        "📌 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.\n---\n📌 Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today.",
    ];
    const calls = [];
    const { summarizeNote } = loadTsModule("lib/notice-ai.ts", {
        fetch: async (url, request) => {
            calls.push({ url, request });
            return {
                ok: true,
                json: async () => ({
                    choices: [
                        {
                            message: {
                                content: responses.shift(),
                            },
                        },
                    ],
                }),
            };
        },
    });

    const result = await summarizeNote(
        "내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        new Date("2026-04-29T00:00:00+09:00"),
        "gemma4:e2b",
        { includeEnglishTranslation: true }
    );
    const retryBody = JSON.parse(calls[1].request.body);

    assert.equal(calls.length, 2);
    assert.match(retryBody.userPrompt, /원문의 핵심 숫자\/날짜\/시간이 빠졌습니다/);
    assert.match(retryBody.userPrompt, /4, 30, 12/);
    assert.equal(
        result,
        "📌 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.\n---\n📌 Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today."
    );
});
