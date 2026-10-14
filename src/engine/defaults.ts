import type { AppState, GlobalSettings, VehicleConfig } from './types';

/**
 * Default planning assumptions for the three preloaded vehicles.
 * All figures are user-editable planning assumptions, not guarantees or
 * official manufacturer specifications.
 */

export const DEFAULT_SETTINGS: GlobalSettings = {
  ownershipYears: 15,
  opportunityCostRate: 0.08,
  monthlyHighwayKm: 800,
  monthlyCityKm: 400,
  baselineVehicleId: 'brezza',
  distanceGrowthEnabled: false,
  annualDistanceGrowth: 0,
};

const sharedFinancial = {
  maintenanceEscalation: 0.05,
  insuranceAnnualChange: -0.03,
  tyreEscalation: 0.04,
  // Tyres are modelled by per-vehicle tyre life (km per set). The annualized
  // provision is only used when the user explicitly opts out.
  useDetailedTyreModel: true,
  resaleMode: 'percent' as const,
  resalePercent: 0.05,
  resaleFixed: 0,
  otherExpenses: [],
};

export function makeDefaultVehicles(): VehicleConfig[] {
  return [
    {
      id: 'brezza',
      name: 'Maruti Suzuki Brezza ZXi AT',
      powertrain: 'petrol',
      purchasePrice: 1_370_000,
      highwayRangeKm: 0,
      cityRangeKm: 0,
      highwayMileage: 17,
      cityMileage: 11,
      annualMileageDegradation: 0.005,
      fuelPrice: 115,
      fuelPriceEscalation: 0.02,
      batteryCapacityKwh: 0,
      highwayEfficiency: 0,
      cityEfficiency: 0,
      efficiencyDegradationEnabled: false,
      annualEfficiencyDegradation: 0,
      electricityPrice: 8,
      electricityEscalation: 0.03,
      chargingEfficiency: 0.9,
      batteryCycleLife: 1200,
      batteryReplacementCost: 800_000,
      annualBatteryDegradation: 0.02,
      manualReplacementYear: null,
      year1Maintenance: 12_000,
      year1Insurance: 22_000,
      year1TyreCost: 7_000,
      tyreDetail: { pricePerTyre: 7_000, numberOfTyres: 4, replacementIntervalKm: 50_000 },
      ...sharedFinancial,
    },
    {
      id: 'venue',
      name: 'Hyundai Venue HX6 DCT Turbo',
      powertrain: 'petrol',
      purchasePrice: 1_435_000,
      highwayRangeKm: 0,
      cityRangeKm: 0,
      highwayMileage: 14.3,
      cityMileage: 9.9,
      annualMileageDegradation: 0.005,
      fuelPrice: 115,
      fuelPriceEscalation: 0.02,
      batteryCapacityKwh: 0,
      highwayEfficiency: 0,
      cityEfficiency: 0,
      efficiencyDegradationEnabled: false,
      annualEfficiencyDegradation: 0,
      electricityPrice: 8,
      electricityEscalation: 0.03,
      chargingEfficiency: 0.9,
      batteryCycleLife: 1200,
      batteryReplacementCost: 800_000,
      annualBatteryDegradation: 0.02,
      manualReplacementYear: null,
      year1Maintenance: 15_000,
      year1Insurance: 24_000,
      year1TyreCost: 7_500,
      tyreDetail: { pricePerTyre: 7_500, numberOfTyres: 4, replacementIntervalKm: 50_000 },
      ...sharedFinancial,
    },
    {
      id: 'evitara',
      name: 'Maruti Suzuki e Vitara Delta',
      powertrain: 'electric',
      purchasePrice: 1_768_000,
      highwayRangeKm: 235,
      cityRangeKm: 343,
      highwayMileage: 0,
      cityMileage: 0,
      annualMileageDegradation: 0,
      fuelPrice: 115,
      fuelPriceEscalation: 0.02,
      batteryCapacityKwh: 49,
      highwayEfficiency: 4.8,
      cityEfficiency: 7.0,
      efficiencyDegradationEnabled: false,
      annualEfficiencyDegradation: 0,
      electricityPrice: 8,
      electricityEscalation: 0.03,
      chargingEfficiency: 0.9,
      batteryCycleLife: 1200,
      batteryReplacementCost: 800_000,
      annualBatteryDegradation: 0.02,
      manualReplacementYear: null,
      year1Maintenance: 8_000,
      year1Insurance: 28_000,
      year1TyreCost: 8_500,
      tyreDetail: { pricePerTyre: 8_500, numberOfTyres: 4, replacementIntervalKm: 50_000 },
      ...sharedFinancial,
    },
  ];
}

export function initialState(): AppState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    vehicles: makeDefaultVehicles(),
  };
}

/** Merge a (possibly stale) persisted state onto the current defaults so older
 *  saved scenarios keep working after schema changes. */
export function hydrateState(raw: unknown): AppState {
  const base = initialState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  const settings = { ...base.settings, ...(r.settings ?? {}) };
  const vehicles =
    Array.isArray(r.vehicles) && r.vehicles.length > 0
      ? r.vehicles.map((v) => {
          const template =
            base.vehicles.find((b) => b.powertrain === v?.powertrain) ?? base.vehicles[0];
          return {
            ...template,
            ...v,
            tyreDetail: { ...template.tyreDetail, ...(v?.tyreDetail ?? {}) },
            otherExpenses: Array.isArray(v?.otherExpenses) ? v.otherExpenses : [],
          } as VehicleConfig;
        })
      : base.vehicles;
  if (!vehicles.some((v) => v.id === settings.baselineVehicleId)) {
    settings.baselineVehicleId = vehicles[0].id;
  }
  return { settings, vehicles };
}

let counter = 0;
export function uid(prefix = 'v'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function blankVehicle(powertrain: 'petrol' | 'electric', index: number): VehicleConfig {
  const base: VehicleConfig = {
    ...makeDefaultVehicles()[powertrain === 'petrol' ? 0 : 2],
    id: uid(),
    name: powertrain === 'petrol' ? `New petrol vehicle ${index}` : `New EV ${index}`,
  };
  return JSON.parse(JSON.stringify(base));
}
