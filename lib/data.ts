export type Firm = {
  id: string;
  name: string;
  rating: string;
  capital: string;
  profit: string;
  fee: string;
  discount: string;
  code: string;
  color: string;
  description: string;
  payout: string;
  purchaseMethod?: string;
  challenge: string;
  logo?: string;
  logoText?: string;
};

export const firms: Firm[] = [
  {
    id: "ftmo",
    name: "FTMO",
    rating: "4.8",
    capital: "$200,000",
    profit: "80%",
    fee: "$155",
    discount: "10%",
    code: "PROPIN10",
    color: "#f15c55",
    description:
      "یکی از شناخته‌شده‌ترین گزینه‌ها برای معامله‌گران با قوانین شفاف و ابزارهای تحلیلی.",
    payout: "تا ۹۰٪",
    challenge: "دو مرحله‌ای",
    logoText: "FT",
  },
  {
    id: "5ers",
    name: "The 5%ers",
    rating: "4.6",
    capital: "$100,000",
    profit: "100%",
    fee: "$95",
    discount: "15%",
    code: "PROPIN15",
    color: "#b8c9ff",
    description:
      "برنامه‌های رشد حساب و مسیرهای مختلف برای معامله‌گران با تجربه‌های متفاوت.",
    payout: "تا ۱۰۰٪",
    challenge: "چند مسیر",
    logoText: "5%",
  },
  {
    id: "fundednext",
    name: "FundedNext",
    rating: "4.5",
    capital: "$300,000",
    profit: "90%",
    fee: "$59",
    discount: "25%",
    code: "PROPIN25",
    color: "#7d68ff",
    description:
      "پلن‌های متنوع با گزینه‌های مختلف تقسیم سود و اندازه حساب.",
    payout: "تا ۹۰٪",
    challenge: "چند پلن",
    logoText: "FN",
  },
  {
    id: "maven",
    name: "Maven Trading",
    rating: "4.3",
    capital: "$200,000",
    profit: "80%",
    fee: "$49",
    discount: "20%",
    code: "PROPIN20",
    color: "#e5eaf5",
    description:
      "گزینه‌ای برای مقایسه پلن‌ها و انتخاب چالش متناسب با سبک معاملاتی.",
    payout: "تا ۸۰٪",
    challenge: "یک یا دو مرحله‌ای",
    logoText: "M",
  },
  {
    id: "alpha",
    name: "Alpha Capital",
    rating: "4.2",
    capital: "$100,000",
    profit: "90%",
    fee: "$48",
    discount: "30%",
    code: "PROPIN30",
    color: "#4986ff",
    description:
      "حساب‌ها و قوانین متنوع برای بررسی پیش از خرید چالش.",
    payout: "تا ۹۰٪",
    challenge: "چند پلن",
    logoText: "AC",
  },
];

export const articles = [
  {
    slug: "choose-prop-firm",
    category: "راهنمای انتخاب",
    date: "۱۴۰۵/۰۷/۱۰",
    title: "چطور یک شرکت پراپ مناسب انتخاب کنیم؟",
    excerpt:
      "معیارهای مهمی که قبل از خرید چالش باید بررسی کنید؛ از قوانین دراودان تا هزینه و پرداخت سود.",
    read: "۶ دقیقه",
    icon: "◈",
  },
  {
    slug: "ftmo-vs-5ers",
    category: "مقایسه",
    date: "۱۴۰۵/۰۷/۰۶",
    title: "مقایسه FTMO و The 5%ers",
    excerpt:
      "نگاهی خلاصه به مدل چالش، سهم سود و شرایط حساب در دو شرکت شناخته‌شده.",
    read: "۴ دقیقه",
    icon: "⇄",
  },
  {
    slug: "risk-management",
    category: "آموزش",
    date: "۱۴۰۵/۰۶/۲۸",
    title: "مدیریت ریسک در حساب‌های پراپ",
    excerpt:
      "چطور با رعایت محدودیت ضرر روزانه و برنامه معاملاتی، از نقض قوانین جلوگیری کنیم.",
    read: "۷ دقیقه",
    icon: "⌁",
  },
  {
    slug: "drawdown-guide",
    category: "آموزش",
    date: "۱۴۰۵/۰۶/۲۰",
    title: "دراودان روزانه و کلی به زبان ساده",
    excerpt:
      "تفاوت محدودیت افت روزانه و افت کلی و نکاتی که باید در قوانین هر شرکت بخوانید.",
    read: "۵ دقیقه",
    icon: "⌗",
  },
];
