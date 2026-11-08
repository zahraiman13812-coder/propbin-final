import { requireAdmin } from "@/lib/admin";
import ArticleCreateForm from "@/components/admin/ArticleCreateForm";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requireAdmin();

  return <ArticleCreateForm />;
}