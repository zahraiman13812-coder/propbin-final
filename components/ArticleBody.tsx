type Props = {
  body: string;
};

/**
 * A tiny, dependency-free renderer for the article text. It supports blank
 * line separated paragraphs, `##`/`###` headings and `-` lists. Keeping the
 * renderer local means the admin can write SEO-friendly structured content
 * without adding a Markdown library.
 */
export default function ArticleBody({ body }: Props) {
  const blocks = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return (
      <p className="text-sm leading-9 text-muted">
        متن این مقاله هنوز منتشر نشده است.
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-5 break-words [overflow-wrap:anywhere] [&_img]:h-auto [&_img]:max-w-full [&_iframe]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto">
      {blocks.map((block, index) => {
        if (block.startsWith("### ")) {
          return (
            <h3
              key={index}
              className="break-words pt-2 text-base font-extrabold leading-8 text-foreground sm:text-lg"
            >
              {block.slice(4)}
            </h3>
          );
        }

        if (block.startsWith("## ")) {
          return (
            <h2
              key={index}
              className="break-words pt-3 text-lg font-extrabold leading-9 text-foreground sm:text-2xl"
            >
              {block.slice(3)}
            </h2>
          );
        }

        const lines = block.split("\n");

        if (
          lines.length > 0 &&
          lines.every((line) => line.startsWith("- "))
        ) {
          return (
            <ul
              key={index}
              className="list-disc space-y-2 pr-5 text-sm leading-8 text-muted sm:text-base"
            >
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  {line.slice(2)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={index}
            className="whitespace-pre-wrap break-words text-sm leading-8 text-foreground sm:text-base sm:leading-9"
          >
            {block}
          </p>
        );
      })}
    </div>
  );
}
