// Convert ISO country code to flag emoji
export const getFlagEmoji = (countryCode: string): string => {
  const code = countryCode.toUpperCase();
  const codePoints = [...code].map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Country names mapping
export const countryNames: Record<string, string> = {
  RU: 'Russia',
  US: 'United States',
  JP: 'Japan',
  CN: 'China',
  DE: 'Germany',
  FR: 'France',
  GB: 'United Kingdom',
  IT: 'Italy',
  ES: 'Spain',
  BR: 'Brazil',
  AU: 'Australia',
  CA: 'Canada',
  KR: 'South Korea',
  IN: 'India',
  MX: 'Mexico',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
  DK: 'Denmark',
  PL: 'Poland',
  UA: 'Ukraine',
  TR: 'Turkey',
  GR: 'Greece',
  PT: 'Portugal',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  ZA: 'South Africa',
  EG: 'Egypt',
  TH: 'Thailand',
  VN: 'Vietnam',
  ID: 'Indonesia',
  MY: 'Malaysia',
  SG: 'Singapore',
  PH: 'Philippines',
  NZ: 'New Zealand',
  AT: 'Austria',
  CH: 'Switzerland',
  BE: 'Belgium',
  CZ: 'Czech Republic',
  HU: 'Hungary',
  RO: 'Romania',
  IE: 'Ireland',
  IL: 'Israel',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
};

export const getCountryName = (code: string): string => {
  return countryNames[code.toUpperCase()] || code;
};
