const RESULT_PREFIX_PATTERN =
    /^\s*(?:요약\s*(?:결과|내용)|다듬은\s*내용|수정본|정리\s*결과|최종\s*(?:결과|문안|출력(?:물)?(?:\s*생성)?|알림장\s*본문)|알림장\s*본문|결과|generation|generated\s*output)\s*[:：.]?\s*/i;

const META_LINE_PATTERN =
    /^(?:생성|생각\s*과정(?:\s*시뮬레이션)?|시뮬레이션|목표\s*확인|형식\s*적용|내용\s*추출|상세\s*내용\s*정리|작성\s*계획|검토|검토\s*(?:결과|내용)|최종\s*출력(?:물\s*생성)?|최종\s*점검(?:\s*메시지)?|점검\s*메시지|작성\s*원칙\s*준수(?:\s*여부)?|규칙\s*준수|문체\s*(?:변화|수정|통일)|구조\s*화|구조화|작성\s*방식|수정\s*방향|분석|처리\s*(?:방식|내용)|변경\s*사항|출력\s*규칙|마크다운\s*기호\s*사용\s*금지|한국어\s*(?:본문\s*)?다듬기|영어\s*(?:번역\s*)?다듬기)(?:\s*[:：.]?.*)?$/i;

const META_PHRASE_PATTERN =
    /(?:생성|생각\s*과정|시뮬레이션|목표\s*확인|형식\s*적용|내용\s*추출|상세\s*내용\s*정리|작성\s*계획|최종\s*출력|최종\s*점검|점검\s*메시지|작성\s*원칙\s*준수|규칙\s*준수|문체\s*변화|구조화|요청한\s*형식|작성한\s*결과입니다|마크다운\s*기호\s*사용\s*금지|한국어\s*(?:본문\s*)?다듬기|영어\s*(?:번역\s*)?다듬기)/i;

const ENGLISH_META_LINE_PATTERN =
    /^(?:thinking\s*process|analy[sz]e(?:\s+the)?(?:\s+request|\s+original\s+text)?|role|goal|output\s+requirement|context|date\s+reference|refine(?:\s+the)?(?:\s+korean\s+text|\s+english\s+translation)?|translate(?:\s+and\s+refine)?|final\s+formatting\s+check|construct\s+final\s+output|drafting\s+polish|self-correction|final\s+output|maintain\s+structure|add\s+flat\s+emojis|include\s+the\s+separator)(?:\b|[:：.]|$)/i;

const ENGLISH_FINAL_OUTPUT_PATTERN =
    /^(?:construct\s+final\s+output|final\s+output)(?:\b|[:：.]|$)/i;

const ENGLISH_FINAL_OUTPUT_PREFIX_PATTERN =
    /^(?:construct\s+final\s+output|final\s+output)(?:[:：.]\s*|\b)?/i;

const LEADING_PARENTHETICAL_PATTERN = /^\([^)]*\)\s*/;
const INLINE_FINAL_DRAFTING_PREFIX_PATTERN =
    /^\s*\*?\s*\((?:drafting[^)]*final\s+response[^)]*|self-correction[^)]*)\)\*?\s*[:：]?\s*/i;
const SEPARATOR_PATTERN = /^\s*---\s*$/;
const BROKEN_LEADING_EMOJI_PATTERN = /^[\uFFFD]{1,4}\s*/;
const ORPHAN_VARIATION_SELECTOR_PATTERN = /^[\uFE0E\uFE0F\s]+/;
const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}]/u;
const KOREAN_INLINE_META_PREFIX_PATTERN = /^(?:생성|한국어\s*본문\s*다듬기|영어\s*번역\s*다듬기)\s*[:：.]?\s*/i;
const KOREAN_REVIEW_PREAMBLE_PATTERN =
    /(?:최종\s*검토|규칙\s*준수|정보\s*유지|형식\s*준수|이모지\s*사용|한국어\s*본문|영어\s*번(?:역|문)|구분하여\s*출력|본문\s*다듬기|번역\s*다듬기|출력)/;
const KOREAN_FREEFORM_PREAMBLE_PATTERN =
    /(?:따라서|원문|형식|지침|다듬|변경|유지|존중|진행|요청|비어\s*있어|추가\s*정보|출력|결과|바탕|작성하겠습니다)/;
const KOREAN_PLANNING_OUTPUT_PATTERN =
    /(?:보조자입니다|원문\s*분석|다듬기\s*적용\s*계획|적용\s*계획|최종\s*결과물|관련\s*안내|숙제\/학습\s*안내)/;

function stripLinePrefix(line: string): string {
    return line
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/^\s*(?:[-*]\s*|>\s*|\d+[.)]\s*)/, "")
        .trim();
}

