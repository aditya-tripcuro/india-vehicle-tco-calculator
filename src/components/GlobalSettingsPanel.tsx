import type { GlobalSettings, VehicleConfig } from '../engine/types';
import { formatNumber } from '../engine/format';
import { Field, NumberInput } from './inputs';

interface Props {
  settings: GlobalSettings;
  vehicles: VehicleConfig[];
  onChange: (patch: Partial<GlobalSettings>) => void;
}

export function GlobalSettingsPanel({ settings, vehicles, onChange }: Props) {
  const annualHw = settings.monthlyHighwayKm * 12;
  const annualCity = settings.monthlyCityKm * 12;

  return (
    <div className="card">
      <div className="grid-form">
        <Field label="Ownership period (years)">
          <NumberInput
            value={settings.ownershipYears}
            min={1}
            max={50}
            onChange={(n) => onChange({ ownershipYears: Math.max(1, Math.round(n || 1)) })}
          />
        </Field>
        <Field label="Opportunity cost of capital (%/yr)">
          <NumberInput
            value={settings.opportunityCostRate}
            percent
            step={0.5}
            onChange={(n) => onChange({ opportunityCostRate: n })}
          />
        </Field>
        <Field label="Baseline vehicle (opportunity-cost reference)">
          <select
            value={settings.baselineVehicleId}
            onChange={(e) => onChange({ baselineVehicleId: e.target.value })}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Monthly highway driving (km)" hint="Common to all vehicles">
          <NumberInput
            value={settings.monthlyHighwayKm}
            min={0}
            onChange={(n) => onChange({ monthlyHighwayKm: n })}
          />
        </Field>
        <Field label="Monthly city driving (km)" hint="Common to all vehicles">
          <NumberInput
            value={settings.monthlyCityKm}
            min={0}
            onChange={(n) => onChange({ monthlyCityKm: n })}
          />
        </Field>
        <Field label="Purchase on loan?">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={settings.loan.enabled}
              onChange={(e) => onChange({ loan: { ...settings.loan, enabled: e.target.checked } })}
              style={{ width: 'auto' }}
            />
            <span className="inline-note">Finance the purchase</span>
          </div>
        </Field>
        <Field label="Down payment (% of price)" hint="Your own money — the loan covers the rest">
          <NumberInput
            value={settings.loan.downPaymentPercent}
            percent
            min={0}
            max={100}
            disabled={!settings.loan.enabled}
            onChange={(n) => onChange({ loan: { ...settings.loan, downPaymentPercent: n } })}
          />
        </Field>
        <Field label="Loan interest rate (%/yr)" hint="Reducing balance">
          <NumberInput
            value={settings.loan.annualInterestRate}
            percent
            step={0.25}
            disabled={!settings.loan.enabled}
            onChange={(n) => onChange({ loan: { ...settings.loan, annualInterestRate: n } })}
          />
        </Field>
        <Field label="Loan tenure (years)">
          <NumberInput
            value={settings.loan.tenureYears}
            min={1}
            max={30}
            disabled={!settings.loan.enabled}
            onChange={(n) => onChange({ loan: { ...settings.loan, tenureYears: Math.max(1, Math.round(n || 1)) } })}
          />
        </Field>
        <Field label="Annual distance growth (%/yr, optional)">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={settings.distanceGrowthEnabled}
              onChange={(e) => onChange({ distanceGrowthEnabled: e.target.checked })}
              style={{ width: 'auto' }}
            />
            <NumberInput
              value={settings.annualDistanceGrowth}
              percent
              disabled={!settings.distanceGrowthEnabled}
              onChange={(n) => onChange({ annualDistanceGrowth: n, distanceGrowthEnabled: true })}
            />
          </div>
        </Field>
      </div>
      <p className="inline-note" style={{ marginBottom: 0, marginTop: 10 }}>
        Annual driving (same for every vehicle): {formatNumber(annualHw)} km highway +{' '}
        {formatNumber(annualCity)} km city = <b>{formatNumber(annualHw + annualCity)} km</b>.
        Distances stay constant unless annual growth is enabled.
        {settings.loan.enabled && (
          <>
            {' '}Loan is ON: interest joins cash TCO year by year (reducing balance over the
            tenure), and the opportunity cost is computed on the <b>down-payment</b> difference
            only — the financed portion is not your money at stake.
          </>
        )}
      </p>
    </div>
  );
}
