import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { hasMenuImageUrl, safeImageUri } from '../utils/helper';

/**
 * Menu item / menu file thumbnail with a consistent "No image" placeholder.
 */
export default function MenuItemThumbnail({
  uri,
  style,
  imageStyle,
  showLabel = true,
  label = 'No image',
  iconName = 'image-off-outline',
  iconSize,
  iconColor = '#B8B8B8',
  borderColor = '#E5E7EB',
}) {
  const flatStyle = StyleSheet.flatten(style) || {};
  const flatImageStyle = StyleSheet.flatten(imageStyle) || {};
  const width = flatImageStyle.width ?? flatStyle.width ?? 56;
  const height = flatImageStyle.height ?? flatStyle.height ?? 56;
  const resolvedIconSize =
    iconSize ?? (Math.min(Number(width) || 56, Number(height) || 56) > 80 ? 30 : 22);
  const showText = showLabel && Math.min(Number(width) || 56, Number(height) || 56) >= 40;

  if (hasMenuImageUrl(uri)) {
    return (
      <Image
        source={{ uri: safeImageUri(uri) }}
        style={[styles.image, { width, height, borderColor }, imageStyle, style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width, height, borderColor },
        style,
        imageStyle,
      ]}
    >
      <Icon name={iconName} size={resolvedIconSize} color={iconColor} />
      {showText ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
  },
  placeholder: {
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  label: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
