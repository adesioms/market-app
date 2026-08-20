const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
const getQuantityScale = (unit) => unit === 'kg' || unit === 'L' ? 1000 : 1;
const parseQuantityInput = (digits, unit) => {
  const numeric = Number(onlyDigits(digits));
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric / getQuantityScale(unit);
};
const getQuantityFamily = (unit) => ['kg', 'g'].includes(unit) ? 'weight' : ['L', 'mL'].includes(unit) ? 'volume' : 'count';
const convertQuantityValue = (value, fromUnit, toUnit) => {
  if (!value || getQuantityFamily(fromUnit) !== getQuantityFamily(toUnit)) return '';
  const baseValue = getQuantityScale(fromUnit) === 1000 ? value * 1000 : value;
  return getQuantityScale(toUnit) === 1000 ? baseValue / 1000 : baseValue;
};
const quantityDigitsFromValue = (value, unit) => {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return String(Math.round(numeric * getQuantityScale(unit)));
};
const formatQuantityDigits = (digits, unit) => {
  const numeric = Number(onlyDigits(digits));
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  if (getQuantityScale(unit) === 1000) return (numeric / 1000).toFixed(3).replace('.', ',');
  return String(numeric);
};

const cases = [
  ['780 g interpreta 780 g', parseQuantityInput('780', 'g'), 780],
  ['780 kg-input interpreta 0.780 kg', parseQuantityInput('780', 'kg'), 0.78],
  ['1700 kg-input interpreta 1.700 kg', parseQuantityInput('1700', 'kg'), 1.7],
  ['formata 780 g', formatQuantityDigits('780', 'g'), '780'],
  ['formata 780 kg-input', formatQuantityDigits('780', 'kg'), '0,780'],
  ['formata 1700 kg-input', formatQuantityDigits('1700', 'kg'), '1,700'],
  ['converte 0.78 kg para dígitos g', quantityDigitsFromValue(convertQuantityValue(0.78, 'kg', 'g'), 'g'), '780'],
  ['converte 780 g para dígitos kg', quantityDigitsFromValue(convertQuantityValue(780, 'g', 'kg'), 'kg'), '780']
];
for (const [name, actual, expected] of cases) {
  if (actual !== expected) throw new Error(`${name}: esperado ${expected}, recebido ${actual}`);
}
console.log(`OK: ${cases.length} casos de máscara de quantidade`);
