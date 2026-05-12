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
const PLANNING_OUTPUT_PATTERN =
    /(?:보조자입니다|원문\s*분석|다듬기\s*적용\s*계획|적용\s*계획|최종\s*결과물|관련\s*안내|숙제\/학습\s*안내|thinking\s*process|analy[sz]e|original\s+text|formatting\s+rules|final\s+(?:output|review|formatting)|self-correction|drafting|refine\s+the|translation\s+must|tone:|output\s+format|apply\s+formatting|construct\s+final)/i;
const PROMPT_RESTRICTION_LINE_PATTERN =
    /^(?:응답에는|본문\s*첫\s*줄|첫\s*글자는|다른\s*언어\s*출력|한국어\s*줄\s*수와\s*순서|---\s*구분선은\s*쓰지|설명\s*,\s*분석\s*,\s*라벨\s*없이|아래\s*한국어\s*알림장\s*본문을\s*영어로\s*번역|원문\s*정보와\s*항목\s*순서는\s*유지|이미\s*문장형으로\s*입력된|번호\s*목록\s*대신|번호\s*목록은\s*그대로|새\s*정보나\s*작성\s*날짜|원문의\s*한국어를\s*물음표|학부모에게\s*보내는\s*공식적인\s*가정통신문|원문\s*문장을\s*그대로\s*반복|이전\s*출력(?:에는|이)|반드시\s*포함해야\s*하는\s*원문)/i;
const ENGLISH_PROMPT_RESTRICTION_LINE_PATTERN =
    /^(?:translation\s+must|the\s+translation\s+must|add\s+flat\s+emojis|preserve\s+emojis|keep\s+the\s+same\s+line\s+count|same\s+line\s+count)/i;
const EMOJI_SELECTION_COMMENTARY_PATTERN =
    /(?:이모지|emoji).*(?:사용|선택|항목|일관성|적절)|(?:사용되었으므로).*(?:항목|이모지|일관성)/i;
const KOREAN_STANDALONE_PREAMBLE_PATTERN =
    /(?:원문이\s*너무\s*비어|이\s*내용을\s*바탕으로\s*최종\s*알림장을\s*작성|한국어\s*본문과\s*영어\s*번문을\s*구분하여\s*출력|최종\s*알림장을\s*작성하겠습니다|결과물을\s*작성하겠습니다)/;

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

function collectNoticeSectionLines(sourceLines: string[], options: { requireKorean?: boolean; requireEmojiStart?: boolean } = {}): string[] {
    const lines: string[] = [];
    let started = false;

    for (const sourceLine of sourceLines) {
        const withoutResultPrefix = stripResultPrefix(sourceLine);
        if (withoutResultPrefix === null) {
            continue;
        }

        const line = stripInlineFinalPrefix(withoutResultPrefix);
        const trimmed = line.trim();

        if (!trimmed) {
            if (started) {
                lines.push("");
            }
            continue;
        }

        if (isMetaLine(line)) {
            continue;
        }

        if (!started) {
            if (options.requireEmojiStart && !EMOJI_PATTERN.test(line)) {
                continue;
            }
            if (options.requireKorean && !/[가-힣]/.test(line)) {
                continue;
            }
            started = true;
        }

        lines.push(line);
    }

    return trimEmptyEdges(lines);
}

function isEmojiNoticeLine(line: string): boolean {
    return EMOJI_PATTERN.test(line.trimStart().slice(0, 4));
}

function normalizeNoticeLineKey(line: string): string {
    return line
        .replace(EMOJI_PATTERN, "")
        .replace(/^\s*(?:\(?\d+\s*(?:번)?\)?[.)]?|[-*])\s*/i, "")
        .replace(/[ \t]+/g, " ")
        .trim()
        .toLowerCase();
}

function dedupeNoticeLines(lines: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const line of lines) {
        if (!line.trim()) {
            if (result.length && result[result.length - 1].trim()) {
                result.push("");
            }
            continue;
        }

        const key = normalizeNoticeLineKey(line);
        if (key && seen.has(key)) {
            continue;
        }

        if (key) {
            seen.add(key);
        }
        result.push(line);
    }

    return trimEmptyEdges(result);
}

function countContentLines(lines: string[]): number {
    return lines.filter((line) => line.trim()).length;
}

function selectNoticeSectionLines(preferredEmojiLines: string[], fallbackLines: string[]): string[] {
    const emojiCount = countContentLines(preferredEmojiLines);
    const fallbackCount = countContentLines(fallbackLines);

    if (!emojiCount) {
        return fallbackLines;
    }

    if (emojiCount >= fallbackCount || fallbackCount > emojiCount * 2) {
        return preferredEmojiLines;
    }

    return fallbackLines;
}

