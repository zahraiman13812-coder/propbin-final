export type RafflePrize = {
  id: string;
  label: string;
  description: string;
  color: string;
  weight: number;
  code?: string;
};

export type RaffleSpin = {
  id: string;
  userId: string;
  name: string;
  email: string;
  prizeId: string;
  prizeLabel: string;
  prizeCode?: string;
  createdAt: string;
};

export type RaffleDraw = {
  id: string;
  month: string;
  userId: string;
  name: string;
  email: string;
  prizeId: string;
  prizeLabel: string;
  createdAt: string;
};

export type Raffle = {
  enabled: boolean;
  title: string;
  description: string;
  terms: string;
  prizes: RafflePrize[];
  spins: RaffleSpin[];
  draws: RaffleDraw[];
  updatedAt: string;
};

export type PublicWinner = {
  id: string;
  name: string;
  prizeLabel: string;
  createdAt: string;
  source: "spin" | "draw";
};

export type PublicRaffle = {
  enabled: boolean;
  title: string;
  description: string;
  terms: string;
  prizes: RafflePrize[];
  recentWinners: PublicWinner[];
  totalSpins: number;
  totalDraws: number;
  updatedAt: string;
};

const COLORS = [
  "#008cff",
  "#7c3aed",
  "#e11d48",
  "#0d9488",
  "#f59e0b",
  "#18d9ff",
  "#4986ff",
  "#f15c55",
];

export const defaultRaffle: Raffle = {
  enabled: true,
  title: "گردونه شانس پراپ‌بین",
  description:
    "هر ماه یک شانس برای دریافت هدیه پراپ و تخفیف ویژه داشته باش. برای چرخاندن گردونه ابتدا وارد حساب کاربری شو.",
  terms:
    "هر کاربر در هر ماه میلادی فقط یک بار می‌تواند گردونه را بچرخاند. جوایز پس از تأیید مدیر و هماهنگی با پشتیبانی تحویل داده می‌شوند.",
  prizes: [
    {
      id: "prize-discount-25",
      label: "کد تخفیف ۲۵٪",
      description: "کد تخفیف اختصاصی برای خرید چالش",
      color: "#7c3aed",
      weight: 1,
    },
    {
      id: "prize-discount-20",
      label: "کد تخفیف ۲۰٪",
      description: "تخفیف ویژه یکی از شرکت‌های پراپ",
      color: "#008cff",
      weight: 1,
    },
    {
      id: "prize-consult",
      label: "مشاوره انتخاب پراپ",
      description: "یک جلسه مشاوره کوتاه با تیم پراپ‌بین",
      color: "#0d9488",
      weight: 1,
    },
    {
      id: "prize-analysis",
      label: "تحلیل حساب رایگان",
      description: "بررسی رایگان ریسک و مدیریت سرمایه",
      color: "#e11d48",
      weight: 1,
    },
    {
      id: "prize-discount-30",
      label: "کد تخفیف ۳۰٪",
      description: "بهترین جایزه این دوره گردونه",
      color: "#f59e0b",
      weight: 1,
    },
    {
      id: "prize-gift",
      label: "هدیه ویژه پراپ‌بین",
      description: "یک هدیه منتخب از طرف تیم پراپ‌بین",
      color: "#18d9ff",
      weight: 1,
    },
  ],
  spins: [],
  draws: [],
  updatedAt: new Date(0).toISOString(),
};

