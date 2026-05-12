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
    const responses = [
        "👕 내일은 체육복을 입고 등교해 주세요.",
        "👕 Please have your child wear PE clothes to school tomorrow.",
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
        "내일 체육복.",
        new Date("2026-04-29T00:00:00+09:00"),
        "gemma4:e2b",
        { includeEnglishTranslation: true }
    );
    const polishBody = JSON.parse(calls[0].request.body);
    const translationBody = JSON.parse(calls[1].request.body);

    assert.equal(calls.length, 2);
    assert.match(polishBody.systemMessage, /원문의 숫자, 날짜, 시간, 요일/);
    assert.match(polishBody.systemMessage, /설명, 분석, 라벨/);
    assert.match(polishBody.systemMessage, /플랫 이모지를 붙입니다/);
    assert.match(polishBody.systemMessage, /공식적인 가정통신문 문체/);
    assert.match(polishBody.systemMessage, /짧은 메모를 그대로 베껴 쓰지 말고/);
    assert.match(polishBody.userPrompt, /플랫 이모지를 붙여 주세요/);
    assert.match(polishBody.userPrompt, /학부모에게 전달할 공식 통신문 문체/);
    assert.match(polishBody.userPrompt, /한국어 본문만 쓰세요/);
    assert.doesNotMatch(polishBody.userPrompt, /영어 번역/);
    assert.doesNotMatch(polishBody.systemMessage, /붙여도 됩니다/);
    assert.doesNotMatch(polishBody.userPrompt, /작성 날짜 참고/);
    assert.equal(polishBody.temperature, 0.2);
    assert.match(translationBody.userPrompt, /아래 한국어 알림장 본문을 영어로 번역/);
    assert.match(translationBody.userPrompt, /👕 내일은 체육복을 입고 등교해 주세요\./);
    assert.match(translationBody.systemMessage, /official school notice tone/);
    assert.equal(translationBody.temperature, 0.1);
    assert.equal(
        result,
        "👕 내일은 체육복을 입고 등교해 주세요.\n---\n👕 Please have your child wear PE clothes to school tomorrow."
    );
});

