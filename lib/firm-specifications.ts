
export const firmSpecificationFields = [
  {
    key: "foundedAt",
    label: "تاریخ تأسیس",
  },
  {
    key: "maxCombinedAccounts",
    label: "حداکثر مجموع اکانت‌ها",
  },
  {
    key: "referencePlan",
    label: "پلن مبنا بررسی",
  },
  {
    key: "phaseOneTarget",
    label: "تارگت فاز ۱",
  },
  {
    key: "phaseTwoTarget",
    label: "تارگت فاز ۲",
  },
  {
    key: "challengeTimeLimit",
    label: "محدودیت زمانی چالش",
  },
  {
    key: "minimumTradingDays",
    label: "حداقل روز معاملاتی در چالش‌ها",
  },
  {
    key: "dailyDrawdown",
    label: "دراودان روزانه",
  },
  {
    key: "totalDrawdown",
    label: "دراودان کل",
  },
  {
    key: "floatingRisk",
    label: "ریسک شناور",
  },
  {
    key: "eightyPercentRule",
    label: "قانون ۸۰ درصد",
  },
  {
    key: "consistencyRule",
    label: "قانون ثبات در معاملات",
  },
  {
    key: "fundedAccountRules",
    label: "قوانین خاص حساب ریل",
  },
  {
    key: "profitConcentrationRule",
    label: "قانون تمرکز سود",
  },
  {
    key: "newsTrading",
    label: "معامله در تایم خبر",
  },
  {
    key: "weekendCrypto",
    label: "معامله کریپتو در تعطیلات",
  },
  {
    key: "minimumTradeDuration",
    label: "حداقل تایم ترید (فست اسکلپ)",
  },
  {
    key: "weekendHolding",
    label: "نگهداری آخر هفته",
  },
  {
    key: "profitSplit",
    label: "تقسیم سود",
  },
  {
    key: "refund",
    label: "ریفاند",
  },
  {
    key: "firstPayoutCondition",
    label: "شرط اولین برداشت سود",
  },
  {
    key: "nextPayoutSchedule",
    label: "زمان برداشت‌های بعدی",
  },
  {
    key: "payoutMethod",
    label: "نحوه برداشت سود",
  },
  {
    key: "minimumWithdrawal",
    label: "حداقل سود قابل برداشت",
  },
  {
    key: "withdrawalProfitCap",
    label: "حد سود در برداشت",
  },
  {
    key: "platform",
    label: "پلتفرم معاملاتی",
  },
  {
    key: "brokers",
    label: "بروکرها و سرور اختصاصی",
  },
  {
    key: "vps",
    label: "VPS",
  },
  {
    key: "tradingBots",
    label: "استفاده از ربات معامله‌کننده",
  },
  {
    key: "riskManagementEA",
    label: "استفاده از اکسپرت مدیریت سرمایه",
  },
  {
    key: "purchaseMethod",
    label: "نحوه خرید حساب",
  },
  {
    key: "accountPasswordChange",
    label: "تغییر رمز اصلی حساب",
  },
] as const;

// نوع کلیدهای مشخصات شرکت
export type FirmSpecificationKey =
  (typeof firmSpecificationFields)[number]["key"];

// نوع اطلاعات مشخصات هر شرکت
export type FirmSpecifications = Partial<
  Record<FirmSpecificationKey, string>
>;
