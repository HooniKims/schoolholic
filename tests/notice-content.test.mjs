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
            jsx: ts.JsxEmit.ReactJSX,
        },
    }).outputText;
    const cjsModule = { exports: {} };
    const sandbox = {
        module: cjsModule,
        exports: cjsModule.exports,
        process,
        console,
        require: (moduleName) => {
            if (overrides.require?.[moduleName]) {
                return overrides.require[moduleName];
            }

            throw new Error(`Unexpected require: ${moduleName}`);
        },
        __dirname: path.dirname(filename),
        __filename: filename,
    };

    vm.runInNewContext(output, sandbox, { filename });
    return cjsModule.exports;
}

test("sanitizeNoticeContent removes leading reasoning simulation and keeps only notice body", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "생각 과정 시뮬레이션",
        "1. 목표 확인",
        "2. 형식 적용",
        "3. 내용 추출",
        "4. 상세 내용 정리",
        "5. 최종 출력물 생성",
        "",
        "안녕하세요, 학부모님.",
        "내일은 체육복을 입고 등교합니다.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        "안녕하세요, 학부모님.\n내일은 체육복을 입고 등교합니다."
    );
});

test("sanitizeNoticeContent removes common final-check meta lines", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "요청한 형식에 맞추어 작성한 결과입니다.",
        "검토",
        "최종 점검 메시지: 마크다운 기호 사용 금지",
        "작성 원칙 준수 여부: 확인",
        "",
        "오늘 받아쓰기 공책을 가정으로 보냅니다.",
        "확인 후 내일 다시 보내 주세요.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        "오늘 받아쓰기 공책을 가정으로 보냅니다.\n확인 후 내일 다시 보내 주세요."
    );
});

test("sanitizeNoticeContent removes English thinking-process blocks before bilingual notices", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "Thinking Process:",
        "",
        "1. Analyze the Request:",
        "* Role: Assistant for polishing elementary school notification texts.",
        "* Goal: Refine the provided Korean text.",
        "* Output Requirement: The final output must include the polished Korean text.",
        "",
        "2. Analyze the Original Text (Korean):",
        "> 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "",
        "3. Refine the Korean Text:",
        "* Drafting Polish: Keep the core message clear.",
        "",
        "6. Construct Final Output. (Self-Correction: Ensure the date context is handled correctly within the flow.) 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "가정에서도 참고하여 주시기 바랍니다.",
        "---",
        "Tomorrow (Thursday, April 30th), students will be dismissed at approximately 12:00 PM, the same as today.",
        "Please keep this in mind at home.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
            "가정에서도 참고하여 주시기 바랍니다.",
            "---",
            "Tomorrow (Thursday, April 30th), students will be dismissed at approximately 12:00 PM, the same as today.",
            "Please keep this in mind at home.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent removes English reasoning checklist and orphan emoji marker from bilingual notices", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "Thinking Process:",
        "",
        "1. Analyze the Request:",
        "* Role: Assistant for polishing elementary school notification texts .",
        "* Goal: Refine the provided Korean text to be more natural, calm, and consistent, while strictly maintaining the original information, structure, order, and line breaks.",
        "* Output Requirement: The final output must include the polished Korean text, followed by a separator (---), and then an English translation in the same format.",
        "* Context: School notification to parents.",
        "* Date Reference: April 29, 2026 (Wednesday).",
        "",
        "2. Analyze the Original Text (Source):",
        "> 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다. 가정에서는 참고해주시기 바랍니다.",
        "",
        "3. Refine the Korean Text (Polishing):",
        "* The original is slightly stiff.",
        "* *Drafting Polish:* Keep the core message: Students leave around 12:00 PM tomorrow.",
        "",
        "4. Refine the English Translation:",
        "* The English translation must match the tone of a formal school notice.",
        "",
        "5. Final Formatting Check:",
        "* Maintain structure.",
        "* Add flat emojis (optional, but good for tone).",
        "* Include the separator (---).",
        "",
        "6. Construct Final Output. (Self-Correction: Ensure no new information is added.)️ 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다. 가정에서도 참고하여 주시기 바랍니다.",
        "---",
        "️ Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today. Please take note of this at home as well.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다. 가정에서도 참고하여 주시기 바랍니다.",
            "---",
            "Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today. Please take note of this at home as well.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent keeps valid leading flat emojis", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "📌 내일(4월 30일 목요일)도 12시경에 학생들이 하교합니다.",
        "---",
        "📌 Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM.",
    ].join("\n");

    assert.equal(sanitizeNoticeContent(raw), raw);
});

