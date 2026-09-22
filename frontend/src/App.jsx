import { Activity, CircleAlert, Cpu, Radio, Wifi, WifiOff } from "lucide-react";
import React from "react";
import { useEffect, useState } from "react";

import GreeksDisplay from "./components/GreeksDisplay";
import ParameterPanel from "./components/ParameterPanel";
import PayoffChart from "./components/PayoffChart";
import { useWebSocketEngine } from "./hooks/useWebSocketEngine";

const initialParameters = {
  spot: 100,
  strike: 100,
  volatility: 0.2,
  time_to_maturity: 1,
  risk_free_rate: 0.05,
  num_simulations: 100_000,
  histogram_bucket_count: 50,
  seed: 42
};

function formatLatency(value) {
  return value == null ? "--" : `${value.toFixed(1)} ms`;
}

export default function App() {
  const [parameters, setParameters] = useState(initialParameters);
  const { data, isConnected, error, sendParameters } = useWebSocketEngine();

  useEffect(() => {
    sendParameters(initialParameters);
  }, [sendParameters]);

  const handleParameterChange = (nextParameters) => {
    setParameters(nextParameters);
    sendParameters(nextParameters);
  };

  return (
    <main className="min-h-screen bg-terminal-950 px-4 py-4 text-slate-300 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-col gap-4 border-b border-terminal-line/70 pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-teal-400/30 bg-teal-400/10 text-teal-300">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-slate-100">QUANT / MONTE CARLO</h1>
                <span className="rounded-sm border border-slate-700 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-slate-500">EUR options</span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-600">Institutional pricing terminal</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider">
            <div className={`flex items-center gap-2 rounded-sm border px-3 py-2 ${isConnected ? "border-teal-400/30 bg-teal-400/[0.06] text-teal-300" : "border-slate-700 bg-slate-800/50 text-slate-500"}`}>
              {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>Live engine status</span>
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "animate-pulse bg-teal-400" : "bg-slate-600"}`} />
            </div>
            <div className="flex items-center gap-2 rounded-sm border border-terminal-line bg-terminal-900 px-3 py-2 text-slate-500">
              <Cpu size={13} />
              <span>Engine latency</span>
              <strong className="text-slate-200">{formatLatency(data?.compute_time_ms)}</strong>
            </div>
            <div className="hidden items-center gap-2 text-slate-600 md:flex">
              <Radio size={13} />
              <span>WS / OPENMP</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-sm border border-rose-400/30 bg-rose-400/[0.06] px-3 py-2 text-xs text-rose-300">
            <CircleAlert size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ParameterPanel parameters={parameters} onChange={handleParameterChange} />
          <div className="min-w-0 space-y-5">
            {data ? (
              <GreeksDisplay data={data} isConnected={isConnected} />
            ) : (
              <GreeksDisplay data={null} isConnected={isConnected} />
            )}
            <PayoffChart
              histogram={data?.histogram}
              strike={parameters.strike}
              isConnected={isConnected}
            />
            {data?.simulations_per_second != null && (
              <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] uppercase tracking-wider text-slate-600">
                <span>{parameters.num_simulations.toLocaleString()} paths / common random numbers</span>
                <span>{Math.round(data?.simulations_per_second).toLocaleString()} simulations / sec</span>
              </footer>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