test("summarizeNote generates Korean polish first, then translates it to English", async () => {
    const responses = [
        [
            "👕 내일은 체육복을 입고 등교해 주세요.",
            "📚 수학 익힘책 32쪽을 풀어오도록 지도 부탁드립니다.",
            "📝 가정통신문을 확인해 주시기 바랍니다.",
        ].join("\n"),
        [
            "👕 Please have your child wear PE clothes to school tomorrow.",
            "📚 Please guide your child to complete page 32 of the math workbook.",
            "📝 Please check the school notice sent home.",
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

    const result = await summarizeNote(
        "내일 체육복. 수학 익힘책 32쪽 풀기. 가정통신문 확인.",
        new Date("2026-05-12T00:00:00+09:00"),
        "gemma4:e2b",
        { includeEnglishTranslation: true }
    );
    const firstBody = JSON.parse(calls[0].request.body);
    const secondBody = JSON.parse(calls[1].request.body);

    assert.equal(calls.length, 2);
    assert.doesNotMatch(firstBody.userPrompt, /영어 번역/);
    assert.match(secondBody.userPrompt, /아래 한국어 알림장 본문을 영어로 번역/);
    assert.match(secondBody.userPrompt, /👕 내일은 체육복을 입고 등교해 주세요\./);
    assert.equal(
        result,
        [
            "👕 내일은 체육복을 입고 등교해 주세요.",
            "📚 수학 익힘책 32쪽을 풀어오도록 지도 부탁드립니다.",
            "📝 가정통신문을 확인해 주시기 바랍니다.",
            "---",
            "👕 Please have your child wear PE clothes to school tomorrow.",
            "📚 Please guide your child to complete page 32 of the math workbook.",
            "📝 Please check the school notice sent home.",
        ].join("\n")
    );
});

test("summarizeNote retries when the model merely copies source fragments", async () => {
    const responses = [
        [
            "📌 내일 체육복.",
            "📚 수학 익힘책 32쪽 풀기.",
        ].join("\n"),
        [
            "👕 내일은 체육복을 준비하여 등교할 수 있도록 가정에서 확인해 주시기 바랍니다.",
            "📚 수학 익힘책 32쪽을 풀어올 수 있도록 지도해 주시기 바랍니다.",
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

    const result = await summarizeNote(
        "내일 체육복. 수학 익힘책 32쪽 풀기.",
        new Date("2026-04-29T00:00:00+09:00"),
        "gemma4:e2b"
    );
    const retryBody = JSON.parse(calls[1].request.body);

    assert.equal(calls.length, 2);
    assert.match(retryBody.userPrompt, /원문을 거의 그대로 옮긴 표현/);
    assert.equal(
        result,
        "👕 내일은 체육복을 준비하여 등교할 수 있도록 가정에서 확인해 주시기 바랍니다.\n📚 수학 익힘책 32쪽을 풀어올 수 있도록 지도해 주시기 바랍니다."
    );
});

test("summarizeNote rewrites formal-looking source instead of accepting a copied result", async () => {
    const source = [
        "1. 친구의 외모나 특징을 비하하지 않도록 지도했습니다. 가정에서도 대화를 통해 서로간의 존중을 배울 수 있도록 지도 부탁드립니다.",
        "",
        "2. 전동 킥보드, 전기 자전거 등을 이용하는 학생들이 많이 있습니다. 이러한 전기 원동기는 면허와 함께 안전보호구 착용이 필수입니다. 가정에도 적극적인 관심과 지도 부탁드립니다.",
    ].join("\n");
    const finalNotice = [
        "🤝 친구의 외모나 특징을 비하하지 않고 서로 존중하는 태도를 지닐 수 있도록 지도하였습니다. 가정에서도 대화를 통해 존중과 배려의 태도를 함께 지도해 주시기 바랍니다.",
        "",
        "🛴 전동 킥보드와 전기 자전거 등 전기 원동기 이용 시에는 면허 소지와 안전보호구 착용이 반드시 필요합니다. 학생들이 안전하게 생활할 수 있도록 가정에서도 적극적인 관심과 지도를 부탁드립니다.",
    ].join("\n");
    const responses = [source, source, finalNotice];
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

    const result = await summarizeNote(source, new Date("2026-05-12T00:00:00+09:00"), "gemma4:e2b");
    const finalRetryBody = JSON.parse(calls[2].request.body);

    assert.equal(calls.length, 3);
    assert.match(finalRetryBody.userPrompt, /원문을 그대로 반복/);
    assert.doesNotMatch(result, /^1\./);
    assert.match(result, /^🤝/);
    assert.match(result, /존중과 배려|안전하게 생활/);
    assert.equal(result, finalNotice);
});

test("summarizeNote retries when a numbered source item is omitted", async () => {
    const source = [
        "1. 친구의 외모나 특징을 비하하지 않도록 지도했습니다. 가정에서도 대화를 통해 서로간의 존중을 배울 수 있도록 지도 부탁드립니다.",
        "",
        "2. 전동 킥보드, 전기 자전거 등을 이용하는 학생들이 많이 있습니다. 이러한 전기 원동기는 면허와 함께 안전보호구 착용이 필수입니다. 가정에도 적극적인 관심과 지도 부탁드립니다.",
    ].join("\n");
    const finalNotice = [
        "🤝 친구의 외모나 특징을 비하하지 않고 서로 존중하는 태도를 기를 수 있도록 지도하였습니다. 가정에서도 존중과 배려에 대해 함께 이야기해 주시기 바랍니다.",
        "",
        "🛴 전동 킥보드와 전기 자전거 등 전기 원동기 이용 시에는 면허 소지와 안전보호구 착용이 반드시 필요합니다. 학생들이 안전하게 생활할 수 있도록 가정에서도 적극적인 관심과 지도를 부탁드립니다.",
    ].join("\n");
    const responses = [
        "😊 친구의 외모나 특징을 비하하지 않도록 지도하였습니다. 가정에서도 서로를 존중하는 마음을 배울 수 있도록 지도해 주시기를 부탁드립니다.",
        finalNotice,
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

    const result = await summarizeNote(source, new Date("2026-05-12T00:00:00+09:00"), "gemma4:e2b");
    const retryBody = JSON.parse(calls[1].request.body);

    assert.equal(calls.length, 2);
    assert.match(retryBody.userPrompt, /원문 정보 누락/);
    assert.match(result, /킥보드/);
    assert.match(result, /안전보호구/);
    assert.doesNotMatch(result, /관심과 함께 지도/);
    assert.equal(result, finalNotice);
});

test("summarizeNote retries when the model drops source date or time facts", async () => {
    const responses = [
        "😊 안녕하세요.",
        "📌 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "📌 내일(4월 30일 목요일)에도 학생들은 오늘과 동일하게 12시경 하교할 예정입니다.",
        "📌 Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today.",
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
    const finalRetryBody = JSON.parse(calls[2].request.body);
    const translationBody = JSON.parse(calls[3].request.body);

    assert.equal(calls.length, 4);
    assert.match(retryBody.userPrompt, /원문 정보 누락, 메타 설명, 깨진 문자/);
    assert.match(retryBody.userPrompt, /4, 30, 12/);
    assert.match(finalRetryBody.userPrompt, /원문을 그대로 반복/);
    assert.match(translationBody.userPrompt, /아래 한국어 알림장 본문을 영어로 번역/);
    assert.match(translationBody.userPrompt, /📌 내일\(4월 30일 목요일\)에도 학생들은 오늘과 동일하게 12시경 하교할 예정입니다\./);
    assert.equal(
        result,
        "📌 내일(4월 30일 목요일)에도 학생들은 오늘과 동일하게 12시경 하교할 예정입니다.\n---\n📌 Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today."
    );
});

test("summarizeNote keeps a valid polish result even when Korean wording changes naturally", async () => {
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
                                    "📌 내일은 체육복을 입고 등교합니다.",
                                    "📚 수학 익힘책 32쪽을 풀어 옵니다.",
                                ].join("\n"),
                            },
                        },
                    ],
                }),
            };
        },
    });

    const result = await summarizeNote(
        "내일 체육복. 수학 익힘책 32쪽 풀기.",
        new Date("2026-04-29T00:00:00+09:00"),
        "gemma4:e2b"
    );

    assert.equal(calls.length, 1);
    assert.equal(
        result,
        "📌 내일은 체육복을 입고 등교합니다.\n📚 수학 익힘책 32쪽을 풀어 옵니다."
    );
});

