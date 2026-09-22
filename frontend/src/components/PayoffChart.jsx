import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import React from "react";

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

export default function PayoffChart({ histogram, strike, isConnected = false }) {
  const chartData = (histogram ?? []).map((bucket) => ({
    price: ((bucket?.lower_bound ?? 0) + (bucket?.upper_bound ?? 0)) / 2,
    density: bucket?.density ?? 0,
    probability: bucket?.probability ?? 0,
    range: `${formatPrice(bucket?.lower_bound)} - ${formatPrice(bucket?.upper_bound)}`
  }));

  return (
    <section className="panel min-h-[390px] rounded-sm p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Distribution monitor</span>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">Terminal price density</h2>
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider text-slate-500">
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-teal-400" />Density</span>
          <span>Strike <strong className="text-amber-300">{formatPrice(strike)}</strong></span>
        </div>
      </div>
      <div className="h-[300px] w-full">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid stroke="#273442" strokeDasharray="2 5" vertical={false} />
              <XAxis
                dataKey="price"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatPrice}
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={{ stroke: "#273442" }}
                tickLine={false}
                minTickGap={26}
              />
              <YAxis
                tickFormatter={(value) => Number(value).toFixed(3)}
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              <Tooltip
                cursor={{ fill: "rgba(79, 209, 197, 0.06)" }}
                contentStyle={{ background: "#111820", border: "1px solid #273442", borderRadius: 2, fontSize: 11 }}
                labelFormatter={formatPrice}
                formatter={(value, name) => [Number(value).toFixed(6), name === "density" ? "Density" : "Probability"]}
              />
              <ReferenceLine x={strike} stroke="#f5b94c" strokeDasharray="4 4" strokeWidth={1.5} />
              <Bar dataKey="density" fill="#4fd1c5" fillOpacity={0.72} isAnimationActive={false} barSize={9} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-600">
            {isConnected ? "Awaiting Data..." : "Disconnected from Engine"}
          </div>
        )}
      </div>
    </section>
  );
}
