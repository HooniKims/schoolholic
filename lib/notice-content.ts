const RESULT_PREFIX_PATTERN =
    /^\s*(?:요약\s*(?:결과|내용)|다듬은\s*내용|수정본|정리\s*결과|최종\s*(?:결과|문안|출력(?:물)?(?:\s*생성)?|알림장\s*본문)|알림장\s*본문|결과)\s*[:：]\s*/i;

const META_LINE_PATTERN =
    /^(?:생각\s*과정(?:\s*시뮬레이션)?|시뮬레이션|목표\s*확인|형식\s*적용|내용\s*추출|상세\s*내용\s*정리|작성\s*계획|검토|검토\s*(?:결과|내용)|최종\s*출력(?:물\s*생성)?|최종\s*점검(?:\s*메시지)?|점검\s*메시지|작성\s*원칙\s*준수(?:\s*여부)?|규칙\s*준수|문체\s*(?:변화|수정|통일)|구조\s*화|구조화|작성\s*방식|수정\s*방향|분석|처리\s*(?:방식|내용)|변경\s*사항|출력\s*규칙|마크다운\s*기호\s*사용\s*금지)(?:\s*[:：].*)?$/i;

const META_PHRASE_PATTERN =
    /(?:생각\s*과정|시뮬레이션|목표\s*확인|형식\s*적용|내용\s*추출|상세\s*내용\s*정리|작성\s*계획|최종\s*출력|최종\s*점검|점검\s*메시지|작성\s*원칙\s*준수|규칙\s*준수|문체\s*변화|구조화|요청한\s*형식|작성한\s*결과입니다|마크다운\s*기호\s*사용\s*금지)/i;

function stripLinePrefix(line: string): string {
    return line
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/^\s*(?:[-*]\s*|\d+[.)]\s*)/, "")
        .trim();
}

function isMetaLine(line: string): boolean {
    const stripped = stripLinePrefix(line);
    if (!stripped) {
        return false;
    }

    if (META_LINE_PATTERN.test(stripped)) {
        return true;
    }

    return stripped.length <= 80 && META_PHRASE_PATTERN.test(stripped);
}

function stripResultPrefix(line: string): string | null {
    const stripped = line.replace(RESULT_PREFIX_PATTERN, "");
    if (stripped === line) {
        return line;
    }

    const trimmed = stripped.trimStart();
    return trimmed ? trimmed : null;
}

export function sanitizeNoticeContent(content?: string | null): string {
    if (!content) {
        return "";
    }

    let cleaned = content.replace(/\r\n/g, "\n");

    cleaned = cleaned.replace(/\s*\([^)]*(글자|문체|검토|수정|다듬기)[^)]*\)\s*/gi, " ");
    cleaned = cleaned.replace(/\s*\[(분석|검토|검증)[^\]]*\]\s*/gi, " ");
    cleaned = cleaned.replace(/^\s*#{1,6}\s+/gm, "");
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
    cleaned = cleaned.replace(/__(.*?)__/g, "$1");
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

    const lines = cleaned
        .split("\n")
        .map((line) => stripResultPrefix(line))
        .filter((line): line is string => line !== null)
        .filter((line) => !isMetaLine(line));

    return lines
        .join("\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