test("summarizeNote falls back to source text when all model attempts are corrupted", async () => {
    const responses = [
        "원문이 너무 비어있어 다듬을 내용이 없으므로, 형식만 유지하겠습니다.😊 ?? 5? 3? ??? 2?? ???? 10? ??? ???. ??? ????.",
        "따라서, 원문을 최대한 존중하여 형식만 맞추겠습니다.📌 ?? 5? 3? ??? 2?? ???? 10? ??? ???. ??? ????.",
        "최종 출력: 😊 ?? 5? 3? ??? 2?? ???? 10? ??? ???. ??? ????.",
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
        "내일 5월 3일 금요일 2시에 받아쓰기 10급 시험을 봅니다. 연습장 가져오기.",
        new Date("2026-05-02T00:00:00+09:00"),
        "gemma4:e2b"
    );

    assert.equal(calls.length, 2);
    assert.equal(
        result,
        "📌 내일 5월 3일 금요일 2시에 받아쓰기 10급 시험을 봅니다. 연습장 가져오기."
    );
});

test("summarizeNote retries with the default model when the selected model is unloaded", async () => {
    const calls = [];
    const { summarizeNote } = loadTsModule("lib/notice-ai.ts", {
        localLlm: {
            AVAILABLE_MODELS: [],
            DEFAULT_MODEL: "gemma4:e2b",
            LOCAL_LLM_CHAT_COMPLETIONS_ENDPOINT: "https://lm.alluser.site/v1/chat/completions",
            buildChatCompletionBody: ({ modelId, ...params }) => ({
                ...params,
                model: modelId === "gemma4:e4b" ? "google/gemma-4-e4b" : "google/gemma-4-e2b",
            }),
            getLocalLlmApiKey: () => "test-key",
            getModelOptionLabel: (model) => model.name,
        },
        fetch: async (url, request) => {
            calls.push({ url, request });
            if (calls.length === 1) {
                return {
                    ok: false,
                    status: 503,
                    json: async () => ({ error: "Model unloaded." }),
                };
            }

            return {
                ok: true,
                json: async () => ({
                    choices: [
                        {
                            message: {
                                content: "📌 내일 5월 3일 금요일 2시에 받아쓰기 10급 시험을 볼 예정입니다. 가정에서 연습할 수 있도록 확인해 주시기 바랍니다.",
                            },
                        },
                    ],
                }),
            };
        },
    });

    const result = await summarizeNote(
        "내일 5월 3일 금요일 2시에 받아쓰기 10급 시험을 봅니다.",
        new Date("2026-05-02T00:00:00+09:00"),
        "gemma4:e4b"
    );

    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(calls[0].request.body).model, "google/gemma-4-e4b");
    assert.equal(JSON.parse(calls[1].request.body).model, "google/gemma-4-e2b");
    assert.equal(result, "📌 내일 5월 3일 금요일 2시에 받아쓰기 10급 시험을 볼 예정입니다. 가정에서 연습할 수 있도록 확인해 주시기 바랍니다.");
});
