import type { ComparisonResult, VehicleResult } from '../engine/types';
import { formatCompact, formatINR, formatNumber } from '../engine/format';
import { VEHICLE_COLORS } from './VehiclePanel';

const CYCLE_SCENARIOS = [800, 1000, 1200, 1500, 2000];

export function BatterySection({
  comparison,
  onSetCycleLife,
}: {
  comparison: ComparisonResult;
  onSetCycleLife: (vehicleId: string, cycles: number) => void;
}) {
  const evs = comparison.vehicles.filter((vr) => vr.config.powertrain === 'electric');
  if (evs.length === 0) {
    return <p className="inline-note">No electric vehicles in this comparison.</p>;
  }

  return (
    <div className="battery-cards">
      {evs.map((vr) => (
        <BatteryCard
          key={vr.config.id}
          vr={vr}
          color={VEHICLE_COLORS[comparison.vehicles.indexOf(vr) % VEHICLE_COLORS.length]}
          onSetCycleLife={(c) => onSetCycleLife(vr.config.id, c)}
        />
      ))}
    </div>
  );
}

function BatteryCard({
  vr,
  color,
  onSetCycleLife,
}: {
  vr: VehicleResult;
  color: string;
  onSetCycleLife: (cycles: number) => void;
}) {
  const { config: v, totals: t, years } = vr;
  const n = years.length;
  const original = t.batteries.find((b) => b.batteryIndex === 0);
  const current = t.batteries[t.batteries.length - 1];

  return (
    <div className="card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="vehicle-card-head" style={{ marginBottom: 6 }}>
        <b>{v.name}</b>
        <span className="chip">{v.batteryCapacityKwh} kWh rated</span>
      </div>

      <div className="stat-strip">
        <span className="stat">
          Capacity at Y{n}: <b>{t.finalRemainingCapacityKwh.toFixed(1)} kWh ({(t.finalRemainingCapacityPercent * 100).toFixed(1)}%)</b>
        </span>
        <span className="stat">
          Original battery EFCs: <b>{formatNumber(t.totalEfcOriginalBattery, 1)}</b>
        </span>
        <span className="stat">
          Replacements: <b>{t.replacements.length}</b>
        </span>
        <span className="stat">
          Total replacement spend: <b>{formatCompact(t.batteryReplacementTotal)}</b>
        </span>
        <span className="stat">
          Projected first replacement: <b>{t.projectedReplacementYear ? `Year ${t.projectedReplacementYear}` : '—'}</b>
        </span>
      </div>

      <div className="scenario-buttons" style={{ marginBottom: 10 }}>
        <span className="inline-note">Cycle-life scenario:</span>
        {CYCLE_SCENARIOS.map((c) => (
          <button
            key={c}
            className={v.batteryCycleLife === c ? 'active' : ''}
            onClick={() => onSetCycleLife(c)}
          >
            {c}
          </button>
        ))}
        <span className="inline-note">equivalent full cycles</span>
      </div>

      <div className="scroll-x" style={{ marginBottom: 12 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Year</th>
              <th>Battery kWh</th>
              <th>Capacity %</th>
              <th>Annual EFC</th>
              <th>Cum. EFC</th>
              <th>Cycles left</th>
              <th>HW range (km)</th>
              <th>City range (km)</th>
              <th>Event</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.year} className={y.battery?.replacementThisYear ? 'replacement-year' : ''}>
                <td>Y{y.year}</td>
                <td>{formatNumber(y.battery?.remainingCapacityKwh ?? 0, 1)}</td>
                <td>{formatNumber((y.battery?.remainingCapacityPercent ?? 0) * 100, 1)}%</td>
                <td>{formatNumber(y.battery?.annualEfc ?? 0, 1)}</td>
                <td>{formatNumber(y.battery?.cumulativeEfc ?? 0, 1)}</td>
                <td>{formatNumber(y.battery?.remainingCycles ?? 0, 0)}</td>
                <td>{formatNumber(y.battery?.highwayRangeKm ?? 0, 0)}</td>
                <td>{formatNumber(y.battery?.cityRangeKm ?? 0, 0)}</td>
                <td>
                  {y.battery?.replacementThisYear ? (
                    <span className="repl-badge">Replaced (new battery from Y{y.year + 1})</span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="subsection-title">Battery replacement history</div>
      <div className="scroll-x">
        <table className="data">
          <thead>
            <tr>
              <th>Battery</th>
              <th>Installed</th>
              <th>Serving from</th>
              <th>Accumulated EFCs</th>
              <th>Replaced in</th>
              <th>Replacement cost</th>
              <th>Counter reset</th>
            </tr>
          </thead>
          <tbody>
            {t.batteries.map((b) => {
              const rec = t.replacements.find((r) => r.batteryIndex === b.batteryIndex);
              return (
                <tr key={b.batteryIndex}>
                  <td>#{b.batteryIndex + 1}{b.batteryIndex === 0 ? ' (original)' : ''}</td>
                  <td>Y{b.installedYear}</td>
                  <td>Y{b.installedYear === 1 ? 1 : b.installedYear + 1}</td>
                  <td>{formatNumber(b.accumulatedEfc, 1)}</td>
                  <td>{rec ? `Y${rec.replacedInYear}` : '—'}</td>
                  <td>{rec ? formatINR(rec.cost) : '—'}</td>
                  <td>{rec ? `Yes — starts at 0 in Y${rec.replacedInYear + 1}` : '—'}</td>
                </tr>
              );
            })}
            <tr className="total">
              <td colSpan={5}>Total battery replacement expenditure</td>
              <td colSpan={2}>{formatINR(t.batteryReplacementTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="inline-note" style={{ margin: '8px 0 0' }}>
        Cycle life ({v.batteryCycleLife.toLocaleString('en-IN')} EFC) and replacement cost are
        user-editable planning assumptions — not confirmed manufacturer specifications and not a
        prediction that replacement is inevitable. Equivalent full cycles are counted against the
        rated capacity of the installed battery; charging losses affect grid electricity only.
        Range estimates scale with remaining capacity and are approximations for planning.
        {current && current.batteryIndex > 0 && (
          <>
            {' '}The current battery #{current.batteryIndex + 1} was fitted at the end of Y{current.installedYear}
            {current.accumulatedEfc === 0 ? ' and has not served a full year yet' : ''}
          </>
        )}
        {original && !original.replacedInYear && (
          <>
            {' '}No replacement has been triggered within the {n}-year horizon at these settings.
          </>
        )}
      </p>
    </div>
  );
}
