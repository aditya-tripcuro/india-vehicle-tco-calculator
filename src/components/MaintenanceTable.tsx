import { Fragment, useState } from 'react';
import type { ComparisonResult, VehicleResult } from '../engine/types';
import { formatINR } from '../engine/format';
import { VEHICLE_COLORS } from './VehiclePanel';

/** Annual maintenance / tyres / insurance table with expandable per-vehicle breakdowns. */
export function MaintenanceTable({ comparison }: { comparison: ComparisonResult }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (comparison.vehicles.length === 0) return null;
  const n = comparison.vehicles[0].years.length;

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const expensesOf = (vr: VehicleResult, year: number) =>
    vr.config.otherExpenses.filter((e) => Math.round(e.year) === year);

  return (
    <div className="scroll-x">
      <table className="data">
        <thead>
          <tr>
            <th rowSpan={2}>Year</th>
            {comparison.vehicles.map((vr, i) => (
              <th
                key={vr.config.id}
                colSpan={6}
                className="group"
                style={{ '--group-color': VEHICLE_COLORS[i % VEHICLE_COLORS.length] } as React.CSSProperties}
              >
                {vr.config.name}
              </th>
            ))}
          </tr>
          <tr>
            {comparison.vehicles.map((vr) => (
              <Fragment key={vr.config.id}>
                <th>Maint. &amp; servicing ₹</th>
                <th>Tyres ₹</th>
                <th>Insurance ₹</th>
                <th>Battery repl. ₹</th>
                <th>Other ₹</th>
                <th>Non-energy total ₹</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => {
            const replYear = comparison.vehicles.some((vr) => vr.years[i].batteryReplacementCost > 0);
            return (
              <Fragment key={i}>
                <tr className={replYear ? 'replacement-year' : ''}>
                  <td>
                    Y{i + 1}
                    {replYear && <span className="repl-badge">BATTERY REPLACEMENT</span>}
                  </td>
                  {comparison.vehicles.map((vr) => {
                    const y = vr.years[i];
                    const nonEnergy = y.maintenance + y.batteryReplacementCost + y.insurance + y.tyres + y.other;
                    const breakdownKey = `${i}-${vr.config.id}`;
                    const hasExtras =
                      y.batteryReplacementCost > 0 ||
                      y.other > 0 ||
                      expensesOf(vr, i + 1).length > 0;
                    return (
                      <Fragment key={vr.config.id}>
                        <td>
                          {formatINR(y.maintenance)}{' '}
                          {hasExtras && (
                            <details className="breakdown">
                              <summary onClick={(e) => { e.preventDefault(); toggle(breakdownKey); }}>
                                {expanded.has(breakdownKey) ? 'hide ▲' : 'breakdown ▼'}
                              </summary>
                            </details>
                          )}
                        </td>
                        <td>{formatINR(y.tyres)}</td>
                        <td>{formatINR(y.insurance)}</td>
                        <td style={y.batteryReplacementCost > 0 ? { fontWeight: 700 } : undefined}>
                          {y.batteryReplacementCost > 0 ? formatINR(y.batteryReplacementCost) : '—'}
                        </td>
                        <td>{y.other > 0 ? formatINR(y.other) : '—'}</td>
                        <td>{formatINR(nonEnergy)}</td>
                      </Fragment>
                    );
                  })}
                </tr>
                {comparison.vehicles.map((vr) => {
                  const key = `${i}-${vr.config.id}`;
                  if (!expanded.has(key)) return null;
                  const y = vr.years[i];
                  const expenses = expensesOf(vr, i + 1);
                  return (
                    <tr key={key} className="sub">
                      <td className="sub">↳ {vr.config.name}</td>
                      <td colSpan={6 * comparison.vehicles.length} style={{ textAlign: 'left' }}>
                        Base maintenance: <b>{formatINR(y.maintenance)}</b>
                        {' · '}
                        Battery replacement:{' '}
                        <b>{y.batteryReplacementCost > 0 ? formatINR(y.batteryReplacementCost) : 'none'}</b>
                        {expenses.map((e) => (
                          <span key={e.id}>
                            {' · '}
                            {e.label || 'Expense'} (Y{e.year}): <b>{formatINR(e.amount)}</b>
                          </span>
                        ))}
                        {expenses.length === 0 && y.other > 0 && (
                          <span>
                            {' · '}Other: <b>{formatINR(y.other)}</b>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
          <tr className="total">
            <td>Total</td>
            {comparison.vehicles.map((vr) => {
              const t = vr.totals;
              const nonEnergy = t.maintenanceExBattery + t.batteryReplacementTotal + t.insurance + t.tyres + t.other;
              return (
                <Fragment key={vr.config.id}>
                  <td>{formatINR(t.maintenanceExBattery)}</td>
                  <td>{formatINR(t.tyres)}</td>
                  <td>{formatINR(t.insurance)}</td>
                  <td>{t.batteryReplacementTotal > 0 ? formatINR(t.batteryReplacementTotal) : '—'}</td>
                  <td>{t.other > 0 ? formatINR(t.other) : '—'}</td>
                  <td>{formatINR(nonEnergy)}</td>
                </Fragment>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
