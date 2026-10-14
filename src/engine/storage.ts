import type { AppState } from './types';
import { hydrateState } from './defaults';

/** Browser-local scenario storage. No backend involved. */

const SCENARIO_KEY = 'tco-scenarios-v1';
const CURRENT_KEY = 'tco-current-state-v1';

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  state: AppState;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function listScenarios(): SavedScenario[] {
  return readJson<SavedScenario[]>(SCENARIO_KEY) ?? [];
}

export function saveScenario(name: string, state: AppState): SavedScenario {
  const scenarios = listScenarios();
  const scenario: SavedScenario = {
    id: `scn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    savedAt: new Date().toISOString(),
    state,
  };
  scenarios.push(scenario);
  writeJson(SCENARIO_KEY, scenarios);
  return scenario;
}

export function loadScenarioState(scenario: SavedScenario): AppState {
  return hydrateState(scenario.state);
}

export function deleteScenario(id: string): void {
  writeJson(
    SCENARIO_KEY,
    listScenarios().filter((s) => s.id !== id),
  );
}

export function saveCurrentState(state: AppState): void {
  writeJson(CURRENT_KEY, state);
}

export function loadCurrentState(): AppState | null {
  const raw = readJson<unknown>(CURRENT_KEY);
  return raw ? hydrateState(raw) : null;
}
