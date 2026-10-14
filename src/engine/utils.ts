import type { VehicleConfig } from './types';

export function resaleValue(v: VehicleConfig): number {
  return v.resaleMode === 'fixed' ? v.resaleFixed : v.purchasePrice * v.resalePercent;
}
