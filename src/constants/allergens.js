export const ALLERGENS = [
  { key: 'gluten', label: 'Gluten', icon: 'wheat' },
  { key: 'nuts', label: 'Nuts', icon: 'peanut' },
  { key: 'milk', label: 'Milk', icon: 'cow' },
  { key: 'egg', label: 'Egg', icon: 'egg' },
  { key: 'fish', label: 'Fish', icon: 'fish' },
  { key: 'shellfish', label: 'Shellfish', icon: 'shrimp' },
  { key: 'soy', label: 'Soy', icon: 'leaf' },
  { key: 'sesame', label: 'Sesame', icon: 'seed' },
  { key: 'mustard', label: 'Mustard', icon: 'bottle-tonic-outline' },
  { key: 'celery', label: 'Celery', icon: 'sprout' },
  { key: 'sulphites', label: 'Sulphites', icon: 'chemical-weapon' },
  { key: 'lupin', label: 'Lupin', icon: 'flower-outline' },
];

export const normalizeAllergens = val => {
  const arr = Array.isArray(val) ? val : [];
  return arr.map(a => String(a).trim()).filter(Boolean);
};

