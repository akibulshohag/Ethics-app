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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { getMenuByUserId } from '../services/menuService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_IMAGE = 'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg';

const ProductDetailModal = ({ visible, onClose, ownerUserId }) => {
  const navigation = useNavigation();
  const [quantity, setQuantity] = useState(1);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    if (!visible) return;
    if (!ownerUserId) {
      setMenuItems([]);
      return;
    }
    setMenuLoading(true);
    getMenuByUserId(ownerUserId)
      .then(({ menu }) => {
        setMenuItems(menu || []);
        setCheckedItems({});
      })
      .catch(() => setMenuItems([]))
      .finally(() => setMenuLoading(false));
  }, [visible, ownerUserId]);

  const toggleCheckbox = (id) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => (q > 1 ? q - 1 : 1));

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
        
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                    <Text style={styles.currentPrice}>USD {Number(firstItem.price).toFixed(2)}</Text>
                  </View>
                </View>
                <View style={styles.frequentlyContainer}>
                  <Text style={styles.sectionTitle}>Menu</Text>
                  <Text style={styles.sectionSubtitle}>
                    Add items from this restaurant to your order.
                  </Text>
                  {menuItems.map((item) => (
                    <View key={item.id} style={styles.boughtItem}>
                      <Image
                        source={{ uri: item.imageUrl || DEFAULT_IMAGE }}
                        style={styles.itemThumbnail}
                      />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{item.itemName}</Text>
                        <View style={styles.itemPriceRow}>
                          <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => toggleCheckbox(item.id)}>
                        <Icon
                          name={checkedItems[item.id] ? 'checkbox-marked' : 'checkbox-blank-outline'}
                          size={28}
                          color={checkedItems[item.id] ? COLORS.primaryOrange : COLORS.gray500}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Image source={{ uri: DEFAULT_IMAGE }} style={styles.productImage} />
                <View style={styles.infoContainer}>
                  <Text style={styles.title}>Bang Bang Chicken Skewers</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>USD 12</Text>
                    <Text style={styles.originalPrice}>USD 12</Text>
                    <Text style={styles.discount}>15% off</Text>
                  </View>
                  <Text style={styles.description}>
                    A cozy restaurant serving fresh, delicious food made with quality ingredients.
                  </Text>
                </View>
                <View style={styles.frequentlyContainer}>
                  <Text style={styles.sectionTitle}>Frequently bought together</Text>
                  <Text style={styles.sectionSubtitle}>
                    No menu items yet. Restaurant owner can add menu in profile.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <View style={styles.quantityContainer}>
              <TouchableOpacity onPress={decrement} style={styles.quantityBtn}>
                <Icon name="minus-circle-outline" size={24} color={COLORS.gray600} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity onPress={increment} style={styles.quantityBtn}>
                <Icon name="plus-circle-outline" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.addToCartBtn}
              onPress={() => {
                onClose();
                navigation.navigate('CartDetailsScreen');
              }}
            >
              <Text style={styles.addToCartText}>Add to cart</Text>
            </TouchableOpacity>

          </View>
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
    color: '#E48B47', // Light orange to match image
    marginRight: 8,
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
  addToCartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default ProductDetailModal;
