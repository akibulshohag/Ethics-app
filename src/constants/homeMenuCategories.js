import { cuisineImageUriFromKey } from './cuisineCategoryImages';

/** Fixed home menu category chips (HomeOneScreen + category results). */
export const HOME_MENU_CATEGORIES = [
  { key: 'indian', label: 'Indian food' },
  { key: 'chinese', label: 'Chinese food' },
  { key: 'italian', label: 'Italian food' },
  { key: 'chef_specialties', label: 'Chef specialties' },
  { key: 'starters', label: 'Starters' },
  { key: 'mains', label: 'Mains' },
  { key: 'desserts', label: 'Desserts' },
  { key: 'rice_or_naan', label: 'Rice or nan' },
  { key: 'tandoori', label: 'Tandoori' },
  { key: 'tikka', label: 'Tikka' },
];

export function buildHomeMenuCategoryChips() {
  return HOME_MENU_CATEGORIES.map(cat => ({
    ...cat,
    imageUri: cuisineImageUriFromKey(cat.key),
  }));
}
