type NoticePlainTextProps = {
    content: string;
    className?: string;
};

export function NoticePlainText({ content, className }: NoticePlainTextProps) {
    return (
        <div
            className={[
                "whitespace-pre-wrap break-words text-[15px] leading-7 text-gray-800",
                className,
            ].filter(Boolean).join(" ")}
        >
            {content}
        </div>
    );
}