function extractTrailingEmojiNoticeBlocks(sourceLines: string[]): string[] {
    const blocks: string[][] = [];
    let currentBlock: string[] = [];

    const pushCurrentBlock = () => {
        const block = trimEmptyEdges(currentBlock);
        if (block.length) {
            blocks.push(block);
        }
        currentBlock = [];
    };

    for (const sourceLine of sourceLines) {
        const withoutResultPrefix = stripResultPrefix(sourceLine);
        if (withoutResultPrefix === null) {
            continue;
        }

        const line = stripInlineFinalPrefix(withoutResultPrefix);
        if (!line.trim()) {
            pushCurrentBlock();
            continue;
        }

        if (isMetaLine(line)) {
            pushCurrentBlock();
            continue;
        }

        currentBlock.push(line);
    }

    pushCurrentBlock();

    const selectedBlocks: string[][] = [];
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
        const block = blocks[index];
        const contentLines = block.filter((line) => line.trim());
        const isCleanEmojiBlock = contentLines.length > 0 && contentLines.every(isEmojiNoticeLine);

        if (!isCleanEmojiBlock) {
            if (selectedBlocks.length) {
                break;
            }
            continue;
        }

        selectedBlocks.unshift(block);
    }

    return dedupeNoticeLines(selectedBlocks.flatMap((block, index) => (
        index === 0 ? block : ["", ...block]
    )));
}

function extractCleanTrailingEmojiNoticeOutput(cleaned: string): string[] | null {
    const sourceLines = cleaned
        .split("\n")
        .map((line) => stripResultPrefix(line))
        .filter((line): line is string => line !== null);
    const lines = extractTrailingEmojiNoticeBlocks(sourceLines);

    return lines.length ? lines : null;
}

function extractTrailingNoticeLines(sourceLines: string[]): string[] {
    const finalLines: string[] = [];

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

        if (!finalLines.length && !/[가-힣A-Za-z0-9]/.test(line)) {
            continue;
        }

        finalLines.unshift(line);
    }

    return trimEmptyEdges(finalLines);
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
    if (!PLANNING_OUTPUT_PATTERN.test(cleaned)) {
        return null;
    }

    const sourceLines = cleaned
        .split("\n")
        .map((line) => stripResultPrefix(line))
        .filter((line): line is string => line !== null);
    const finalLines = collectNoticeSectionLines(sourceLines, { requireEmojiStart: true });
    if (finalLines.length) {
        return finalLines;
    }

    const trailingLines = extractTrailingNoticeLines(sourceLines);
    return trailingLines.length ? trailingLines : null;
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

    const previousSeparatorIndex = sourceLines
        .slice(0, separatorIndex)
        .reduce((lastIndex, line, index) => (SEPARATOR_PATTERN.test(line) ? index : lastIndex), -1);
    const koreanSourceLines = sourceLines.slice(previousSeparatorIndex + 1, separatorIndex);
    const koreanSegment = koreanSourceLines.join("\n");
    const fallbackKoreanLines =
        extractFinalEmojiNoticeOutput(koreanSegment) ??
        collectNoticeSectionLines(koreanSourceLines, { requireKorean: true });
    const koreanLines = selectNoticeSectionLines(
        extractTrailingEmojiNoticeBlocks(koreanSourceLines),
        fallbackKoreanLines
    );

    const englishSourceLines = sourceLines.slice(separatorIndex + 1);
    const englishLines = selectNoticeSectionLines(
        extractTrailingEmojiNoticeBlocks(englishSourceLines),
        collectNoticeSectionLines(englishSourceLines)
    );

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

    if (PROMPT_RESTRICTION_LINE_PATTERN.test(stripped)) {
        return true;
    }

    if (ENGLISH_PROMPT_RESTRICTION_LINE_PATTERN.test(stripped)) {
        return true;
    }

    if (EMOJI_SELECTION_COMMENTARY_PATTERN.test(stripped)) {
        return true;
    }

    if (stripped.length <= 140 && KOREAN_STANDALONE_PREAMBLE_PATTERN.test(stripped)) {
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

    cleaned = cleaned.replace(/([.!?])(?=[\u{1F300}-\u{1FAFF}])/gu, "$1\n");
    cleaned = cleaned.replace(/\s*\([^)]*(글자|문체|검토|수정|다듬기)[^)]*\)\s*/gi, " ");
    cleaned = cleaned.replace(/\s*\[(분석|검토|검증)[^\]]*\]\s*/gi, " ");
    cleaned = cleaned.replace(/^\s*#{1,6}\s+/gm, "");
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
    cleaned = cleaned.replace(/__(.*?)__/g, "$1");
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

    const lines =
        extractBilingualFinalOutput(cleaned) ??
        extractFinalEmojiNoticeOutput(cleaned) ??
        extractCleanTrailingEmojiNoticeOutput(cleaned) ??
        buildSanitizedLines(cleaned);

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
