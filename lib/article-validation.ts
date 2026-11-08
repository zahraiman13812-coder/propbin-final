
import "server-only";

import type {
  CreateArticleInput,
  UpdateArticleInput,
} from "@/lib/article-service";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateText(
  value: unknown,
  fieldName: string,
  maxLength: number,
  required = false
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} باید متن باشد.`);
  }

  const text = value.trim();

  if (required && !text) {
    throw new Error(`${fieldName} الزامی است.`);
  }

  if (text.length > maxLength) {
    throw new Error(
      `${fieldName} نباید بیش از ${maxLength} کاراکتر باشد.`
    );
  }

  return text;
}

function validateUrl(
  value: string,
  fieldName: string
): string {
  if (!value) return "";

  // آدرس داخلی تصاویر مجاز است
  if (
    fieldName === "تصویر" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      throw new Error();
    }

    if (url.username || url.password) {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error(`${fieldName} آدرس معتبری نیست.`);
  }
}

export function validateArticleInput(
  input: CreateArticleInput,
  partial = false
): CreateArticleInput {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error("اطلاعات مقاله معتبر نیست.");
  }

  const output: Record<string, string> = {};

  const fields = {
    title: {
      label: "عنوان مقاله",
      max: 200,
      required: true,
    },
    slug: {
      label: "اسلاگ",
      max: 160,
      required: true,
    },
    excerpt: {
      label: "خلاصه مقاله",
      max: 500,
      required: false,
    },
    body: {
      label: "متن مقاله",
      max: 500000,
      required: false,
    },
    image: {
      label: "تصویر",
      max: 2048,
      required: false,
    },
    category: {
      label: "دسته‌بندی",
      max: 100,
      required: false,
    },
    author: {
      label: "نویسنده",
      max: 150,
      required: false,
    },
    seoTitle: {
      label: "عنوان سئو",
      max: 200,
      required: false,
    },
    seoDescription: {
      label: "توضیحات سئو",
      max: 500,
      required: false,
    },
    keywords: {
      label: "کلمات کلیدی",
      max: 1000,
      required: false,
    },
    canonicalUrl: {
      label: "Canonical",
      max: 2048,
      required: false,
    },
  } as const;

  for (const key of Object.keys(fields) as Array<
    keyof typeof fields
  >) {
    const value = input[key];

    if (value === undefined) {
      if (!partial && fields[key].required) {
        throw new Error(`${fields[key].label} الزامی است.`);
      }
      continue;
    }

    output[key] = validateText(
      value,
      fields[key].label,
      fields[key].max,
      fields[key].required
    );
  }

  if (output.slug !== undefined) {
    output.slug = output.slug.toLowerCase();

    if (!SLUG_PATTERN.test(output.slug)) {
      throw new Error(
        "اسلاگ فقط می‌تواند شامل حروف کوچک انگلیسی، اعداد و خط تیره باشد."
      );
    }
  }

  if (output.image) {
    output.image = validateUrl(
      output.image,
      "تصویر"
    );
  }

  if (output.canonicalUrl) {
    output.canonicalUrl = validateUrl(
      output.canonicalUrl,
      "Canonical"
    );
  }

  return output as CreateArticleInput;
}

export function validateArticleUpdate(
  input: UpdateArticleInput
): UpdateArticleInput {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error("اطلاعات ویرایش معتبر نیست.");
  }

  if (Object.keys(input).length === 0) {
    throw new Error("هیچ تغییری ارسال نشده است.");
  }

  return validateArticleInput(
    input as CreateArticleInput,
    true
  );
}
