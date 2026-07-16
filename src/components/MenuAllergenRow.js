import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ALLERGENS, normalizeAllergens } from '../constants/allergens';
import { safeImageUri } from '../utils/helper';

/**
 * Standard allergen icons + custom uploaded allergen images for a menu item.
 */
export default function MenuAllergenRow({
  allergens,
  allergenIconUrls,
  style,
  iconSize = 16,
}) {
  const keys = normalizeAllergens(allergens);
  const urls = normalizeAllergens(allergenIconUrls);
  if (keys.length === 0 && urls.length === 0) return null;

  return (
    <View style={[styles.row, style]}>
      {keys.map(key => {
        const def = ALLERGENS.find(a => a.key === key);
        return (
          <View key={key} style={styles.iconWrap} accessibilityLabel={def?.label || key}>
            <MaterialCommunityIcons
              name={def?.icon || 'alert-circle-outline'}
              size={iconSize}
              color="#C45A00"
            />
          </View>
        );
      })}
      {urls.map((url, index) => (
        <Image
          key={`custom-${index}-${url}`}
          source={{ uri: safeImageUri(url) }}
          style={[
            styles.customIcon,
            { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
          ]}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF5EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customIcon: {
    borderWidth: 1,
    borderColor: '#F0D5B8',
    backgroundColor: '#FFF',
  },
});