function text(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function hex(value: unknown, fallback: string) {
  return typeof value === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

function dateString(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? fallback
    : parsed.toISOString();
}

export function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

export function normalizeRaffle(value: unknown): Raffle {
  if (!value || typeof value !== "object") {
    return structuredClone(defaultRaffle);
  }

  const source = value as Record<string, unknown>;

  const prizesSource = Array.isArray(source.prizes)
    ? source.prizes.slice(0, 12)
    : [];

  const prizes: RafflePrize[] = prizesSource
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as Record<string, unknown>;
      const label = text(item.label, 80);

      if (!label) return null;

      return {
        id: text(item.id, 50) || `prize-${index + 1}`,
        label,
        description: text(item.description, 200),
        color: hex(item.color, COLORS[index % COLORS.length]),
        code: text(item.code, 100),
        weight: Math.min(
          20,
          Math.max(
            1,
            Number.isInteger(item.weight)
              ? Number(item.weight)
              : 1
          )
        ),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const spinsSource = Array.isArray(source.spins)
    ? source.spins.slice(0, 1000)
    : [];

  const spins: RaffleSpin[] = spinsSource
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as Record<string, unknown>;
      const userId = text(item.userId, 100);

      if (!userId) return null;

      return {
        id: text(item.id, 80) || userId,
        userId,
        name: text(item.name, 80),
        email: text(item.email, 254),
        prizeId: text(item.prizeId, 100),
        prizeLabel: text(item.prizeLabel, 100),
        prizeCode: text(item.prizeCode, 100),
        createdAt: dateString(
          item.createdAt,
          new Date(0).toISOString()
        ),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const drawsSource = Array.isArray(source.draws)
    ? source.draws.slice(0, 1000)
    : [];

  const draws: RaffleDraw[] = drawsSource
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as Record<string, unknown>;
      const userId = text(item.userId, 100);

      if (!userId) return null;

      const createdAt = dateString(
        item.createdAt,
        new Date(0).toISOString()
      );

      return {
        id: text(item.id, 80) || userId,
        month:
          text(item.month, 20) ||
          monthKey(new Date(createdAt)),
        userId,
        name: text(item.name, 80),
        email: text(item.email, 254),
        prizeId: text(item.prizeId, 100),
        prizeLabel: text(item.prizeLabel, 100),
        createdAt,
      };
    })
    .filter((item): item is RaffleDraw => Boolean(item));

  return {
    enabled: source.enabled !== false,
    title:
      text(source.title, 100) || defaultRaffle.title,
    description:
      text(source.description, 500) ||
      defaultRaffle.description,
    terms:
      text(source.terms, 1000) ||
      defaultRaffle.terms,
    prizes: prizes.length ? prizes : structuredClone(defaultRaffle.prizes),
    spins,
    draws,
    updatedAt: dateString(
      source.updatedAt,
      new Date(0).toISOString()
    ),
  };
}

export function maskName(name: string) {
  const clean = name.trim();
  if (!clean) return "کاربر پراپ‌بین";

  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0].slice(0, 12)}***`;
  }

  return `${parts[0]} ${parts[parts.length - 1].slice(0, 1)}.`;
}

export function publicRaffle(raffle: Raffle): PublicRaffle {
  const winners: PublicWinner[] = [
    ...raffle.spins.map((spin) => ({
      id: spin.id,
      name: spin.name,
      prizeLabel: spin.prizeLabel,
      createdAt: spin.createdAt,
      source: "spin" as const,
    })),
    ...raffle.draws.map((draw) => ({
      id: draw.id,
      name: draw.name,
      prizeLabel: draw.prizeLabel,
      createdAt: draw.createdAt,
      source: "draw" as const,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 8)
    .map((winner) => ({
      ...winner,
      name: maskName(winner.name),
    }));

  return {
    enabled: raffle.enabled,
    title: raffle.title,
    description: raffle.description,
    terms: raffle.terms,
    prizes: raffle.prizes.map(({ code, ...prize }) => prize),
    recentWinners: winners,
    totalSpins: raffle.spins.length,
    totalDraws: raffle.draws.length,
    updatedAt: raffle.updatedAt,
  };
}

export function totalPrizeWeight(
  prizes: RafflePrize[]
) {
  return prizes.reduce(
    (sum, prize) =>
      sum + Math.max(1, Number(prize.weight) || 1),
    0
  );
}

/**
 * `roll` must be in [0, totalPrizeWeight(prizes)). The server generates it
 * with crypto.randomInt; keeping the mapping here makes it testable.
 */
export function pickPrizeIndex(
  prizes: RafflePrize[],
  roll: number
) {
  let remaining = Math.max(0, roll);

  for (let index = 0; index < prizes.length; index += 1) {
    const weight = Math.max(
      1,
      Number(prizes[index].weight) || 1
    );

    if (remaining < weight) return index;
    remaining -= weight;
  }

  return 0;
}

export function isRafflePrize(
  value: unknown
): value is RafflePrize {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    typeof item.color === "string" &&
    typeof item.weight === "number"
  );
}
