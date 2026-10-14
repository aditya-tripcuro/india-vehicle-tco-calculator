import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ComparisonResult, TcoMetric } from '../engine/types';
import { formatCompact, formatINR, toLakh } from '../engine/format';
import { VEHICLE_COLORS } from './VehiclePanel';

interface Props {
  comparison: ComparisonResult;
  metric: TcoMetric;
  includeOpportunity: boolean;
  onMetricChange: (m: TcoMetric) => void;
  onIncludeOpportunityChange: (on: boolean) => void;
}

interface TooltipPayloadEntry {
  vehicles?: string;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
}

export function TcoChart({
  comparison,
  metric,
  includeOpportunity,
  onMetricChange,
  onIncludeOpportunityChange,
}: Props) {
  const isCumulative = metric !== 'annual';

  const data = useMemo(() => {
    const n = comparison.vehicles[0]?.years.length ?? 0;
    const rows: Array<Record<string, number>> = [];
    for (let i = 0; i < n; i++) {
      const row: Record<string, number> = { year: i + 1 };
      for (const vr of comparison.vehicles) {
        const y = vr.years[i];
        let value: number;
        if (metric === 'annual') value = y.operatingCost;
        else if (metric === 'cash' || !includeOpportunity) value = y.cumulativeCashTco;
        else value = y.cumulativeEconomicTco;
        row[vr.config.id] = toLakh(value);
      }
      rows.push(row);
    }
    return rows;
  }, [comparison, metric, includeOpportunity]);

  const replacementDots = useMemo(() => {
    if (!isCumulative) return [];
    const dots: Array<{ vehicleId: string; year: number; value: number; cost: number; name: string }> = [];
    for (const vr of comparison.vehicles) {
      for (const y of vr.years) {
        if (y.batteryReplacementCost > 0) {
          const value =
            includeOpportunity && metric === 'economic' ? y.cumulativeEconomicTco : y.cumulativeCashTco;
          dots.push({
            vehicleId: vr.config.id,
            year: y.year,
            value: toLakh(value),
            cost: y.batteryReplacementCost,
            name: vr.config.name,
          });
        }
      }
    }
    return dots;
  }, [comparison, isCumulative, metric, includeOpportunity]);

  const yLabel = metric === 'annual' ? 'Annual operating expenditure (₹ lakh)' : 'Cumulative TCO (₹ lakh)';

  return (
    <div className="card">
      <div className="chart-controls">
        <div className="seg" role="tablist" aria-label="Metric">
          <button className={metric === 'annual' ? 'active' : ''} onClick={() => onMetricChange('annual')}>
            Annual operating expenditure
          </button>
          <button className={metric !== 'annual' ? 'active' : ''} onClick={() => onMetricChange('cash')}>
            Cumulative TCO
          </button>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={includeOpportunity}
            disabled={metric === 'annual'}
            onChange={(e) => onIncludeOpportunityChange(e.target.checked)}
          />
          Include opportunity-cost adjustment (economic TCO)
        </label>
      </div>

      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 24, bottom: 14, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
              label={{ value: 'Year', position: 'insideBottom', offset: -8, fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12, dx: 12 }}
              tickFormatter={(v: number) => v.toLocaleString('en-IN')}
            />
            <Tooltip
              formatter={(value, _name, entry) => {
                const id = String((entry as TooltipPayloadEntry)?.dataKey ?? '');
                const v = Number(value) * 1e5;
                const vr = comparison.vehicles.find((x) => x.config.id === id);
                const y = vr?.years[Math.max(0, Math.min(data.length, Math.round(Number((entry as { payload?: { year?: number } }).payload?.year))) - 1)];
                const repl = y?.batteryReplacementCost ?? 0;
                return [
                  `${formatINR(v)}${repl > 0 ? `  ·  includes battery replacement ${formatCompact(repl)}` : ''}`,
                  vr?.config.name ?? id,
                ];
              }}
              labelFormatter={(year) => `Year ${year}`}
              contentStyle={{ fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            {comparison.vehicles.map((vr, i) => (
              <Line
                key={vr.config.id}
                type="monotone"
                dataKey={vr.config.id}
                name={vr.config.name}
                stroke={VEHICLE_COLORS[i % VEHICLE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            {replacementDots.map((d) => (
              <ReferenceDot
                key={`${d.vehicleId}-${d.year}`}
                x={d.year}
                y={d.value}
                r={6}
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {isCumulative && replacementDots.length > 0 && (
        <p className="inline-note" style={{ margin: '6px 0 0' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: '#f59e0b', marginRight: 6 }} />
          Orange markers mark EV battery-replacement years (cost added to that year and all cumulative figures).
        </p>
      )}
    </div>
  );
}