test("sanitizeNoticeContent extracts final bilingual notice from alternate English planning output", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        '*   Task: "조금 다듬기" (light refinement), not rewriting. Keep original structure, order, line breaks, and information.',
        "*   Tone: Calm, consistent Korean.",
        "*   Formatting Rules:",
        "*   Maintain original structure/layout as much as possible.",
        "*   Fix awkward sentences naturally.",
        "*   Use calm, consistent Korean.",
        "*   Add a flat emoji at the beginning of each paragraph/item.",
        "*   Start directly with the final text (no preamble).",
        "*   Output format: Korean text, separator (---), English translation.",
        "",
        "*   Original Text (Korean): 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "",
        "*   The original sentence is grammatically correct but slightly stiff for a typical school notice.",
        "",
        "4.  Create English Translation:",
        "*   The translation must match the refined Korean tone and content.",
        "",
        "5.  Apply Formatting Rules & Final Output Construction:",
        "*   Add appropriate flat emojis.",
        "*   Separate the final output into Korean, separator, and English sections.",
        "",
        "(Self-Correction during drafting): The request asks for both Korean and English versions following the same structure.",
        "",
        "6.  Final Review: Check against all constraints.",
        "",
        "*(Drafting the final response based on the analysis.)*😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "---",
        "😊 Tomorrow (Thursday, April 30th), students will also be dismissed around 12:00 PM, the same as today.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
            "---",
            "😊 Tomorrow (Thursday, April 30th), students will also be dismissed around 12:00 PM, the same as today.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent removes generation label and restores broken leading emojis", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "Generation.�� 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다. 가정에서도 참고하여 주시기 바랍니다.",
        "",
        "---",
        "",
        "�� Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today. Please take note of this at home as well.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "📌 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다. 가정에서도 참고하여 주시기 바랍니다.",
            "---",
            "📌 Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today. Please take note of this at home as well.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent removes inline English preamble before Korean bilingual body", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "Since I am forced to provide an output in the specified format, I will generate a response based on the structure requested. (This is the safest path.)😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "---",
        "😊 Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
            "---",
            "😊 Tomorrow (Thursday, April 30th), students will be dismissed around 12:00 PM, the same as today.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent removes Korean generation labels before bilingual body", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "생성:",
        "한국어 본문 다듬기.",
        "영어 번역 다듬기.😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "---",
        "😊 Tomorrow (Thursday, April 30th), students will also be dismissed at approximately 12 o'clock, just like today.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
            "---",
            "😊 Tomorrow (Thursday, April 30th), students will also be dismissed at approximately 12 o'clock, just like today.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent removes Korean final-review preamble before emoji notice body", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "최종 검토: 규칙 준수 확인 (정보 유지, 이모지 사용, 형식 준수).😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "---",
        "😊 Tomorrow (Thursday, April 30th), students will also be dismissed around 12 o'clock, just like today.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
            "---",
            "😊 Tomorrow (Thursday, April 30th), students will also be dismissed around 12 o'clock, just like today.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent removes Korean output-format preamble before emoji notice body", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "한국어 본문과 영어 번문을 구분하여 출력한다.😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "---",
        "😊 Tomorrow (Thursday, April 30th), students will also be dismissed at approximately 12 o'clock, just like today.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
            "---",
            "😊 Tomorrow (Thursday, April 30th), students will also be dismissed at approximately 12 o'clock, just like today.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent removes free-form Korean rationale before emoji notice body", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "따라서, 원문을 최대한 존중하여 형식만 맞추고 내용을 변경하지 않겠습니다. (지침에 따라 진행합니다.)🗓️ 내일 5월 3일 금요일 2시에 받아쓰기 10급 시험을 봅니다.",
        "---",
        "🗓️ Tomorrow, Friday, May 3, students will take the level 10 dictation test at 2 PM.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "🗓️ 내일 5월 3일 금요일 2시에 받아쓰기 10급 시험을 봅니다.",
            "---",
            "🗓️ Tomorrow, Friday, May 3, students will take the level 10 dictation test at 2 PM.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent removes empty-source rationale before emoji notice body", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = "원문이 너무 비어있어 다듬을 내용이 없으므로, 형식만 유지하겠습니다.😊 내일 5월 3일 금요일 2시에 받아쓰기 10급 시험을 봅니다.";

    assert.equal(
        sanitizeNoticeContent(raw),
        "😊 내일 5월 3일 금요일 2시에 받아쓰기 10급 시험을 봅니다."
    );
});

