export type Powertrain = 'petrol' | 'electric';

export interface OneTimeExpense {
  id: string;
  /** 1-based ownership year in which the expense occurs */
  year: number;
  label: string;
  amount: number;
}

export interface TyreDetail {
  pricePerTyre: number;
  numberOfTyres: number;
  replacementIntervalKm: number;
}

export interface VehicleConfig {
  id: string;
  name: string;
  powertrain: Powertrain;

  purchasePrice: number;
  /** Rated full-charge range (km). EV only — petrol vehicles carry no range. */
  highwayRangeKm: number;
  cityRangeKm: number;

  // Petrol
  highwayMileage: number; // km/litre
  cityMileage: number; // km/litre
  annualMileageDegradation: number; // fraction (0.005 = 0.5%/yr)
  fuelPrice: number; // ₹/litre
  fuelPriceEscalation: number; // fraction

  // Electric
  batteryCapacityKwh: number; // rated kWh
  highwayEfficiency: number; // km/kWh
  cityEfficiency: number; // km/kWh
  efficiencyDegradationEnabled: boolean;
  annualEfficiencyDegradation: number; // fraction
  electricityPrice: number; // ₹/kWh
  electricityEscalation: number; // fraction
  chargingEfficiency: number; // fraction (0,1]
  batteryCycleLife: number; // equivalent full cycles
  batteryReplacementCost: number; // ₹
  /** Fraction of rated capacity remaining when the cycle-life limit is reached
   *  (0.8 = 80% at 1,200 cycles). Capacity fade is cycle-based, not time-based. */
  capacityAtCycleLife: number;
  manualReplacementYear: number | null;

  // Financial
  year1Maintenance: number;
  maintenanceEscalation: number; // fraction
  year1Insurance: number;
  insuranceAnnualChange: number; // fraction, may be negative
  year1TyreCost: number; // annualized provision
  tyreEscalation: number; // fraction
  useDetailedTyreModel: boolean;
  tyreDetail: TyreDetail;
  /** Fraction of purchase price retained if sold at that age. The curve is
   *  fitted through these anchors: (0, 100%), (1, year1), (5, year5),
   *  (10, year10), (15, year15); ownership ending between anchors
   *  interpolates linearly; beyond 15 years the 10→15 slope continues,
   *  floored at zero. */
  resaleSchedule: { year1: number; year5: number; year10: number; year15: number };
  otherExpenses: OneTimeExpense[];
}

export interface LoanSettings {
  enabled: boolean;
  /** Fraction of the purchase price paid upfront by the buyer. */
  downPaymentPercent: number;
  /** Reducing-balance loan interest rate, per year. */
  annualInterestRate: number;
  tenureYears: number;
}

export interface GlobalSettings {
  ownershipYears: number;
  opportunityCostRate: number; // fraction
  /** Driving profile — shared by every vehicle in the comparison. */
  monthlyHighwayKm: number;
  monthlyCityKm: number;
  /** Financing: when enabled, interest joins cash TCO and the opportunity-cost
   *  base becomes the down payment instead of the full price difference. */
  loan: LoanSettings;
  baselineVehicleId: string;
  distanceGrowthEnabled: boolean;
  annualDistanceGrowth: number; // fraction
}

export interface BatteryYearState {
  batteryIndex: number;
  installedYear: number;
  batteryAge: number;
  ratedCapacityKwh: number;
  remainingCapacityKwh: number;
  remainingCapacityPercent: number;
  annualEfc: number;
  cumulativeEfc: number;
  remainingCycles: number;
  replacementThisYear: boolean;
  highwayRangeKm: number;
  cityRangeKm: number;
}

export interface VehicleYearResult {
  year: number;
  highwayKm: number;
  cityKm: number;
  totalKm: number;

  // Petrol
  highwayLitres: number;
  cityLitres: number;
  totalLitres: number;

  // Electric
  highwayKwh: number;
  cityKwh: number;
  batteryKwh: number;
  gridKwh: number;

  /** ₹ per litre (petrol) or ₹ per kWh (EV) in that year */
  energyPrice: number;
  energyCost: number;

  maintenance: number;
  batteryReplacementCost: number;
  insurance: number;
  tyres: number;
  other: number;
  /** Interest paid on the vehicle loan in this year (financing cost, part of
   *  cash TCO — not an opportunity-cost adjustment). */
  loanInterest: number;

  operatingCost: number;
  purchaseApplied: number;
  resale: number;

  cumulativeCashTco: number;
  opportunityAdjustment: number;
  cumulativeForegoneEarnings: number;
  cumulativeEconomicTco: number;

  battery: BatteryYearState | null;
}

export interface BatteryReplacementRecord {
  /** 0 = original battery */
  batteryIndex: number;
  installedYear: number;
  replacedInYear: number;
  cost: number;
  efcAtReplacement: number;
}

export interface InstalledBatterySummary {
  batteryIndex: number;
  installedYear: number;
  /** EFC accumulated on this battery by replacement or end of ownership */
  accumulatedEfc: number;
  replacedInYear: number | null;
}

export interface VehicleTotals {
  energyCost: number;
  maintenanceExBattery: number;
  batteryReplacementTotal: number;
  insurance: number;
  tyres: number;
  other: number;
  loanInterestTotal: number;
  operatingTotal: number;
  purchasePrice: number;
  resale: number;
  cashTco: number;
  /** Extra personal money put in upfront vs the baseline: the full price
   *  difference when paying cash, the down-payment difference when on loan. */
  extraUpfront: number;
  downPayment: number;
  loanPrincipal: number;
  foregoneEarningsAtEnd: number;
  economicTco: number;
  unitsTotal: number; // litres (petrol) or grid kWh (EV)
  batteryKwhTotal: number;
  batteries: InstalledBatterySummary[];
  totalEfcOriginalBattery: number;
  finalRemainingCapacityKwh: number;
  finalRemainingCapacityPercent: number;
  replacements: BatteryReplacementRecord[];
  projectedReplacementYear: number | null;
}

export interface VehicleResult {
  config: VehicleConfig;
  isBaseline: boolean;
  years: VehicleYearResult[];
  totals: VehicleTotals;
}

export interface ComparisonResult {
  ownershipYears: number;
  baselineId: string;
  vehicles: VehicleResult[];
}

export interface AppState {
  settings: GlobalSettings;
  vehicles: VehicleConfig[];
}

export type TcoMetric = 'annual' | 'cash' | 'economic';
