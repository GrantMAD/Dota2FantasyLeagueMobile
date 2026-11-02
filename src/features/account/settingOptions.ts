const countryCodes = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ
EC EE EG EH ER ES ET
FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
HK HM HN HR HT HU
ID IE IL IM IN IO IQ IR IS IT
JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ
LA LB LC LI LK LR LS LT LU LV LY
MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
NA NC NE NF NG NI NL NO NP NR NU NZ
OM
PA PE PF PG PH PK PL PM PN PR PS PT PW PY
QA
RE RO RS RU RW
SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
UA UG UM US UY UZ
VA VC VE VG VI VN VU
WF WS
YE YT
ZA ZM ZW
`.trim().split(/\s+/);

export interface SettingOption {
  value: string;
  label: string;
  description?: string;
}

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const uniqueCountryCodes = Array.from(new Set([...countryCodes, 'UK']));

export const MOBILE_COUNTRY_OPTIONS: SettingOption[] = uniqueCountryCodes
  .map((code) => ({ value: code, label: countryNames.of(code) ?? code }))
  .sort((a, b) => a.label.localeCompare(b.label, 'en'));

export const MOBILE_TIMEZONE_OPTIONS: SettingOption[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST)' },
  { value: 'America/Toronto', label: 'Eastern Time (Canada)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Central Europe (CET)' },
  { value: 'Asia/Manila', label: 'Manila (PHT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
];

const countryTimezoneDefaults: Record<string, string> = {
  ZA: 'Africa/Johannesburg',
  US: 'America/New_York',
  CA: 'America/Toronto',
  GB: 'Europe/London',
  UK: 'Europe/London',
  DE: 'Europe/Berlin',
  PH: 'Asia/Manila',
  SG: 'Asia/Singapore',
};

export function getDefaultTimezoneForCountry(countryCode: string): string | null {
  return countryTimezoneDefaults[countryCode.toUpperCase()] ?? null;
}
