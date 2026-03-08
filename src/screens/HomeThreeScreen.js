import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getMenuByUserId } from '../services/menuService';

const { width } = Dimensions.get('window');
const DEFAULT_IMAGE =
  'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg';

const HomeThreeScreen = ({ onBack }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const ownerId = route.params?.ownerId;
  const resTitle = route.params?.title || 'Restaurant';
  const resLocation = route.params?.location || '';

  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(!!ownerId);
  const [selectedItems, setSelectedItems] = useState({});
  const [staticQuantities, setStaticQuantities] = useState({
    0: 1,
    1: 1,
    2: 1,
  });

  useEffect(() => {
    if (!ownerId) return;
    setMenuLoading(true);
    setSelectedItems({});
    getMenuByUserId(ownerId)
      .then(({ menu }) => setMenuItems(menu || []))
      .catch(() => setMenuItems([]))
      .finally(() => setMenuLoading(false));
  }, [ownerId]);

  // Filter Bar Component
  const FilterBar = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      <TouchableOpacity style={styles.filterChip}>
        <Icon name="tune" size={18} color="#444" />
        <Text style={styles.filterText}>Filters</Text>
        <Icon name="chevron-down" size={18} color="#444" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.filterChip}>
        <Icon name="tune" size={18} color="#444" />
        <Text style={styles.filterText}>Sweets</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.filterChip}>
        <Icon name="tune" size={18} color="#444" />
        <Text style={styles.filterText}>Bestseller</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.filterChip}>
        <Icon name="star" size={18} color="#FFC107" />
        <Text style={styles.filterText}>Rated</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const setItemQty = (id, qty) => {
    const n = Math.max(
      0,
      typeof qty === 'function' ? qty(selectedItems[id] || 0) : qty,
    );
    setSelectedItems(prev =>
      n === 0 ? { ...prev, [id]: undefined } : { ...prev, [id]: n },
    );
  };

  const totalCount = Object.values(selectedItems).reduce(
    (a, b) => a + (b || 0),
    0,
  );
  const staticTotal = Object.values(staticQuantities).reduce(
    (a, b) => a + (b || 0),
    0,
  );

  const setStaticQty = (idx, deltaOrVal) => {
    setStaticQuantities(prev => {
      const cur = prev[idx] ?? 0;
      const next =
        typeof deltaOrVal === 'function'
          ? Math.max(0, deltaOrVal(cur))
          : Math.max(0, deltaOrVal);
      if (next === 0 && cur === 0) return prev;
      return { ...prev, [idx]: next };
    });
  };

  const handleAddToCart = () => {
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
          currency: 'BDT',
          imageUrl: menuItem?.imageUrl,
        };
      });
    if (items.length === 0) {
      Alert.alert('Add items', 'Select at least one item and quantity.');
      return;
    }
    if (!ownerId) return;
    navigation.navigate('CartDetailsScreen', {
      ownerId,
      items,
      ownerName: resTitle,
    });
  };

  const hasDynamicMenu = ownerId && menuItems.length > 0;

  const getItemsForHomeFour = () => {
    if (hasDynamicMenu) {
      const menuMap = new Map(menuItems.map(m => [m.id, m]));
      return Object.entries(selectedItems)
        .filter(([, q]) => q > 0)
        .map(([menuItemId, quantity]) => {
          const menuItem = menuMap.get(menuItemId);
          return {
            menuItemId,
            itemName: menuItem?.itemName || 'Item',
            price: menuItem?.price ?? 0,
            quantity,
            currency: 'BDT',
            imageUrl: menuItem?.imageUrl,
          };
        });
    }
    return [0, 1, 2]
      .filter(idx => (staticQuantities[idx] ?? 0) > 0)
      .map(idx => ({
        menuItemId: `static-${idx}`,
        itemName: 'Tandoori Chicken',
        price: 12.99,
        quantity: staticQuantities[idx] ?? 0,
        currency: 'BDT',
      }));
  };

  const itemsForCheckout = getItemsForHomeFour();
  const displayCount = hasDynamicMenu ? totalCount : staticTotal;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (onBack ? onBack() : navigation.goBack())}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={20} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Icon name="dots-vertical" size={24} color="#666" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.resInfoSection}>
    <View style={styles.resTitleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.resTitle}>Tandoori Planet</Text>
        <Text style={styles.resSubTitle}>42 min - Birmingham, UK</Text>
      </View>

      {/* Right side container to stack badge and text */}
      <View style={styles.ratingContainer}>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>4.5</Text>
          <Icon name="star" size={14} color="#FFF" />
        </View>
        <Text style={styles.ratingCount}>12k rating</Text>
      </View>
    </View>
    <View style={styles.divider} />
  </View>

        <FilterBar />

        {menuLoading ? (
          <View style={styles.menuLoading}>
            <ActivityIndicator size="large" color="#F5A623" />
            <Text style={styles.menuLoadingText}>Loading menu...</Text>
          </View>
        ) : hasDynamicMenu ? (
          <>
            <Text style={styles.sectionHeading}>Most Ordered</Text>
            {menuItems.map(item => {
              const qty = selectedItems[item.id] || 0;
              return (
                <View key={item.id} style={styles.menuItemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.itemName}</Text>
                    <Text style={styles.itemPrice}>
                      ${Number(item.price || 0).toFixed(2)}
                    </Text>
                    {item.description ? (
                      <Text style={styles.itemDesc} numberOfLines={3}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: item.imageUrl || DEFAULT_IMAGE }}
                      style={styles.itemImage}
                    />
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setItemQty(item.id, n => n - 1)}
                        disabled={qty === 0}
                      >
                        <Icon
                          name="minus"
                          size={18}
                          color={qty === 0 ? '#fff' : '#FFF'}
                        />
                      </TouchableOpacity>
                      <Text style={styles.stepperVal}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setItemQty(item.id, n => n + 1)}
                      >
                        <Icon name="plus" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        ) : ownerId ? (
          <View style={styles.emptyMenu}>
            <Text style={styles.emptyMenuText}>
              No menu items yet. Restaurant owner can add menu in profile.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHeading}>Most Ordered</Text>
            {[0, 1, 2].map(idx => {
              const qty = staticQuantities[idx] ?? 0;
              return (
                <View key={idx} style={styles.menuItemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>Tandoori Chicken</Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Icon key={s} name="star" size={16} color="#F5A623" />
                      ))}
                    </View>
                    <Text style={styles.itemPrice}>$12.99</Text>
                    <Text style={styles.itemDesc} numberOfLines={3}>
                      A cozy restaurant serving fresh, delicious food.
                    </Text>
                  </View>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{
                        uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
                      }}
                      style={styles.itemImage}
                    />
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setStaticQty(idx, n => n - 1)}
                        disabled={qty === 0}
                      >
                        <Icon
                          name="minus"
                          size={18}
                          color={qty === 0 ? '#999' : '#FFF'}
                        />
                      </TouchableOpacity>
                      <Text style={styles.stepperVal}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setStaticQty(idx, n => n + 1)}
                      >
                        <Icon name="plus" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.footerOverlay}>
        <View style={styles.arrowContainer}>
          <Icon name="chevron-down" size={40} color="#333" />
        </View>
        <TouchableOpacity
          style={styles.cartBar}
          onPress={() =>
            navigation.navigate('HomeFourScreen', {
              ownerId: hasDynamicMenu ? ownerId : null,
              items: itemsForCheckout,
              ownerName: resTitle,
            })
          }
        >
          <Text style={styles.cartText}>
            {displayCount > 0
              ? `${displayCount} item${displayCount !== 1 ? 's' : ''} added`
              : 'Add to Cart'}
          </Text>
          <View style={styles.cartIconCircle}>
            <Icon name="arrow-right" size={18} color="#F5A623" />
          </View>
        </TouchableOpacity>
        <View style={styles.searchRow}>
          <View style={styles.bottomSearch}>
            <Icon name="magnify" size={22} color="#999" />
            <TextInput
              placeholder={"Search 'prawns curry'"}
              style={styles.bottomInput}
            />
          </View>
          <TouchableOpacity style={styles.menuBtn}>
            <Icon name="magnify" size={20} color="#FFF" />
            <Text style={styles.menuBtnText}>Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  backText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  resInfoSection: { paddingHorizontal: 15, marginTop: 10 },
  resTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resTitle: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  resSubTitle: { fontSize: 14, color: '#666', marginTop: 4 },
  ratingBadge: {
    backgroundColor: '#10793F',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginRight: 4,
    fontSize: 14,
  },
  ratingCount: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 2 },
  divider: {
    height: 4,
    backgroundColor: '#F0F4F7',
    width: '100%',
    marginTop: 15,
    borderRadius: 2,
  },
  menuLoading: { paddingVertical: 40, alignItems: 'center' },
  menuLoadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  emptyMenu: { padding: 20, alignItems: 'center' },
  emptyMenuText: { fontSize: 14, color: '#666', textAlign: 'center' },
  // NEW FILTER STYLES
  filterContainer: {
    marginVertical: 15,
    paddingLeft: 15,
  },
  filterContent: {
    paddingRight: 30,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#FFF',
  },
  filterText: {
    fontSize: 14,
    color: '#444',
    marginHorizontal: 6,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    paddingHorizontal: 15,
    marginVertical: 15,
  },
  menuItemCard: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 25,
    justifyContent: 'space-between',
  },
  itemInfo: { width: '60%' },
  itemTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  starsRow: { flexDirection: 'row', marginVertical: 5 },
  itemPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 5,
  },
  itemDesc: { fontSize: 13, color: '#777', lineHeight: 18 },
  imageContainer: { width: '35%', alignItems: 'center' },
  itemImage: {
    width: '100%',
    height: 110,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  stepperContainer: {
    position: 'absolute',
    bottom: -12,
    flexDirection: 'row',
    backgroundColor: '#F5A623',
    borderRadius: 8,
    alignItems: 'center',
    padding: 4,
    elevation: 3,
  },
  stepperBtn: { paddingHorizontal: 5 },
  stepperVal: {
    color: '#FFF',
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  bottomSpace: { height: 180 },
  footerOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  arrowContainer: { alignItems: 'center', marginBottom: 10 },
  cartBar: {
    backgroundColor: '#F5A623',
    height: 55,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  cartText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cartIconCircle: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginLeft: 15,
    padding: 2,
  },
  searchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomSearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    height: 45,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  bottomInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  menuBtn: {
    backgroundColor: '#424242',
    flexDirection: 'row',
    alignItems: 'center',
    height: 45,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  menuBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
}); 

export default HomeThreeScreen;