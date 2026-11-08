
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { validOrigin } from "@/lib/guard";

import {
  getCurrentUser,
  isDemoUser,
  updateUserName,
  userCookie,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  return NextResponse.json(
    {
      user,
      isDemo: isDemoUser(user),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PATCH(
  request: NextRequest
) {
  if (!validOrigin(request)) {
    return NextResponse.json(
      { error: "درخواست نامعتبر است." },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "ابتدا وارد حساب شوید.",
      },
      { status: 401 }
    );
  }

  if (isDemoUser(user)) {
    return NextResponse.json(
      {
        error:
          "حساب نمایشی فقط برای مشاهده است.",
      },
      { status: 403 }
    );
  }

  const body = await request
    .json()
    .catch(() => null);

  if (
    typeof body?.name !== "string" ||
    body.name.trim().length < 2 ||
    body.name.trim().length > 80
  ) {
    return NextResponse.json(
      {
        error:
          "نام باید بین ۲ تا ۸۰ کاراکتر باشد.",
      },
      { status: 400 }
    );
  }

  try {
    const updated = await updateUserName(
      user.id,
      body.name
    );

    return NextResponse.json({
      ok: true,
      user: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "ویرایش حساب ناموفق بود.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  if (!validOrigin(request)) {
    return NextResponse.json(
      {
        error:
          "درخواست نامعتبر است.",
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.set(
    userCookie.name,
    "",
    {
      ...userCookie.options,
      maxAge: 0,
    }
  );

  return response;
}
