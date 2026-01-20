/**
 * Location Constants
 * Countries, US states, and Canadian provinces
 */

export interface CountryOption {
  code: string;
  name: string;
}

export interface StateOption {
  code: string;
  name: string;
}

// TODO: Populate with actual data from creso-ai
export const countries: CountryOption[] = [];

export const usStates: StateOption[] = [];

export const canadianProvinces: StateOption[] = [];