function stripEnglishMetaPrefix(line: string): string | null {
    const stripped = stripLinePrefix(line);
    if (!ENGLISH_META_LINE_PATTERN.test(stripped)) {
        return line;
    }

    if (!ENGLISH_FINAL_OUTPUT_PATTERN.test(stripped)) {
        return null;
    }

    let suffix = stripped.replace(ENGLISH_FINAL_OUTPUT_PREFIX_PATTERN, "").trim();
    while (LEADING_PARENTHETICAL_PATTERN.test(suffix)) {
        suffix = suffix.replace(LEADING_PARENTHETICAL_PATTERN, "").trim();
    }

    if (/[가-힣A-Za-z]/.test(suffix) && !ENGLISH_META_LINE_PATTERN.test(suffix)) {
        return suffix;
    }

    return null;
}

function normalizeLeadingDecorations(line: string): string {
    const withoutOrphanSelectors = line.replace(ORPHAN_VARIATION_SELECTOR_PATTERN, "");

    if (!BROKEN_LEADING_EMOJI_PATTERN.test(withoutOrphanSelectors)) {
        return withoutOrphanSelectors;
    }

    const content = withoutOrphanSelectors.replace(BROKEN_LEADING_EMOJI_PATTERN, "").trimStart();
    return content ? `📌 ${content}` : "";
}

