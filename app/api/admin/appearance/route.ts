
import {
  NextRequest,
  NextResponse,
} from "next/server";
import { revalidatePath } from "next/cache";

import {
  getContent,
  updateContent,
} from "@/lib/content";

import { isAdmin } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";

import {
  parseNavigation,
  parseHomeSections,
  isSafeSiteImage,
} from "@/lib/site-ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "دسترسی غیرمجاز" },
      { status: 401 }
    );
  }

  const content = await getContent();

  return NextResponse.json(
    {
      settings: content.settings,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PUT(request: NextRequest) {
  if (
    !validOrigin(request) ||
    !(await isAdmin())
  ) {
    return NextResponse.json(
      { error: "دسترسی غیرمجاز" },
      { status: 403 }
    );
  }

  const body = await request
    .json()
    .catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    typeof body.logoUrl !== "string" ||
    typeof body.heroImageUrl !== "string" ||
    typeof body.navigationJson !== "string" ||
    typeof body.homeSectionsJson !== "string"
  ) {
    return NextResponse.json(
      { error: "اطلاعات ظاهری نامعتبر است." },
      { status: 400 }
    );
  }

  if (
    !isSafeSiteImage(body.logoUrl) ||
    (
      body.heroImageUrl !== "" &&
      !isSafeSiteImage(body.heroImageUrl)
    )
  ) {
    return NextResponse.json(
      { error: "مسیر تصویر معتبر نیست." },
      { status: 400 }
    );
  }

  let rawNavigation: unknown;
  let rawSections: unknown;

  try {
    rawNavigation = JSON.parse(body.navigationJson);
    rawSections = JSON.parse(body.homeSectionsJson);
  } catch {
    return NextResponse.json(
      { error: "ساختار منو نامعتبر است." },
      { status: 400 }
    );
  }

  if (
    !Array.isArray(rawNavigation) ||
    rawNavigation.length > 12 ||
    !Array.isArray(rawSections) ||
    rawSections.length > 12
  ) {
    return NextResponse.json(
      { error: "تعداد آیتم‌ها نامعتبر است." },
      { status: 400 }
    );
  }

  const navigation = parseNavigation(
    body.navigationJson
  );

  const sections = parseHomeSections(
    body.homeSectionsJson
  );

  if (navigation.length !== rawNavigation.length ||
      sections.length !== rawSections.length) {
    return NextResponse.json(
      { error: "یکی از لینک‌ها یا بخش‌ها نامعتبر است." },
      { status: 400 }
    );
  }

  await updateContent((content) => {
    content.settings.logoUrl = body.logoUrl;
    content.settings.heroImageUrl =
      body.heroImageUrl;

    content.settings.navigationJson =
      JSON.stringify(navigation);

    content.settings.homeSectionsJson =
      JSON.stringify(sections);
  });

  revalidatePath("/");
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true });
}
