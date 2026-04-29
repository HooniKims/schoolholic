import { Fragment } from "react";
import { sanitizeNoticeContent } from "@/lib/notice-content";

type NoticePlainTextProps = {
    content: string;
    className?: string;
};

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s]+)/gi;
const TRAILING_PUNCTUATION_PATTERN = /[.,!?;:)\]}]+$/;

function normalizeLinkHref(rawUrl: string) {
    const href = rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl;

    try {
        return new URL(href).toString();
    } catch {
        return null;
    }
}

function splitTrailingPunctuation(rawUrl: string) {
    const trailing = rawUrl.match(TRAILING_PUNCTUATION_PATTERN)?.[0] ?? "";
    const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

    return { url, trailing };
}

function renderLineWithLinks(line: string, lineIndex: number) {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    URL_PATTERN.lastIndex = 0;

    for (const match of line.matchAll(URL_PATTERN)) {
        const matchedText = match[0];
        const matchIndex = match.index ?? 0;

        if (matchIndex > lastIndex) {
            parts.push(line.slice(lastIndex, matchIndex));
        }

        const { url, trailing } = splitTrailingPunctuation(matchedText);
        const href = normalizeLinkHref(url);

        if (href) {
            parts.push(
                <a
                    key={`link-${lineIndex}-${matchIndex}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
                >
                    {url}
                </a>
            );
        } else {
            parts.push(matchedText);
        }

        if (trailing) {
            parts.push(trailing);
        }

        lastIndex = matchIndex + matchedText.length;
    }

    if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [line];
}

export function NoticePlainText({ content, className }: NoticePlainTextProps) {
    const lines = sanitizeNoticeContent(content).split("\n");

    return (
        <div
            className={[
                "break-words text-[15px] leading-7 text-gray-800",
                className,
            ].filter(Boolean).join(" ")}
        >
            {lines.map((line, index) => (
                <Fragment key={`line-${index}`}>
                    {renderLineWithLinks(line, index)}
                    {index < lines.length - 1 ? <br /> : null}
                </Fragment>
            ))}
        </div>
    );
}
