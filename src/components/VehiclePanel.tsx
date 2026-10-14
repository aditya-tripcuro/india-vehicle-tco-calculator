import type { OneTimeExpense, Powertrain, VehicleConfig } from '../engine/types';
import { uid } from '../engine/defaults';
import { validateVehicle } from '../engine/validate';
import { Field, NumberInput } from './inputs';

export const VEHICLE_COLORS = [
  '#2563eb',
  '#d97706',
  '#059669',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#c026d3',
  '#65a30d',
];

const CYCLE_SCENARIOS = [800, 1000, 1200, 1500, 2000];
const TYRE_LIFE_SCENARIOS = [35_000, 40_000, 50_000, 60_000];

interface Props {
  vehicle: VehicleConfig;
  index: number;
  ownershipYears: number;
  canRemove: boolean;
  onChange: (patch: Partial<VehicleConfig>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function VehiclePanel({
  vehicle: v,
  index,
  ownershipYears,
  canRemove,
  onChange,
  onDuplicate,
  onRemove,
}: Props) {
  const isEv = v.powertrain === 'electric';
  const issues = validateVehicle(v, ownershipYears);

  function switchPowertrain(powertrain: Powertrain) {
    if (powertrain === v.powertrain) return;
    if (powertrain === 'electric') {
      onChange({
        powertrain,
        batteryCapacityKwh: v.batteryCapacityKwh || 49,
        highwayEfficiency: v.highwayEfficiency || 4.8,
        cityEfficiency: v.cityEfficiency || 7,
        chargingEfficiency: 0.9,
        batteryCycleLife: 1200,
        batteryReplacementCost: v.batteryReplacementCost || 800_000,
        capacityAtCycleLife: 0.8,
        electricityPrice: v.electricityPrice || 8,
        electricityEscalation: 0.03,
        highwayRangeKm: v.highwayRangeKm || 235,
        cityRangeKm: v.cityRangeKm || 343,
      });
    } else {
      onChange({
        powertrain,
        highwayMileage: v.highwayMileage || 15,
        cityMileage: v.cityMileage || 10,
        annualMileageDegradation: 0.005,
        fuelPrice: 115,
        fuelPriceEscalation: 0.02,
        highwayRangeKm: 0,
        cityRangeKm: 0,
        manualReplacementYear: null,
      });
    }
  }

  function addExpense() {
    const expense: OneTimeExpense = { id: uid('exp'), year: 1, label: 'One-time repair', amount: 10_000 };
    onChange({ otherExpenses: [...v.otherExpenses, expense] });
  }

  function updateExpense(id: string, patch: Partial<OneTimeExpense>) {
    onChange({
      otherExpenses: v.otherExpenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  }

  function removeExpense(id: string) {
    onChange({ otherExpenses: v.otherExpenses.filter((e) => e.id !== id) });
  }

  return (
    <div className="card vehicle-card" style={{ '--vehicle-color': VEHICLE_COLORS[index % VEHICLE_COLORS.length] } as React.CSSProperties}>
      <div className="vehicle-card-head">
        <span
          className="dot"
          style={{ width: 12, height: 12, borderRadius: 999, background: VEHICLE_COLORS[index % VEHICLE_COLORS.length], flexShrink: 0 }}
        />
        <input
          type="text"
          value={v.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-label="Vehicle name"
        />
        <select
          value={v.powertrain}
          onChange={(e) => switchPowertrain(e.target.value as Powertrain)}
          style={{ width: 'auto' }}
          aria-label="Powertrain"
        >
          <option value="petrol">Petrol</option>
          <option value="electric">Electric</option>
        </select>
        <button onClick={onDuplicate} title="Duplicate vehicle">Duplicate</button>
        <button className="danger" onClick={onRemove} disabled={!canRemove} title="Remove vehicle">
          Remove
        </button>
      </div>

      <div>
        <div className="subsection-title">A · Vehicle &amp; consumption</div>
        <div className="grid-form">
          <Field label="Purchase price (₹)">
            <NumberInput value={v.purchasePrice} min={0} step={1000} onChange={(n) => onChange({ purchasePrice: n })} />
          </Field>
          <Field label={isEv ? 'Highway efficiency (km/kWh)' : 'Highway mileage (km/l)'}>
            <NumberInput
              value={isEv ? v.highwayEfficiency : v.highwayMileage}
              min={isEv ? 0.1 : 0.1}
              step={0.1}
              onChange={(n) => onChange(isEv ? { highwayEfficiency: n } : { highwayMileage: n })}
            />
          </Field>
          <Field label={isEv ? 'City efficiency (km/kWh)' : 'City mileage (km/l)'}>
            <NumberInput
              value={isEv ? v.cityEfficiency : v.cityMileage}
              min={isEv ? 0.1 : 0.1}
              step={0.1}
              onChange={(n) => onChange(isEv ? { cityEfficiency: n } : { cityMileage: n })}
            />
          </Field>
        </div>
        {!isEv && (
          <p className="inline-note" style={{ margin: '8px 0 0' }}>
            Range applies to electric vehicles only. Monthly driving distances are shared by all
            vehicles — edit them under Global assumptions.
          </p>
        )}
      </div>

      <div>
        <div className="subsection-title">B · Energy prices</div>
        {isEv ? (
          <div className="grid-form">
            <Field label="Electricity price (₹/kWh)">
              <NumberInput value={v.electricityPrice} min={0} step={0.5} onChange={(n) => onChange({ electricityPrice: n })} />
            </Field>
            <Field label="Electricity price increase (%/yr)">
              <NumberInput value={v.electricityEscalation} percent onChange={(n) => onChange({ electricityEscalation: n })} />
            </Field>
            <Field label="Charging efficiency (%)" hint="Share of grid electricity stored in the battery">
              <NumberInput value={v.chargingEfficiency} percent min={1} max={100} onChange={(n) => onChange({ chargingEfficiency: n })} />
            </Field>
          </div>
        ) : (
          <div className="grid-form">
            <Field label="Petrol price (₹/litre)">
              <NumberInput value={v.fuelPrice} min={0} step={0.5} onChange={(n) => onChange({ fuelPrice: n })} />
            </Field>
            <Field label="Petrol price increase (%/yr)">
              <NumberInput value={v.fuelPriceEscalation} percent onChange={(n) => onChange({ fuelPriceEscalation: n })} />
            </Field>
            <Field label="Mileage degradation (%/yr)">
              <NumberInput value={v.annualMileageDegradation} percent min={0} max={99} onChange={(n) => onChange({ annualMileageDegradation: n })} />
            </Field>
          </div>
        )}
      </div>

      <div>
        <div className="subsection-title">C · Financial assumptions</div>
        <div className="grid-form">
          <Field label="Year 1 maintenance & servicing (₹)">
            <NumberInput value={v.year1Maintenance} min={0} step={500} onChange={(n) => onChange({ year1Maintenance: n })} />
          </Field>
          <Field label="Maintenance escalation (%/yr)">
            <NumberInput value={v.maintenanceEscalation} percent onChange={(n) => onChange({ maintenanceEscalation: n })} />
          </Field>
          <Field label="Year 1 insurance (₹)">
            <NumberInput value={v.year1Insurance} min={0} step={500} onChange={(n) => onChange({ year1Insurance: n })} />
          </Field>
          <Field label="Insurance change (%/yr)">
            <NumberInput value={v.insuranceAnnualChange} percent step={1} onChange={(n) => onChange({ insuranceAnnualChange: n })} />
          </Field>
          <Field label="Resale value mode">
            <select
              value={v.resaleMode}
              onChange={(e) => onChange({ resaleMode: e.target.value as 'percent' | 'fixed' })}
            >
              <option value="percent">% of purchase price</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </Field>
          {v.resaleMode === 'percent' ? (
            <Field label="Resale value (% of price)">
              <NumberInput value={v.resalePercent} percent min={0} max={100} onChange={(n) => onChange({ resalePercent: n })} />
            </Field>
          ) : (
            <Field label="Resale value (₹)">
              <NumberInput value={v.resaleFixed} min={0} step={1000} onChange={(n) => onChange({ resaleFixed: n })} />
            </Field>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '10px 0 6px', flexWrap: 'wrap' }}>
          <div className="subsection-title" style={{ margin: 0 }}>Tyres</div>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={!v.useDetailedTyreModel}
              onChange={(e) => onChange({ useDetailedTyreModel: !e.target.checked })}
            />
            Use annualized provision instead of tyre-life replacement
          </label>
        </div>
        {v.useDetailedTyreModel ? (
          <>
            <div className="grid-form">
              <Field label="Tyre life (km per set)" hint="All tyres replaced when this distance is reached">
                <NumberInput
                  value={v.tyreDetail.replacementIntervalKm}
                  min={1000}
                  step={1000}
                  onChange={(n) => onChange({ tyreDetail: { ...v.tyreDetail, replacementIntervalKm: n } })}
                />
              </Field>
              <Field label="Price per tyre (₹)">
                <NumberInput value={v.tyreDetail.pricePerTyre} min={0} step={500} onChange={(n) => onChange({ tyreDetail: { ...v.tyreDetail, pricePerTyre: n } })} />
              </Field>
              <Field label="Number of tyres">
                <NumberInput value={v.tyreDetail.numberOfTyres} min={1} max={12} onChange={(n) => onChange({ tyreDetail: { ...v.tyreDetail, numberOfTyres: Math.round(n || 1) } })} />
              </Field>
            </div>
            <div className="scenario-buttons" style={{ marginTop: 8 }}>
              <span className="inline-note">Tyre-life scenarios:</span>
              {TYRE_LIFE_SCENARIOS.map((km) => (
                <button
                  key={km}
                  className={v.tyreDetail.replacementIntervalKm === km ? 'active' : ''}
                  onClick={() => onChange({ tyreDetail: { ...v.tyreDetail, replacementIntervalKm: km } })}
                >
                  {km / 1000}k km
                </button>
              ))}
              {v.powertrain === 'electric' && (
                <span className="inline-note">
                  EVs are heavier — shorter tyre life is a reasonable what-if, but weight alone
                  doesn&apos;t determine tyre life.
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="grid-form">
            <Field label="Tyre provision (₹/yr)">
              <NumberInput value={v.year1TyreCost} min={0} step={250} onChange={(n) => onChange({ year1TyreCost: n })} />
            </Field>
            <Field label="Tyre escalation (%/yr)">
              <NumberInput value={v.tyreEscalation} percent onChange={(n) => onChange({ tyreEscalation: n })} />
            </Field>
          </div>
        )}

        <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="subsection-title" style={{ margin: 0 }}>Other one-time expenses</div>
          <button onClick={addExpense}>+ Add expense</button>
        </div>
        {v.otherExpenses.map((e) => (
          <div className="expense-row" key={e.id} style={{ marginBottom: 6 }}>
            <NumberInput
              value={e.year}
              min={1}
              max={ownershipYears}
              onChange={(n) => updateExpense(e.id, { year: Math.max(1, Math.round(n || 1)) })}
            />
            <input type="text" value={e.label} onChange={(ev) => updateExpense(e.id, { label: ev.target.value })} />
            <NumberInput value={e.amount} min={0} step={500} onChange={(n) => updateExpense(e.id, { amount: n })} />
            <button className="danger" onClick={() => removeExpense(e.id)} title="Remove expense">✕</button>
          </div>
        ))}
      </div>

      {isEv && (
        <div>
          <div className="subsection-title">D · Battery assumptions</div>
          <div className="grid-form">
            <Field label="Rated battery capacity (kWh)">
              <NumberInput value={v.batteryCapacityKwh} min={0.1} step={0.5} onChange={(n) => onChange({ batteryCapacityKwh: n })} />
            </Field>
            <Field label="Rated highway range (km)">
              <NumberInput value={v.highwayRangeKm} min={0} onChange={(n) => onChange({ highwayRangeKm: n })} />
            </Field>
            <Field label="Rated city range (km)">
              <NumberInput value={v.cityRangeKm} min={0} onChange={(n) => onChange({ cityRangeKm: n })} />
            </Field>
            <Field label="Expected cycle life (equivalent full cycles)" hint="Planning assumption, not a manufacturer specification">
              <NumberInput value={v.batteryCycleLife} min={1} step={50} onChange={(n) => onChange({ batteryCycleLife: Math.max(1, Math.round(n || 1)) })} />
            </Field>
            <Field label="Battery replacement cost (₹)" hint="Full replacement incl. labour & taxes">
              <NumberInput value={v.batteryReplacementCost} min={0} step={10000} onChange={(n) => onChange({ batteryReplacementCost: n })} />
            </Field>
            <Field label="Capacity at cycle-life limit (%)" hint="Cycle-based fade: 80% means the battery retains 80% of rated capacity after the full cycle life">
              <NumberInput value={v.capacityAtCycleLife} percent min={1} max={100} onChange={(n) => onChange({ capacityAtCycleLife: n })} />
            </Field>
            <Field label="Apply energy-efficiency degradation?">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={v.efficiencyDegradationEnabled}
                  onChange={(e) => onChange({ efficiencyDegradationEnabled: e.target.checked })}
                />
                <NumberInput
                  value={v.annualEfficiencyDegradation}
                  percent
                  min={0}
                  max={99}
                  disabled={!v.efficiencyDegradationEnabled}
                  onChange={(n) => onChange({ annualEfficiencyDegradation: n, efficiencyDegradationEnabled: true })}
                />
              </div>
            </Field>
            <Field label="Manual replacement year (optional)" hint="Leave as-is for automatic cycle-based triggering">
              <NumberInput
                value={v.manualReplacementYear ?? 0}
                min={0}
                max={ownershipYears}
                onChange={(n) => onChange({ manualReplacementYear: n > 0 ? Math.round(n) : null })}
              />
            </Field>
          </div>
          <div className="scenario-buttons" style={{ marginTop: 8 }}>
            <span className="inline-note">Cycle-life scenarios:</span>
            {CYCLE_SCENARIOS.map((c) => (
              <button
                key={c}
                className={v.batteryCycleLife === c ? 'active' : ''}
                onClick={() => onChange({ batteryCycleLife: c })}
              >
                {c} cycles
              </button>
            ))}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <ul className="issues">
          {issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
