import { ArrowDownRight, ArrowUpRight, CircleAlert, CircleDollarSign, Gauge, Percent, TrendingUp } from "lucide-react";
import React from "react";

const metrics = [
  { key: "call_price", label: "Call price", icon: CircleDollarSign, format: (value) => `$${value.toFixed(4)}`, tone: "teal" },
  { key: "put_price", label: "Put price", icon: CircleDollarSign, format: (value) => `$${value.toFixed(4)}`, tone: "amber" },
  { key: "delta", label: "Delta", icon: TrendingUp, format: (value) => value.toFixed(5), tone: "slate" },
  { key: "gamma", label: "Gamma", icon: Gauge, format: (value) => value.toFixed(6), tone: "slate" },
  { key: "vega", label: "Vega", icon: Percent, format: (value) => value.toFixed(5), tone: "slate" },
  { key: "theta", label: "Theta", icon: ArrowDownRight, format: (value) => value.toFixed(5), tone: "slate" },
  { key: "var_95", label: "95% VaR", icon: ArrowDownRight, format: (value) => `$${value.toFixed(3)}`, tone: "rose" },
  { key: "var_99", label: "99% VaR", icon: ArrowDownRight, format: (value) => `$${value.toFixed(3)}`, tone: "rose" }
];

const toneClasses = {
  teal: "border-teal-400/30 bg-teal-400/[0.06] text-teal-300",
  amber: "border-amber-400/30 bg-amber-400/[0.06] text-amber-300",
  rose: "border-rose-400/25 bg-rose-400/[0.05] text-rose-300",
  slate: "border-terminal-line bg-terminal-850 text-slate-300"
};

export default function GreeksDisplay({ data, isConnected = false }) {
  if (!isConnected || !data) {
    return (
      <section className="panel flex min-h-[230px] items-center justify-center rounded-sm p-5">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <CircleAlert size={15} />
          <span>{isConnected ? "Awaiting Data..." : "Disconnected from Engine"}</span>
        </div>
      </section>
    );
  }

  const values = {
    ...(data?.greeks ?? {}),
    call_price: data?.call_price,
    put_price: data?.put_price,
    var_95: data?.var_95,
    var_99: data?.var_99
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="eyebrow">Live analytics</span>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">Pricing and risk</h2>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-slate-600">Call greeks</span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {metrics.map(({ key, label, icon: Icon, format, tone }) => {
          const value = values[key] ?? 0;
          const isNegative = value < 0;
          return (
            <article key={key} className={`rounded-sm border p-3 ${toneClasses[tone]}`}>
              <div className="mb-4 flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase tracking-wider">{label}</span>
                <Icon size={14} />
              </div>
              <div className={`flex items-center gap-1 text-lg font-semibold tabular-nums ${isNegative ? "text-rose-300" : ""}`}>
                {isNegative && <ArrowDownRight size={14} />}
                {format(value)}
                {!isNegative && key === "delta" && <ArrowUpRight size={13} className="text-teal-400" />}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
