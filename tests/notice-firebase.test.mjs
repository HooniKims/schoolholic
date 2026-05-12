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

function createNoticeFirebaseTestModule(options = {}) {
    const calls = {
        setDoc: [],
    };

    const firestore = {
        doc: (...args) => ({ type: "doc", args }),
        setDoc: async (...args) => {
            calls.setDoc.push(args);
        },
        getDoc: async () => ({
            exists: () => Boolean(options.getDocData),
            data: () => options.getDocData,
        }),
        deleteDoc: async () => undefined,
        collection: (...args) => ({ type: "collection", args }),
        getDocs: async () => ({
            forEach: (callback) => {
                for (const item of options.getDocsData ?? []) {
                    callback({ data: () => item });
                }
            },
        }),
        query: (...args) => ({ type: "query", args }),
        where: (...args) => ({ type: "where", args }),
    };

    const noticeContent = loadTsModule("lib/notice-content.ts");
    const noticeFirebase = loadTsModule("lib/notice-firebase.ts", {
        require: {
            "./firebase": { db: {} },
            "firebase/firestore": firestore,
            "./notice-content": noticeContent,
        },
    });

    return { calls, noticeFirebase };
}

test("saveNote stores teacher-edited summary exactly as entered", async () => {
    const { calls, noticeFirebase } = createNoticeFirebaseTestModule();
    const editedSummary = [
        "안녕하세요, 학부모님.",
        "이 내용을 바탕으로 학생들과 함께 확인했습니다.👕 내일 체육복 준비.",
        "📚 수학 익힘책 32쪽 풀기.",
    ].join("\n");

    await noticeFirebase.saveNote("2026-05-12", "원문", editedSummary, "teacher-1");

    assert.equal(calls.setDoc.length, 1);
    assert.equal(calls.setDoc[0][1].summary, editedSummary);
});

test("getNoteByDate returns saved summary without cutting user content", async () => {
    const savedSummary = [
        "안녕하세요, 학부모님.",
        "이 내용을 바탕으로 학생들과 함께 확인했습니다.👕 내일 체육복 준비.",
        "📚 수학 익힘책 32쪽 풀기.",
    ].join("\n");
    const { noticeFirebase } = createNoticeFirebaseTestModule({
        getDocData: {
            date: "2026-05-12",
            originalContent: "원문",
            summary: savedSummary,
            teacherUid: "teacher-1",
        },
    });

    const result = await noticeFirebase.getNoteByDate("2026-05-12", "teacher-1");

    assert.equal(result.summary, savedSummary);
});
