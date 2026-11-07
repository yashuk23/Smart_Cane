// Shared farm vocabulary: what each reading means and what "good" looks like.

export const PARAMS = {
  Soil_Moisture: { label: 'Soil moisture', vern: 'मिट्टी की नमी', unit: '%', icon: '💧', iconName: 'water-percent', min: 30, max: 45, hard: [5, 75], placeholder: '35.0', group: 'main' },
  Soil_pH: { label: 'Soil pH', vern: 'मिट्टी का पीएच', unit: '', icon: '⚗️', iconName: 'flask-outline', min: 6.5, max: 7.5, hard: [4, 10], placeholder: '6.8', group: 'main' },
  Nitrogen_Level: { label: 'Nitrogen', vern: 'नत्रजन', unit: 'kg/ha', icon: '🌿', iconName: 'leaf', min: 140, max: 250, hard: [10, 500], placeholder: '150.0', group: 'main' },
  Phosphorus_Level: { label: 'Phosphorus', vern: 'स्फुर', unit: 'kg/ha', icon: '🌱', iconName: 'sprout', min: 15, max: 30, hard: [2, 120], placeholder: '22.0', group: 'main' },
  Potassium_Level: { label: 'Potassium', vern: 'पोटाश', unit: 'kg/ha', icon: '🍃', iconName: 'seed-outline', min: 140, max: 220, hard: [10, 450], placeholder: '160.0', group: 'main' },
  Organic_Carbon: { label: 'Organic carbon', vern: 'जीवांश कार्बन', unit: '%', icon: '🪱', iconName: 'molecule', min: 0.50, max: 0.85, hard: [0.1, 3.5], placeholder: '0.65', group: 'more' },
  Electrical_Conductivity: { label: 'Conductivity', vern: 'लवणता', unit: 'dS/m', icon: '🧂', iconName: 'lightning-bolt-outline', min: 0.2, max: 0.8, hard: [0.05, 5], placeholder: '0.50', group: 'more' },
  Temperature: { label: 'Soil temperature', vern: 'मिट्टी का तापमान', unit: '°C', icon: '🌡️', iconName: 'thermometer', min: 24, max: 34, hard: [10, 50], placeholder: '28.0', group: 'more' },
  Humidity: { label: 'Air humidity', vern: 'हवा में नमी', unit: '%', icon: '☁️', iconName: 'weather-cloudy', min: 55, max: 80, hard: [10, 100], placeholder: '65.0', group: 'more' }
};

// Clean initial empty values for farmers to enter real field data
export const DEFAULT_READING = {
  Soil_Moisture: '',
  Soil_pH: '',
  Nitrogen_Level: '',
  Phosphorus_Level: '',
  Potassium_Level: '',
  Organic_Carbon: '',
  Electrical_Conductivity: '',
  Temperature: '',
  Humidity: ''
};

export function idealText(p) {
  if (p.min != null && p.max != null) return `${p.min}–${p.max}${p.unit ? ' ' + p.unit : ''}`;
  if (p.min != null) return `${p.min} or more${p.unit ? ' ' + p.unit : ''}`;
  return `below ${p.max}${p.unit ? ' ' + p.unit : ''}`;
}

/** Simple Low / Good / High verdict for one reading. */
export function getStatus(key, value) {
  const p = PARAMS[key];
  const v = parseFloat(value);
  if (!p || isNaN(v)) return null;
  if (p.min != null && v < p.min) return { label: 'Low', tone: 'warn' };
  if (p.max != null && v > p.max) return { label: 'High', tone: 'warn' };
  return { label: 'Good', tone: 'good' };
}

export const STAGES = [
  { key: 'Sowing', label: 'Planting', title: 'Germination & sprouting', days: '0–45 days', vern: 'अंकुरण अवस्था', icon: '🌱', iconName: 'sprout',
    tip: 'Keep the soil lightly moist so the buds sprout evenly. Avoid waterlogging.' },
  { key: 'Vegetative', label: 'Tillering', title: 'Tillering', days: '45–120 days', vern: 'कल्ले फूटने की अवस्था', icon: '🌿', iconName: 'leaf',
    tip: 'Keep moisture even around the roots. Standing water causes yellow leaves and root rot. Mulching with dry cane trash can save up to a third of your irrigation water.' },
  { key: 'Flowering', label: 'Grand growth', title: 'Grand growth', days: '120–270 days', vern: 'तीव्र बढ़वार अवस्था', icon: '🎋', iconName: 'arrow-top-right-bold-outline',
    tip: 'This is when cane needs the most water. Do not let the field dry out between irrigations.' },
  { key: 'Harvest', label: 'Ripening', title: 'Ripening', days: '270–360 days', vern: 'पकाव अवस्था', icon: '🌾', iconName: 'barley',
    tip: 'Reduce watering as harvest nears so sugar content builds up in the stalks.' }
];

export const getStage = (key) => STAGES.find((s) => s.key === key) || STAGES[1];
