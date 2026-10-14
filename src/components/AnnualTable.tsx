import type { ComparisonResult } from '../engine/types';
import { formatINR, formatNumber } from '../engine/format';
import { VEHICLE_COLORS } from './VehiclePanel';

interface Props {
  comparison: ComparisonResult;
  onExportCsv: () => void;
}

/** Wide annual TCO table: one row per year, one column group per vehicle. */
export function AnnualTable({ comparison, onExportCsv }: Props) {
  if (comparison.vehicles.length === 0) return null;
  const n = comparison.vehicles[0].years.length;
  const rows = Array.from({ length: n }, (_, i) => i);

  return (
    <div>
      <div className="card-actions" style={{ marginBottom: 8 }}>
        <button className="primary" onClick={onExportCsv}>
          ⬇ Export annual TCO table (CSV)
        </button>
        <span className="inline-note">
          The CSV is generated from the same data as this table, so the values reconcile exactly.
        </span>
      </div>
      <div className="scroll-x">
        <table className="data">
          <thead>
            <tr>
              <th rowSpan={2}>Year</th>
              <th rowSpan={2}>Highway km</th>
              <th rowSpan={2}>City km</th>
              {comparison.vehicles.map((vr, i) => (
                <th
                  key={vr.config.id}
                  colSpan={vr.config.powertrain === 'electric' ? 16 : 13}
                  className="group"
                  style={{ '--group-color': VEHICLE_COLORS[i % VEHICLE_COLORS.length] } as React.CSSProperties}
                >
                  {vr.config.name}
                  {vr.isBaseline ? ' · baseline' : ''}
                </th>
              ))}
            </tr>
            <tr>
              {comparison.vehicles.map((vr) =>
                vr.config.powertrain === 'petrol' ? (
                  <PetrolCols key={vr.config.id} />
                ) : (
                  <EvCols key={vr.config.id} />
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const replYear = comparison.vehicles.some((vr) => vr.years[i].batteryReplacementCost > 0);
              return (
                <tr key={i} className={replYear ? 'replacement-year' : ''}>
                  <td>Y{comparison.vehicles[0].years[i].year}</td>
                  <td className="sub">{formatNumber(comparison.vehicles[0].years[i].highwayKm)}</td>
                  <td className="sub">{formatNumber(comparison.vehicles[0].years[i].cityKm)}</td>
                  {comparison.vehicles.map((vr) => {
                    const y = vr.years[i];
                    return (
                      <CellsInRow
                        key={vr.config.id}
                        isEv={vr.config.powertrain === 'electric'}
                        units={vr.config.powertrain === 'electric' ? y.gridKwh : y.totalLitres}
                        price={y.energyPrice}
                        energy={y.energyCost}
                        maint={y.maintenance}
                        repl={y.batteryReplacementCost}
                        ins={y.insurance}
                        tyres={y.tyres}
                        other={y.other}
                        opex={y.operatingCost}
                        purchase={y.purchaseApplied}
                        cumCash={y.cumulativeCashTco}
                        opp={y.opportunityAdjustment}
                        cumEcon={y.cumulativeEconomicTco}
                        battKwh={y.battery?.remainingCapacityKwh ?? null}
                        battPct={y.battery ? y.battery.remainingCapacityPercent * 100 : null}
                        efc={y.battery?.cumulativeEfc ?? null}
                      />
                    );
                  })}
                </tr>
              );
            })}
            <tr className="total">
              <td>Total</td>
              <td />
              <td />
              {comparison.vehicles.map((vr) => {
                const t = vr.totals;
                const last = vr.years[vr.years.length - 1];
                return (
                  <CellsInRow
                    key={vr.config.id}
                    isEv={vr.config.powertrain === 'electric'}
                    units={t.unitsTotal}
                    price={last.energyPrice}
                    energy={t.energyCost}
                    maint={t.maintenanceExBattery}
                    repl={t.batteryReplacementTotal}
                    ins={t.insurance}
                    tyres={t.tyres}
                    other={t.other}
                    opex={t.operatingTotal}
                    purchase={t.purchasePrice}
                    cumCash={t.cashTco}
                    opp={t.foregoneEarningsAtEnd}
                    cumEcon={t.economicTco}
                    battKwh={vr.config.powertrain === 'electric' ? t.finalRemainingCapacityKwh : null}
                    battPct={vr.config.powertrain === 'electric' ? t.finalRemainingCapacityPercent * 100 : null}
                    efc={last.battery?.cumulativeEfc ?? null}
                    isTotal
                  />
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="inline-note" style={{ marginTop: 8 }}>
        Cumulative TCO includes the purchase price (added in Year 1) and deducts the resale value in
        the final year. The opportunity adjustment is an economic figure, not a cash expense — annual
        entries telescope exactly to the Year-{n} cumulative amount. Total row: sums for flow columns,
        final values for cumulative and battery columns.
      </p>
    </div>
  );
}

function PetrolCols() {
  return (
    <>
      <th>Petrol (L)</th>
      <th>₹/L</th>
      <th>Fuel cost ₹</th>
      <th>Maint. ₹</th>
      <th>Batt. repl. ₹</th>
      <th>Insurance ₹</th>
      <th>Tyres ₹</th>
      <th>Other ₹</th>
      <th>Annual opex ₹</th>
      <th>Purchase ₹</th>
      <th>Cum. cash TCO ₹</th>
      <th>Opp. adj ₹</th>
      <th>Cum. economic TCO ₹</th>
    </>
  );
}

function EvCols() {
  return (
    <>
      <th>Grid elec. (kWh)</th>
      <th>₹/kWh</th>
      <th>Elec. cost ₹</th>
      <th>Maint. ₹</th>
      <th>Batt. repl. ₹</th>
      <th>Insurance ₹</th>
      <th>Tyres ₹</th>
      <th>Other ₹</th>
      <th>Annual opex ₹</th>
      <th>Purchase ₹</th>
      <th>Cum. cash TCO ₹</th>
      <th>Opp. adj ₹</th>
      <th>Cum. economic TCO ₹</th>
      <th>Battery kWh</th>
      <th>Cum. EFC</th>
      <th>Batt. %</th>
    </>
  );
}

interface CellsProps {
  isEv: boolean;
  units: number;
  price: number;
  energy: number;
  maint: number;
  repl: number;
  ins: number;
  tyres: number;
  other: number;
  opex: number;
  purchase: number;
  cumCash: number;
  opp: number;
  cumEcon: number;
  battKwh: number | null;
  battPct: number | null;
  efc: number | null;
  isTotal?: boolean;
}

function CellsInRow(p: CellsProps) {
  return (
    <>
      <td>{formatNumber(p.units, 0)}</td>
      <td>{formatNumber(p.price, 2)}</td>
      <td>{formatINR(p.energy)}</td>
      <td>{formatINR(p.maint)}</td>
      <td style={p.repl > 0 ? { fontWeight: 700 } : undefined}>
        {p.repl > 0 ? formatINR(p.repl) : '—'}
        {p.repl > 0 && <span className="repl-badge">REPL</span>}
      </td>
      <td>{formatINR(p.ins)}</td>
      <td>{formatINR(p.tyres)}</td>
      <td>{p.other > 0 ? formatINR(p.other) : '—'}</td>
      <td>{formatINR(p.opex)}</td>
      <td>{p.purchase > 0 || p.isTotal ? formatINR(p.purchase) : '—'}</td>
      <td>{formatINR(p.cumCash)}</td>
      <td>{p.opp !== 0 ? formatINR(p.opp) : '—'}</td>
      <td>{formatINR(p.cumEcon)}</td>
      {p.isEv && (
        <>
          <td>{p.battKwh != null ? formatNumber(p.battKwh, 1) : '—'}</td>
          <td>{p.efc != null ? formatNumber(p.efc, 1) : '—'}</td>
          <td>{p.battPct != null ? `${formatNumber(p.battPct, 1)}%` : '—'}</td>
        </>
      )}
    </>
  );
}
