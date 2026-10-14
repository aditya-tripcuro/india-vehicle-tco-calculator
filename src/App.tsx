import { useEffect, useMemo, useState } from 'react';
import type { AppState, GlobalSettings, TcoMetric, VehicleConfig } from './engine/types';
import { blankVehicle, hydrateState, initialState, uid } from './engine/defaults';
import { calculateComparison } from './engine/calc';
import { annualRowsToCsv, buildAnnualRows, buildFullReport, downloadFile } from './engine/csv';
import { validateSettings, validateVehicle } from './engine/validate';
import {
  deleteScenario,
  listScenarios,
  loadCurrentState,
  saveCurrentState,
  saveScenario,
  type SavedScenario,
} from './engine/storage';
import { GlobalSettingsPanel } from './components/GlobalSettingsPanel';
import { VehiclePanel } from './components/VehiclePanel';
import { SummaryCards } from './components/SummaryCards';
import { TcoChart } from './components/TcoChart';
import { AnnualTable } from './components/AnnualTable';
import { MaintenanceTable } from './components/MaintenanceTable';
import { BatterySection } from './components/BatterySection';
import { FeatureComparison } from './components/FeatureComparison';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadCurrentState() ?? initialState());
  const [metric, setMetric] = useState<TcoMetric>('cash');
  const [includeOpportunity, setIncludeOpportunity] = useState(true);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => listScenarios());
  const [scenarioName, setScenarioName] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('');

  const comparison = useMemo(
    () => calculateComparison(state.vehicles, state.settings),
    [state],
  );

  useEffect(() => {
    saveCurrentState(state);
  }, [state]);

  const settingIssues = validateSettings(state.settings);

  function updateSettings(patch: Partial<GlobalSettings>) {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }

  function updateVehicle(id: string, patch: Partial<VehicleConfig>) {
    setState((s) => ({
      ...s,
      vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  }

  function addVehicle(powertrain: 'petrol' | 'electric') {
    setState((s) => {
      const v = blankVehicle(powertrain, s.vehicles.length + 1);
      return { ...s, vehicles: [...s.vehicles, v] };
    });
  }

  function duplicateVehicle(id: string) {
    setState((s) => {
      const idx = s.vehicles.findIndex((v) => v.id === id);
      if (idx === -1) return s;
      const src = s.vehicles[idx];
      const copy: VehicleConfig = JSON.parse(JSON.stringify(src));
      copy.id = uid();
      copy.name = `${src.name} (copy)`;
      copy.otherExpenses = copy.otherExpenses.map((e) => ({ ...e, id: uid('exp') }));
      const vehicles = [...s.vehicles];
      vehicles.splice(idx + 1, 0, copy);
      return { ...s, vehicles };
    });
  }

  function removeVehicle(id: string) {
    setState((s) => {
      if (s.vehicles.length <= 1) return s;
      const vehicles = s.vehicles.filter((v) => v.id !== id);
      const settings = { ...s.settings };
      if (settings.baselineVehicleId === id) settings.baselineVehicleId = vehicles[0].id;
      return { settings, vehicles };
    });
  }

  function resetAll() {
    setState(initialState());
    setMetric('cash');
    setIncludeOpportunity(true);
  }

  function handleExportCsv() {
    const rows = buildAnnualRows(comparison);
    downloadFile('annual-tco-table.csv', annualRowsToCsv(comparison, rows), 'text/csv;charset=utf-8');
  }

  function handleExportReport() {
    const report = buildFullReport(state, comparison);
    downloadFile(
      `tco-report-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(report, null, 2),
      'application/json',
    );
  }

  function handleSaveScenario() {
    const name = scenarioName.trim() || `Scenario ${scenarios.length + 1}`;
    saveScenario(name, state);
    setScenarios(listScenarios());
    setScenarioName('');
  }

  function handleLoadScenario(id: string) {
    const sc = scenarios.find((s) => s.id === id);
    if (sc) {
      setState(hydrateState(sc.state));
      setSelectedScenarioId(id);
    }
  }

  function handleDeleteScenario(id: string) {
    deleteScenario(id);
    setScenarios(listScenarios());
    setSelectedScenarioId((cur) => (cur === id ? '' : cur));
  }

  const vehicleIssues = state.vehicles.flatMap((v) =>
    validateVehicle(v, state.settings.ownershipYears).map((issue) => `${v.name}: ${issue}`),
  );

  return (
    <>
      <header className="app-header">
        <h1>🚗 15-Year Vehicle TCO Calculator — Petrol vs Electric (India)</h1>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Scenario name"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            style={{ width: 140 }}
          />
          <button className="primary" onClick={handleSaveScenario}>
            Save scenario
          </button>
          <select
            value={selectedScenarioId}
            onChange={(e) => e.target.value && handleLoadScenario(e.target.value)}
            disabled={scenarios.length === 0}
            style={{ width: 170 }}
            aria-label="Load scenario"
          >
            <option value="">Load scenario…</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({new Date(s.savedAt).toLocaleDateString('en-IN')})
              </option>
            ))}
          </select>
          <button onClick={() => selectedScenarioId && handleDeleteScenario(selectedScenarioId)} disabled={!selectedScenarioId}>
            Delete scenario
          </button>
          <button onClick={handleExportCsv}>⬇ CSV</button>
          <button onClick={handleExportReport}>⬇ Full report</button>
          <button className="danger" onClick={resetAll}>
            Reset to defaults
          </button>
        </div>
      </header>

      <main>
        {(settingIssues.length > 0 || vehicleIssues.length > 0) && (
          <div className="card" style={{ borderColor: 'var(--bad)', marginBottom: 20 }}>
            <b style={{ color: 'var(--bad)' }}>Please fix these inputs:</b>
            <ul className="issues">
              {[...settingIssues, ...vehicleIssues].map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <section>
          <h2>Global assumptions</h2>
          <p className="section-sub">
            Applied to every vehicle. Every value below is editable; all outputs recalculate
            immediately. All figures are planning assumptions, not guarantees.
          </p>
          <GlobalSettingsPanel
            settings={state.settings}
            vehicles={state.vehicles}
            onChange={updateSettings}
          />
        </section>

        <section>
          <h2>
            Vehicles{' '}
            <span className="inline-note" style={{ fontWeight: 400 }}>
              (add, duplicate or remove vehicles — every assumption is editable)
            </span>
          </h2>
          <div className="card-actions" style={{ marginBottom: 10 }}>
            <button onClick={() => addVehicle('petrol')}>+ Add petrol vehicle</button>
            <button onClick={() => addVehicle('electric')}>+ Add electric vehicle</button>
          </div>
          <div className="vehicle-grid">
            {state.vehicles.map((v, i) => (
              <VehiclePanel
                key={v.id}
                vehicle={v}
                index={i}
                ownershipYears={state.settings.ownershipYears}
                canRemove={state.vehicles.length > 1}
                onChange={(patch) => updateVehicle(v.id, patch)}
                onDuplicate={() => duplicateVehicle(v.id)}
                onRemove={() => removeVehicle(v.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <h2>Vehicle feature comparison</h2>
          <p className="section-sub">
            Indicative specifications and equipment for the three preloaded models — reference
            information for shopping, separate from the financial calculation below.
          </p>
          <FeatureComparison />
        </section>

        <section>
          <h2>Summary</h2>
          <p className="section-sub">
            Cumulative totals reconcile with the annual table below. Economic TCO = cash TCO plus
            foregone investment earnings on the extra upfront capital versus the selected baseline
            ({state.vehicles.find((v) => v.id === state.settings.baselineVehicleId)?.name ?? 'baseline'}).
          </p>
          <SummaryCards comparison={comparison} />
        </section>

        <section>
          <h2>TCO graph</h2>
          <TcoChart
            comparison={comparison}
            metric={metric}
            includeOpportunity={includeOpportunity}
            onMetricChange={setMetric}
            onIncludeOpportunityChange={setIncludeOpportunity}
          />
        </section>

        <section>
          <h2>Annual TCO table</h2>
          <p className="section-sub">
            One row per year for every vehicle: consumption, prices, expenditure, cumulative totals
            and EV battery state. Battery-replacement years are highlighted.
          </p>
          <AnnualTable comparison={comparison} onExportCsv={handleExportCsv} />
        </section>

        <section>
          <h2>Maintenance, servicing, tyres &amp; insurance</h2>
          <p className="section-sub">
            Expand a vehicle’s maintenance cell to inspect its components. Battery replacements are
            shown as a separate line item in the year they occur.
          </p>
          <MaintenanceTable comparison={comparison} />
        </section>

        <section>
          <h2>Battery condition &amp; replacement history</h2>
          <p className="section-sub">
            Capacity degradation is tracked separately from cycle life. Replacements trigger
            automatically when the installed battery’s cumulative equivalent full cycles reach the
            configured cycle-life limit.
          </p>
          <BatterySection
            comparison={comparison}
            onSetCycleLife={(vehicleId, cycles) => updateVehicle(vehicleId, { batteryCycleLife: cycles })}
          />
        </section>

        <p className="footer-note">
          All default values are planning assumptions, not guarantees or official manufacturer
          specifications. Calculations use unrounded intermediates; only displayed values are
          rounded. Scenarios are saved locally in your browser — no data leaves your device.
          Fuel, electricity, maintenance and battery-replacement figures vary in the real world;
          use the scenario controls to test sensitivity.
        </p>
      </main>
    </>
  );
}
