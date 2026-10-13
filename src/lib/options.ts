export const COMMON_CURRENCIES = ["EUR", "RSD", "USD", "GBP", "CHF", "HUF", "BAM", "MKD", "HRK", "RON", "BGN", "CZK", "PLN", "SEK", "NOK", "DKK", "TRY", "AED"];

export const LOCALES = [
  { value: "en", label: "English" },
  { value: "sr", label: "Srpski" },
];

export function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC", "Europe/Belgrade"];
  }
}

export const OUTLET_TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  bar: "Bar / Lounge",
  breakfast: "Breakfast",
  banqueting: "Banqueting & events",
  room_service: "Room service",
  cafe: "Café",
  production_kitchen: "Production kitchen",
  other: "Other",
};
