import {
  NextRequest,
  NextResponse,
} from "next/server";

import { isAdmin } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
import {
  getAllThreads,
  deleteSupportThread,
  getThreadForUser,
  markThreadRead,
  sendAdminReply,
  sendUserMessage,
} from "@/lib/support";
import { getCurrentUser, isDemoUser } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

function unreadForUser(
  thread: Awaited<
    ReturnType<typeof getThreadForUser>
  >
) {
  return thread
    ? thread.messages.filter(
        (message) =>
          message.role === "admin" &&
          !message.readByUser
      ).length
    : 0;
}

export async function GET(request: NextRequest) {
  // Legacy clients mark reads through GET; reject cross-site state changes.
  if (request.nextUrl.searchParams.get("markRead") === "1" &&
      request.headers.get("sec-fetch-site") !== "same-origin" && !validOrigin(request)) {
    return error("درخواست نامعتبر است.", 403);
  }
  const admin = await isAdmin();
  const all =
    request.nextUrl.searchParams.get("all") === "1";

  if (all) {
    if (!admin) {
      return error("دسترسی غیرمجاز.", 401);
    }

    const threadId =
      request.nextUrl.searchParams.get("thread");
    const markRead =
      request.nextUrl.searchParams.get("markRead") ===
      "1";

    if (threadId && markRead) {
      await markThreadRead(threadId, "admin");
    }

    const threads = await getAllThreads();
    const unread = threads.reduce(
      (sum, thread) =>
        sum +
        thread.messages.filter(
          (message) =>
            message.role === "user" &&
            !message.readByAdmin
        ).length,
      0
    );

    return NextResponse.json(
      { threads, unread },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return error(
      "برای استفاده از پشتیبانی ابتدا وارد حساب شوید.",
      401
    );
  }

  let thread = await getThreadForUser(user.id);

  const markRead =
    request.nextUrl.searchParams.get("markRead") ===
    "1";

  if (thread && markRead) {
    await markThreadRead(thread.id, "user");
    thread = await getThreadForUser(user.id);
  }

  return NextResponse.json(
    {
      thread,
      user: { name: user.name, email: user.email },
      unread: unreadForUser(thread),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) {
    return error("درخواست نامعتبر است.", 403);
  }

  const body = await request
    .json()
    .catch(() => null);

  const message =
    typeof body?.message === "string"
      ? body.message
      : "";
  const threadId =
    typeof body?.threadId === "string"
      ? body.threadId
      : "";

  try {
    if (threadId) {
      if (!(await isAdmin())) {
        return error("دسترسی غیرمجاز.", 403);
      }

      const thread = await sendAdminReply(
        threadId,
        message
      );

      return NextResponse.json({ ok: true, thread });
    }

    const user = await getCurrentUser();

    if (!user) {
      return error(
        "برای ارسال پیام ابتدا وارد حساب شوید.",
        401
      );
    }

    if (isDemoUser(user)) return error("حساب نمایشی فقط برای مشاهده است.", 403);
    const thread = await sendUserMessage(user, message);

    return NextResponse.json(
      { ok: true, thread },
      { status: 201 }
    );
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "ارسال پیام انجام نشد."
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!validOrigin(request)) return error("درخواست نامعتبر است.", 403);
  try {
    if (!(await isAdmin())) return error("دسترسی غیرمجاز.", 403);
    const body = await request.json().catch(() => null);
    const threadId = typeof body?.threadId === "string" ? body.threadId : "";
    if (!threadId) return error("گفتگو مشخص نشده است.");
    await deleteSupportThread(threadId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Support delete failed:", err);
    return error(err instanceof Error ? err.message : "حذف گفتگو انجام نشد.", 500);
  }
}
