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