test("sanitizeNoticeContent uses the final separator when the model emits extra separators", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "한국어 본문 + 이모지",
        "---",
        "😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "---",
        "😊 Tomorrow (Thursday, April 30th), students will also be dismissed around 12 o'clock, just like today.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
            "---",
            "😊 Tomorrow (Thursday, April 30th), students will also be dismissed around 12 o'clock, just like today.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent removes standalone Korean polish labels before bilingual body", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "한국어 다듬기.",
        "😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
        "---",
        "😊 Tomorrow (Thursday, April 30th), students will also be dismissed around 12 o'clock, just like today.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "😊 내일(4월 30일 목요일)도 오늘과 마찬가지로 12시경에 학생들이 하교합니다.",
            "---",
            "😊 Tomorrow (Thursday, April 30th), students will also be dismissed around 12 o'clock, just like today.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent keeps the first notice line in multi-line Korean output", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "📌 내일은 체육복을 입고 등교합니다.",
        "📚 수학 익힘책 32쪽을 풀어 옵니다.",
    ].join("\n");

    assert.equal(sanitizeNoticeContent(raw), raw);
});

test("sanitizeNoticeContent extracts the final notice after Korean analysis and plan text", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "안녕하세요. 저는 초등학교 알림장 문장을 다듬는 보조자입니다.",
        "규칙을 준수하여 최종 알림장 본문만 출력하겠습니다.",
        "",
        "원문 분석:",
        "내일 체육복. 수학 익힘책 32쪽 풀기. 가정통신문 확인.",
        "",
        "다듬기 적용 계획:",
        "1. 원문의 순서와 정보 유지.",
        "2. 어색한 부분을 자연스럽게 수정.",
        "3. 각 항목 앞에 적절한 플랫 이모지를 추가.",
        "",
        "* 내일 체육복 -> (체육복 관련 안내)",
        "* 수학 익힘책 32쪽 풀기 -> (숙제/학습 안내)",
        "* 가정통신문 확인 -> (안내 사항)👕 내일 체육복.",
        "📚 수학 익힘책 32쪽 풀기.",
        "📝 가정통신문 확인.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        "👕 내일 체육복.\n📚 수학 익힘책 32쪽 풀기.\n📝 가정통신문 확인."
    );
});

test("sanitizeNoticeContent removes Korean final-writing preamble before emoji notice body", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "이 내용을 바탕으로 최종 알림장을 작성하겠습니다.👕 내일 체육복 준비.",
        "📚 수학 익힘책 32쪽 풀기.",
        "📝 가정통신문 확인.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        "👕 내일 체육복 준비.\n📚 수학 익힘책 32쪽 풀기.\n📝 가정통신문 확인."
    );
});

test("sanitizeNoticeContent keeps all final emoji paragraphs after Korean planning text", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "안녕하세요. 요청하신 대로 공식적인 가정통신문 문체로 다듬겠습니다.",
        "",
        "원문 분석:",
        "1. 친구의 외모나 특징을 비하하지 않도록 지도했습니다.",
        "2. 전동 킥보드 안전 안내입니다.",
        "",
        "적용 규칙:",
        "- 번호 목록 대신 플랫 이모지를 사용합니다.",
        "- 최종 본문만 출력합니다.",
        "",
        "이 계획에 따라 최종 결과물을 작성하겠습니다.🤝 친구의 외모나 특징을 비하하지 않도록 지도하였습니다. 가정에서도 서로 간의 존중을 배울 수 있도록 함께 지도해 주시기 바랍니다.",
        "",
        "🛴 전동 킥보드와 전기 자전거 이용 시 면허와 안전보호구 착용이 필요합니다. 가정에서도 적극적인 관심과 지도를 부탁드립니다.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "🤝 친구의 외모나 특징을 비하하지 않도록 지도하였습니다. 가정에서도 서로 간의 존중을 배울 수 있도록 함께 지도해 주시기 바랍니다.",
            "",
            "🛴 전동 킥보드와 전기 자전거 이용 시 면허와 안전보호구 착용이 필요합니다. 가정에서도 적극적인 관심과 지도를 부탁드립니다.",
        ].join("\n")
    );
});

