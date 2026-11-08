import { requireAdmin } from "@/lib/admin";
import ArticleEditForm from "@/components/admin/ArticleEditForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditArticlePage({
  params,
}: Props) {
  await requireAdmin();

  const { id } = await params;

  return <ArticleEditForm articleId={id} />;
}