import Link from "next/link";
import type { CSSProperties } from "react";
import type { Firm } from "@/lib/data";
import FirmLogo from "@/components/FirmLogo";

export default function FirmCard({ firm }: { firm: Firm }) {
  return (
    <article className="firm-card flex h-full min-w-0 flex-col overflow-hidden !transition-colors">
      <div className="firm-top min-w-0">
        <FirmLogo firm={firm} className="firm-mark" style={{ "--firm-color": firm.color } as CSSProperties} />
        <div className="firm-name flex-1 min-w-0">
          <h3 className="break-words">{firm.name}</h3>
          <span className="rating">★ {firm.rating} <small>از ۵</small></span>
        </div>
        {firm.discount && <span className="discount-pill shrink-0">{firm.discount} تخفیف</span>}
      </div>

      <p className="!mt-4 !mb-4 min-h-0 text-sm leading-7 text-muted"
        style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}
        title={firm.description}>
        {firm.description || "برای آشنایی با این شرکت و قوانین آن، جزئیات شرکت را مشاهده کنید."}
      </p>

      <div className="mt-auto min-w-0">
        <div className="firm-stats min-w-0">
          <div className="min-w-0"><small>حداکثر سرمایه</small><b className="break-words !whitespace-normal">{firm.capital || "—"}</b></div>
          <div className="min-w-0"><small>سهم سود</small><b className="break-words !whitespace-normal">{firm.profit || "—"}</b></div>
          <div className="min-w-0"><small>هزینه شروع</small><b className="break-words !whitespace-normal">{firm.fee || "—"}</b></div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-1 xl:grid-cols-2">
          <Link className="button button-primary !whitespace-normal text-center !px-2 !py-3" href={`/firms/${encodeURIComponent(firm.id)}`}>
            جزئیات شرکت
          </Link>
          <Link className="button button-quiet !whitespace-normal text-center !px-2 !py-3" href={`/discounts#${encodeURIComponent(firm.id)}`}>
            کد تخفیف
          </Link>
        </div>
      </div>
    </article>
  );
}
