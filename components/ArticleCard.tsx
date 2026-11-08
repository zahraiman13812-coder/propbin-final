
import Link from "next/link";
import Image from "next/image";
import type { Article } from "@/lib/content";
import { isValidArticleImage } from "@/lib/article-image";
export default function ArticleCard({
  article,
}: {
  article: Article;
}) {
  const image = article.image || "";

  const hasImage = isValidArticleImage(image);

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border-theme bg-surface transition-all hover:border-primary/40 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-surface-secondary">
        {hasImage ? (
          <Image
            src={image}
            alt={article.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-2 sm:p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-surface-secondary">
            <span className="text-5xl font-extrabold text-primary">
              {article.icon || "PB"}
            </span>
          </div>
        )}

      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="max-w-full break-words rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {article.category}
          </span>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>{article.date}</span>
          <span>{article.read} مطالعه</span>
        </div>

        <h3 className="mt-3 whitespace-normal break-words [overflow-wrap:anywhere] text-base font-extrabold leading-8 text-foreground group-hover:text-primary sm:text-lg">
          {article.title}
        </h3>

        <p className="mt-3 whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm leading-7 text-muted">
          {article.excerpt}
        </p>

        <span className="mt-auto pt-6 text-sm font-semibold text-primary">
          مطالعه مقاله ←
        </span>
      </div>
    </Link>
  );
}
