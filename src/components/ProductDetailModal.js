import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ProductDetailModal = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const [quantity, setQuantity] = useState(1);
  const [checkedItems, setCheckedItems] = useState({
    1: false,
    2: false,
    3: false,
  });

  const toggleCheckbox = (id) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => (q > 1 ? q - 1 : 1));

  const frequentlyBought = [
    {
      id: 1,
      title: 'Quick and Easy Recipe',
      price: 10,
      originalPrice: 15,
      image: 'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg',
    },
    {
      id: 2,
      title: 'Quick and Easy Recipe',
      price: 10,
      originalPrice: 15,
      image: 'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg',
    },
    {
      id: 3,
      title: 'Quick and Easy Recipe',
      price: 10,
      originalPrice: 15,
      image: 'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg',
    },
  ];

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
            {/* Product Image */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={COLORS.black} />
            </TouchableOpacity> 
            <Image
              source={{ uri: 'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg' }}
              style={styles.productImage}
            />

            {/* Product Info */}
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

            {/* Frequently Bought Together */}
            <View style={styles.frequentlyContainer}>
              <Text style={styles.sectionTitle}>Frequently bought together</Text>
              <Text style={styles.sectionSubtitle}>
                A cozy restaurant serving fresh, delicious food made with quality ingredients.
              </Text>

              {frequentlyBought.map((item) => (
                <View key={item.id} style={styles.boughtItem}>
                  <Image source={{ uri: item.image }} style={styles.itemThumbnail} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <View style={styles.itemPriceRow}>
                        <Text style={styles.itemPrice}>+${item.price}</Text>
                        <Text style={styles.itemOldPrice}>${item.originalPrice}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => toggleCheckbox(item.id)}>
                    <Icon
                      name={checkedItems[item.id] ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={28}
                      color={checkedItems[item.id] ? COLORS.primaryOrange : COLORS.gray500}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.viewMoreRow}>
                <Icon name="chevron-down" size={24} color={COLORS.textPrimary} />
                <Text style={styles.viewMoreText}>View 6 More</Text>
              </TouchableOpacity>
            </View>
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
