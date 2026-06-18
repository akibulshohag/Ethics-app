import { normalizeAllergens } from '../constants/allergens';

/** Map API menu item to flat list row fields (includes allergens for display/edit). */
export function mapMenuListRow(menuItem) {
  if (!menuItem) return null;
  const normalized = normalizeMenuItemFromApi(menuItem);
  return {
    type: 'menu',
    id: normalized.id,
    itemName: normalized.itemName,
    price: normalized.price,
    imageUrl: normalized.imageUrl,
    description: normalized.description,
    allergens: normalized.allergens,
    allergenIconUrls: normalized.allergenIconUrls,
    categoryId: normalized.categoryId,
    categoryName: normalized.category?.name,
  };
}

/** Ensure category relation + allergen arrays are present after create/update/load. */
export function normalizeMenuItemFromApi(item, categories = []) {
  if (!item) return item;
  const categoryId = item.categoryId || item.category?.id || null;
  const category =
    item.category ||
    (categoryId
      ? (categories || []).find(c => String(c.id) === String(categoryId))
      : null) ||
    null;
  return {
    ...item,
    categoryId,
    category,
    allergens: normalizeAllergens(item.allergens),
    allergenIconUrls: normalizeAllergens(item.allergenIconUrls),
  };
}
