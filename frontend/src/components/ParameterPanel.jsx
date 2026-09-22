import { Activity, Gauge, SlidersHorizontal } from "lucide-react";
import React from "react";

const simulationOptions = [10_000, 50_000, 100_000, 500_000];

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function formatRate(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  minDisplay,
  maxDisplay,
  onChange
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
        <span>{label}</span>
        <span className="font-semibold text-slate-200">{displayValue}</span>
      </span>
          <input
        aria-label={label}
        className="h-1.5 w-full cursor-ew-resize appearance-none rounded-full bg-slate-700 accent-teal-400"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="flex justify-between text-[9px] tabular-nums text-slate-600">
          <span>{minDisplay}</span>
          <span>{maxDisplay}</span>
      </span>
    </label>
  );
}

export default function ParameterPanel({ parameters, onChange }) {
  const update = (key) => (value) => onChange({ ...parameters, [key]: value });
  const simulationIndex = simulationOptions.indexOf(parameters.num_simulations);

  return (
    <aside className="panel h-fit rounded-sm p-5 lg:sticky lg:top-5">
      <div className="mb-6 flex items-start justify-between border-b border-terminal-line/60 pb-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <SlidersHorizontal size={15} />
            <span className="eyebrow text-teal-400/80">Market inputs</span>
          </div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">Simulation controls</h2>
        </div>
        <Gauge size={17} className="text-slate-600" />
      </div>

      <div className="space-y-6">
        <ParameterSlider
          label="Spot price"
          value={parameters.spot}
          min={50}
          max={150}
          step={0.5}
          displayValue={formatCurrency(parameters.spot)}
          minDisplay="$50.00"
          maxDisplay="$150.00"
          onChange={update("spot")}
        />
        <ParameterSlider
          label="Strike price"
          value={parameters.strike}
          min={50}
          max={150}
          step={0.5}
          displayValue={formatCurrency(parameters.strike)}
          minDisplay="$50.00"
          maxDisplay="$150.00"
          onChange={update("strike")}
        />
        <ParameterSlider
          label="Volatility"
          value={parameters.volatility}
          min={0.01}
          max={1}
          step={0.01}
          displayValue={formatRate(parameters.volatility)}
          minDisplay="1.00%"
          maxDisplay="100.00%"
          onChange={update("volatility")}
        />
        <ParameterSlider
          label="Time to maturity"
          value={parameters.time_to_maturity}
          min={0.1}
          max={5}
          step={0.1}
          displayValue={`${parameters.time_to_maturity.toFixed(1)} yr`}
          minDisplay="0.1 yr"
          maxDisplay="5.0 yr"
          onChange={update("time_to_maturity")}
        />
        <ParameterSlider
          label="Risk-free rate"
          value={parameters.risk_free_rate}
          min={-0.05}
          max={0.1}
          step={0.005}
          displayValue={formatRate(parameters.risk_free_rate)}
          minDisplay="-5.00%"
          maxDisplay="10.00%"
          onChange={update("risk_free_rate")}
        />
        <label className="block space-y-2">
          <span className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
            <span>Simulations</span>
            <span className="font-semibold text-slate-200">
              {parameters.num_simulations.toLocaleString()}
            </span>
          </span>
          <input
            aria-label="Number of simulations"
            className="h-1.5 w-full cursor-ew-resize appearance-none rounded-full bg-slate-700 accent-amber-400"
            type="range"
            min="0"
            max={simulationOptions.length - 1}
            step="1"
            value={simulationIndex < 0 ? 2 : simulationIndex}
            onChange={(event) => onChange({
              ...parameters,
              num_simulations: simulationOptions[Number(event.target.value)]
            })}
          />
          <span className="flex justify-between text-[9px] tabular-nums text-slate-600">
            <span>10K</span><span>50K</span><span>100K</span><span>500K</span>
          </span>
        </label>
      </div>

      <div className="mt-7 flex items-center gap-2 border-t border-terminal-line/60 pt-4 text-[10px] text-slate-500">
        <Activity size={13} className="text-teal-400" />
        <span>Common random numbers enabled</span>
      </div>
    </aside>
  );
}