function stripLeadingEnglishPreambleBeforeKorean(line: string): string {
    const hangulIndex = line.search(/[가-힣]/);
    if (hangulIndex <= 0) {
        return line;
    }

    const prefix = line.slice(0, hangulIndex);
    const emojiMatch = prefix.match(EMOJI_PATTERN);
    const startIndex = emojiMatch?.index ?? hangulIndex;

    if (/^[\s"'()*.,:;!?A-Za-z-]+$/.test(prefix) || emojiMatch) {
        return line.slice(startIndex).trimStart();
    }

    return line;
}

function stripReviewPreambleBeforeEmojiBody(line: string): string {
    const emojiMatch = line.match(EMOJI_PATTERN);
    if (emojiMatch?.index === undefined || emojiMatch.index <= 0) {
        return line;
    }

    const prefix = line.slice(0, emojiMatch.index);
    const suffix = line.slice(emojiMatch.index);

    if (KOREAN_REVIEW_PREAMBLE_PATTERN.test(prefix) && /[가-힣]/.test(suffix)) {
        return suffix.trimStart();
    }

    return line;
}

function stripFreeformPreambleBeforeEmojiBody(line: string): string {
    const emojiMatch = line.match(EMOJI_PATTERN);
    if (emojiMatch?.index === undefined || emojiMatch.index <= 0) {
        return line;
    }

    const prefix = line.slice(0, emojiMatch.index);
    const suffix = line.slice(emojiMatch.index);

    if (KOREAN_FREEFORM_PREAMBLE_PATTERN.test(prefix) && /[가-힣A-Za-z0-9?]/.test(suffix)) {
        return suffix.trimStart();
    }

    return line;
}

function stripPlanningPrefixBeforeEmojiBody(line: string): string {
    const emojiMatch = line.match(EMOJI_PATTERN);
    if (emojiMatch?.index === undefined || emojiMatch.index <= 0) {
        return line;
    }

    const prefix = line.slice(0, emojiMatch.index);
    const suffix = line.slice(emojiMatch.index);

    if (/(?:->|→)/.test(prefix) && /[가-힣A-Za-z0-9]/.test(suffix)) {
        return suffix.trimStart();
    }

    return line;
}

function stripKoreanInlineMetaPrefix(line: string): string {
    let stripped = line;

    while (KOREAN_INLINE_META_PREFIX_PATTERN.test(stripped)) {
        stripped = stripped.replace(KOREAN_INLINE_META_PREFIX_PATTERN, "").trimStart();
    }

    return stripped;
}

function trimEmptyEdges(lines: string[]): string[] {
    let start = 0;
    let end = lines.length;

    while (start < end && !lines[start].trim()) {
        start += 1;
    }

    while (end > start && !lines[end - 1].trim()) {
        end -= 1;
    }

    return lines.slice(start, end);
}

function stripInlineFinalPrefix(line: string): string {
    const withoutResultPrefix = stripResultPrefix(line) ?? "";
    const stripped = stripLinePrefix(withoutResultPrefix)
        .replace(INLINE_FINAL_DRAFTING_PREFIX_PATTERN, "")
        .trim();
    const maybeFinalOutput = stripEnglishMetaPrefix(stripped);
    const withoutFinalPrefix = maybeFinalOutput === null ? stripped : maybeFinalOutput;

    return stripLeadingEnglishPreambleBeforeKorean(
        stripFreeformPreambleBeforeEmojiBody(
            stripReviewPreambleBeforeEmojiBody(
                stripPlanningPrefixBeforeEmojiBody(
                    normalizeLeadingDecorations(stripKoreanInlineMetaPrefix(withoutFinalPrefix)).trim()
                )
            )
        )
    );
}

function extractFinalEmojiNoticeOutput(cleaned: string): string[] | null {
    if (!KOREAN_PLANNING_OUTPUT_PATTERN.test(cleaned)) {
        return null;
    }

    const finalLines: string[] = [];
    const sourceLines = cleaned
        .split("\n")
        .map((line) => stripResultPrefix(line))
        .filter((line): line is string => line !== null);

    for (let i = sourceLines.length - 1; i >= 0; i -= 1) {
        const line = stripInlineFinalPrefix(sourceLines[i]);
        if (!line.trim()) {
            if (finalLines.length) {
                break;
            }
            continue;
        }

        if (isMetaLine(line)) {
            if (finalLines.length) {
                break;
            }
            continue;
        }

        if (EMOJI_PATTERN.test(line) && /[가-힣A-Za-z0-9]/.test(line)) {
            finalLines.unshift(line);
            continue;
        }

        if (finalLines.length) {
            break;
        }
    }

    return finalLines.length ? finalLines : null;
}

function extractBilingualFinalOutput(cleaned: string): string[] | null {
    const sourceLines = cleaned
        .split("\n")
        .map((line) => stripResultPrefix(line))
        .filter((line): line is string => line !== null);
    const separatorIndex = sourceLines.reduce(
        (lastIndex, line, index) => (SEPARATOR_PATTERN.test(line) ? index : lastIndex),
        -1
    );

    if (separatorIndex < 0) {
        return null;
    }

    const koreanLines: string[] = [];
    for (let i = separatorIndex - 1; i >= 0; i -= 1) {
        if (SEPARATOR_PATTERN.test(sourceLines[i])) {
            break;
        }

        const line = stripInlineFinalPrefix(sourceLines[i]);
        if (!line.trim()) {
            if (koreanLines.length) {
                break;
            }
            continue;
        }

        if (isMetaLine(line)) {
            if (koreanLines.length) {
                break;
            }
            continue;
        }

        if (!koreanLines.length && !/[가-힣]/.test(line)) {
            continue;
        }

        koreanLines.unshift(line);
    }

    const englishLines = sourceLines
        .slice(separatorIndex + 1)
        .map((line) => stripInlineFinalPrefix(line))
        .filter((line) => !isMetaLine(line));

    const trimmedKorean = trimEmptyEdges(koreanLines);
    const trimmedEnglish = trimEmptyEdges(englishLines);

    if (!trimmedKorean.length || !trimmedEnglish.length) {
        return null;
    }

    return [...trimmedKorean, "---", ...trimmedEnglish];
}

function buildSanitizedLines(cleaned: string): string[] {
    const lines: string[] = [];
    let sawEnglishMetaBlock = false;
    let foundEnglishFinalOutput = false;

    for (const rawLine of cleaned.split("\n")) {
        const withoutResultPrefix = stripResultPrefix(rawLine);
        if (withoutResultPrefix === null) {
            continue;
        }

        const stripped = stripLinePrefix(withoutResultPrefix);
        const isEnglishMeta = ENGLISH_META_LINE_PATTERN.test(stripped);

        if (isEnglishMeta) {
            sawEnglishMetaBlock = true;

            const maybeBody = stripEnglishMetaPrefix(withoutResultPrefix);
            if (maybeBody) {
                foundEnglishFinalOutput = true;
                lines.push(maybeBody);
            } else if (ENGLISH_FINAL_OUTPUT_PATTERN.test(stripped)) {
                foundEnglishFinalOutput = true;
            }

            continue;
        }

        if (sawEnglishMetaBlock && !foundEnglishFinalOutput) {
            continue;
        }

        if (!isMetaLine(withoutResultPrefix)) {
            lines.push(withoutResultPrefix);
        }
    }

    if (sawEnglishMetaBlock && !foundEnglishFinalOutput && !lines.length) {
        return cleaned
            .split("\n")
            .map((line) => stripResultPrefix(line))
            .filter((line): line is string => line !== null)
            .filter((line) => !isMetaLine(line));
    }

    return lines;
}

function isMetaLine(line: string): boolean {
    const stripped = stripLinePrefix(line);
    if (!stripped) {
        return false;
    }

    if (ENGLISH_META_LINE_PATTERN.test(stripped)) {
        return true;
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

    const lines = extractBilingualFinalOutput(cleaned) ?? extractFinalEmojiNoticeOutput(cleaned) ?? buildSanitizedLines(cleaned);

    return lines
        .join("\n")
        .split("\n")
        .map((line) => normalizeLeadingDecorations(line))
        .map((line) => stripFreeformPreambleBeforeEmojiBody(stripReviewPreambleBeforeEmojiBody(line)))
        .join("\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