test("sanitizeNoticeContent keeps all Korean paragraphs before bilingual separator", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "🤝 친구의 외모나 특징을 비하하지 않도록 지도하였습니다. 가정에서도 서로 간의 존중을 배울 수 있도록 함께 지도해 주시기 바랍니다.",
        "",
        "🛴 전동 킥보드와 전기 자전거 이용 시 면허와 안전보호구 착용이 필요합니다. 가정에서도 적극적인 관심과 지도를 부탁드립니다.",
        "---",
        "🤝 We guided students not to belittle friends' appearance or characteristics.",
        "",
        "🛴 A license and safety gear are required when using electric scooters or electric bicycles.",
    ].join("\n");

    assert.equal(sanitizeNoticeContent(raw), raw);
});

test("sanitizeNoticeContent removes echoed prompt restriction lines", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "응답에는 학부모에게 보낼 한국어 알림장 본문만 포함해 주세요.",
        "본문 첫 줄 앞에 설명, 분석, 라벨을 붙이지 마세요.",
        "첫 글자는 반드시 알림장 본문 이모지 또는 원문 첫 단어로 시작해야 합니다.",
        "다른 언어 출력은 이후 별도 단계에서 처리하므로 여기서는 한국어 본문만 쓰세요.",
        "",
        "🤝 친구의 외모나 특징을 비하하지 않도록 지도하였습니다.",
        "🛴 전동 킥보드 이용 시 안전보호구 착용이 필요합니다.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        "🤝 친구의 외모나 특징을 비하하지 않도록 지도하였습니다.\n🛴 전동 킥보드 이용 시 안전보호구 착용이 필요합니다."
    );
});

test("sanitizeNoticeContent removes emoji-selection commentary from bilingual output", () => {
    const { sanitizeNoticeContent } = loadTsModule("lib/notice-content.ts");
    const raw = [
        "🛴'가 사용되었으므로, 첫 항목에는 다른 적절한 이모지를 사용하고, 전체적으로 일관성을 유지합니다.)",
        "📚 친구의 외모나 특징에 대해 비하하는 언행이 없도록 지도하였으니, 가정에서도 서로 간의 존중을 배울 수 있도록 지도 부탁드립니다.",
        "🛴 전동 킥보드와 전기 자전거 이용 시 면허와 안전보호구 착용이 필요합니다. 가정에서도 적극적인 관심과 지도를 부탁드립니다.",
        "---",
        "Translation must keep the same line count and preserve emojis.",
        "Add flat emojis consistently before each line.",
        "📚 We have guided students not to make comments that belittle a friend's appearance or characteristics. Please continue helping them learn mutual respect at home.",
        "🛴 A license and safety protective gear are required when using electric kickboards or electric bicycles. Please provide active guidance at home.",
    ].join("\n");

    assert.equal(
        sanitizeNoticeContent(raw),
        [
            "📚 친구의 외모나 특징에 대해 비하하는 언행이 없도록 지도하였으니, 가정에서도 서로 간의 존중을 배울 수 있도록 지도 부탁드립니다.",
            "🛴 전동 킥보드와 전기 자전거 이용 시 면허와 안전보호구 착용이 필요합니다. 가정에서도 적극적인 관심과 지도를 부탁드립니다.",
            "---",
            "📚 We have guided students not to make comments that belittle a friend's appearance or characteristics. Please continue helping them learn mutual respect at home.",
            "🛴 A license and safety protective gear are required when using electric kickboards or electric bicycles. Please provide active guidance at home.",
        ].join("\n")
    );
});

test("NoticePlainText sanitizes saved notice content before rendering", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const noticeContent = loadTsModule("lib/notice-content.ts");
    const { NoticePlainText } = loadTsModule("components/NoticePlainText.tsx", {
        require: {
            react: React,
            "react/jsx-runtime": await import("react/jsx-runtime"),
            "@/lib/notice-content": noticeContent,
        },
    });

    const markup = renderToStaticMarkup(
        React.createElement(NoticePlainText, {
            content: "검토\n최종 점검 메시지\n안녕하세요, 학부모님.",
        })
    );

    assert.match(markup, /안녕하세요, 학부모님\./);
    assert.doesNotMatch(markup, /검토/);
    assert.doesNotMatch(markup, /최종 점검 메시지/);
});
