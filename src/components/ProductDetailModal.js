import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { getMenuByUserId } from '../services/menuService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_IMAGE =
  'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg';

const ProductDetailModal = ({
  visible,
  onClose,
  ownerUserId,
  token,
  onOrderPlaced,
}) => {
  const navigation = useNavigation();
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  // Per-item quantity: { [menuItemId]: number } (0 = not selected)
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    if (!visible) return;
    if (!ownerUserId) {
      setMenuItems([]);
      return;
    }
    setMenuLoading(true);
    setSelectedItems({});
    getMenuByUserId(ownerUserId)
      .then(({ menu }) => setMenuItems(menu || []))
      .catch(() => setMenuItems([]))
      .finally(() => setMenuLoading(false));
  }, [visible, ownerUserId]);

  const setItemQty = (id, qty) => {
    const n = Math.max(
      0,
      typeof qty === 'function' ? qty(selectedItems[id] || 0) : qty,
    );
    setSelectedItems(prev =>
      n === 0 ? { ...prev, [id]: undefined } : { ...prev, [id]: n },
    );
  };

  const toggleItem = id => {
    const cur = selectedItems[id] || 0;
    setItemQty(id, cur > 0 ? 0 : 1);
  };

  const firstItem = menuItems[0];
  const restItems = menuItems.slice(1);
  const hasDynamicMenu = menuItems.length > 0;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>

            {menuLoading ? (
              <View style={styles.menuLoading}>
                <ActivityIndicator size="large" color={COLORS.primaryOrange} />
                <Text style={styles.menuLoadingText}>Loading menu...</Text>
              </View>
            ) : hasDynamicMenu ? (
              <>
                <Image
                  source={{ uri: firstItem.imageUrl || DEFAULT_IMAGE }}
                  style={styles.productImage}
                />
                <View style={styles.infoContainer}>
                  <Text style={styles.title}>{firstItem.itemName}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>
                      £ {Number(firstItem.price).toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View style={styles.frequentlyContainer}>
                  <Text style={styles.sectionTitle}>Menu</Text>
                  <Text style={styles.sectionSubtitle}>
                    Add items from this restaurant to your order.
                  </Text>
                  {menuItems.map(item => {
                    const qty = selectedItems[item.id] || 0;
                    return (
                      <View key={item.id} style={styles.boughtItem}>
                        <Image
                          source={{ uri: item.imageUrl || DEFAULT_IMAGE }}
                          style={styles.itemThumbnail}
                        />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle}>{item.itemName}</Text>
                          <View style={styles.itemPriceRow}>
                            <Text style={styles.itemPrice}>
                              ${Number(item.price).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.itemQuantityRow}>
                          <TouchableOpacity
                            onPress={() => setItemQty(item.id, n => n - 1)}
                            style={styles.qtyBtn}
                            disabled={qty === 0}
                          >
                            <Icon
                              name="minus"
                              size={20}
                              color={
                                qty === 0 ? COLORS.gray400 : COLORS.gray700
                              }
                            />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{qty}</Text>
                          <TouchableOpacity
                            onPress={() => setItemQty(item.id, n => n + 1)}
                            style={styles.qtyBtn}
                          >
                            <Icon
                              name="plus"
                              size={20}
                              color={COLORS.primaryOrange}
                            />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => toggleItem(item.id)}>
                          <Icon
                            name={
                              qty > 0
                                ? 'checkbox-marked'
                                : 'checkbox-blank-outline'
                            }
                            size={28}
                            color={
                              qty > 0 ? COLORS.primaryOrange : COLORS.gray500
                            }
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Image
                  source={{ uri: DEFAULT_IMAGE }}
                  style={styles.productImage}
                />
                <View style={styles.infoContainer}>
                  <Text style={styles.title}>Bang Bang Chicken Skewers</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>£12</Text>
                    <Text style={styles.originalPrice}>£12</Text>
                    <Text style={styles.discount}>15% off</Text>
                  </View>
                  <Text style={styles.description}>
                    A cozy restaurant serving fresh, delicious food made with
                    quality ingredients.
                  </Text>
                </View>
                <View style={styles.frequentlyContainer}>
                  <Text style={styles.sectionTitle}>
                    Frequently bought together
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    No menu items yet. Restaurant owner can add menu in profile.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* Action Bar: Place order when dynamic menu */}
          {hasDynamicMenu && (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={styles.addToCartBtn}
                onPress={() => {
                  if (!token) {
                    Alert.alert(
                      'Sign in required',
                      'Please sign in to add items to cart.',
                      [
                        { text: 'OK' },
                        {
                          text: 'Sign in',
                          onPress: () => {
                            onClose();
                            navigation.navigate('Login');
                          },
                        },
                      ],
                    );
                    return;
                  }
                  const menuMap = new Map(menuItems.map(m => [m.id, m]));
                  const items = Object.entries(selectedItems)
                    .filter(([, q]) => q > 0)
                    .map(([menuItemId, quantity]) => {
                      const menuItem = menuMap.get(menuItemId);
                      return {
                        menuItemId,
                        itemName: menuItem?.itemName || 'Item',
                        price: menuItem?.price ?? 0,
                        quantity,
                        currency: 'GBP',
                        imageUrl: menuItem?.imageUrl,
                      };
                    });
                  if (items.length === 0) {
                    Alert.alert(
                      'Add items',
                      'Select at least one item and quantity to add to cart.',
                    );
                    return;
                  }
                  if (!ownerUserId) return;
                  onClose();
                  navigation.navigate('CartDetailsScreen', {
                    ownerId: ownerUserId,
                    items,
                  });
                }}
              >
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  menuLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  menuLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray600,
  },
  content: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: SCREEN_HEIGHT * 0.8,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
  },
  infoContainer: {
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: COLORS.gray500,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discount: {
    fontSize: 16,
    color: COLORS.gray600,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  frequentlyContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingTop: 20,
    marginBottom: 80, // Space for fixed action bar
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 20,
    lineHeight: 20,
  },
  boughtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  itemThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray700,
    marginBottom: 4,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E48B47',
    marginRight: 8,
  },
  itemQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
    color: COLORS.gray700,
  },
  itemOldPrice: {
    fontSize: 14,
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  viewMoreText: {
    fontSize: 15,
    color: COLORS.gray700,
    marginLeft: 8,
  },
  actionBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 30,
    paddingHorizontal: 12,
    height: 45,
    marginRight: 15,
  },
  quantityBtn: {
    padding: 4,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
    color: COLORS.primaryOrange,
  },
  addToCartBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryOrange,
    height: 45,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartBtnDisabled: {
    opacity: 0.7,
  },
  addToCartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default ProductDetailModal;
