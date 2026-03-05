import React from 'react';
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
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const HomeThreeScreen = ({ onBack }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="chevron-left" size={20} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Icon name="dots-vertical" size={24} color="#666" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Info Section */}
        <View style={styles.resInfoSection}>
          <View style={styles.resTitleRow}>
            <View>
              <Text style={styles.resTitle}>Tandoori Planet</Text>
              <Text style={styles.resSubTitle}>42 min - Birmingham, UK</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>4.5</Text>
              <Icon name="star" size={14} color="#FFF" />
            </View>
          </View>
          <Text style={styles.ratingCount}>12k rating</Text>
          <View style={styles.divider} />
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity style={styles.filterBtn}>
            <Icon name="tune" size={18} color="#444" />
            <Text style={styles.filterBtnText}>Filters</Text>
            <Icon name="chevron-down" size={18} color="#444" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.chipBtn}>
            <Text style={styles.chipText}>Sweets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chipBtn}>
            <Text style={styles.chipText}>Bestseller</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chipBtn}>
            <Icon name="star" size={16} color="#F5A623" />
            <Text style={styles.chipText}>Rated</Text>
          </TouchableOpacity>
        </ScrollView>

        <Text style={styles.sectionHeading}>Most Ordered</Text>

        {/* Menu Items */}
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.menuItemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Tandoori Chicken</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Icon key={s} name="star" size={16} color="#F5A623" />
                ))}
              </View>
              <Text style={styles.itemPrice}>$12.99</Text>
              <Text style={styles.itemDesc} numberOfLines={3}>
                A cozy restaurant serving fresh, delicious food made with quality ingredients.
              </Text>
            </View>
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }} 
                style={styles.itemImage} 
              />
              <View style={styles.stepperContainer}>
                <TouchableOpacity style={styles.stepperBtn}>
                  <Icon name="minus" size={18} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.stepperVal}>1</Text>
                <TouchableOpacity style={styles.stepperBtn}>
                  <Icon name="plus" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        
        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footerOverlay}>
        <View style={styles.arrowContainer}>
           <Icon name="chevron-down" size={40} color="#333" />
        </View>
        
        <TouchableOpacity style={styles.cartBar}>
          <Text style={styles.cartText}>2 items added</Text>
          <View style={styles.cartIconCircle}>
            <Icon name="arrow-right" size={18} color="#F5A623" />
          </View>
        </TouchableOpacity>

        <View style={styles.searchRow}>
          <View style={styles.bottomSearch}>
            <Icon name="magnify" size={22} color="#999" />
            <TextInput placeholder={"Search 'prawns curry'"} style={styles.bottomInput} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  backText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  resInfoSection: { paddingHorizontal: 15, marginTop: 10 },
  resTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resTitle: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  resSubTitle: { fontSize: 14, color: '#666', marginTop: 4 },
  ratingBadge: { backgroundColor: '#10793F', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingText: { color: '#FFF', fontWeight: 'bold', marginRight: 4, fontSize: 14 },
  ratingCount: { alignSelf: 'flex-end', fontSize: 12, color: '#999', marginTop: 4 },
  divider: { height: 4, backgroundColor: '#F0F4F7', width: '100%', marginTop: 15, borderRadius: 2 },
  filterScroll: { paddingLeft: 15, marginVertical: 15, height: 40 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 10, marginRight: 10, height: 35 },
  filterBtnText: { marginHorizontal: 5, color: '#444' },
  chipBtn: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 15, marginRight: 10, justifyContent: 'center', height: 35, flexDirection: 'row', alignItems: 'center' },
  chipText: { color: '#444', marginLeft: 4 },
  sectionHeading: { fontSize: 20, fontWeight: 'bold', color: '#222', paddingHorizontal: 15, marginVertical: 15 },
  menuItemCard: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 25, justifyContent: 'space-between' },
  itemInfo: { width: '60%' },
  itemTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  starsRow: { flexDirection: 'row', marginVertical: 5 },
  itemPrice: { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 5 },
  itemDesc: { fontSize: 13, color: '#777', lineHeight: 18 },
  imageContainer: { width: '35%', alignItems: 'center' },
  itemImage: { width: '100%', height: 110, borderRadius: 15, borderWidth: 1, borderColor: '#F5A623' },
  stepperContainer: { position: 'absolute', bottom: -12, flexDirection: 'row', backgroundColor: '#F5A623', borderRadius: 8, alignItems: 'center', padding: 4, elevation: 3 },
  stepperBtn: { paddingHorizontal: 5 },
  stepperVal: { color: '#FFF', fontWeight: 'bold', marginHorizontal: 8 },
  bottomSpace: { height: 180 },
  footerOverlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF', paddingHorizontal: 15, paddingBottom: 20 },
  arrowContainer: { alignItems: 'center', marginBottom: 10 },
  cartBar: { backgroundColor: '#F5A623', height: 55, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  cartText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cartIconCircle: { backgroundColor: '#FFF', borderRadius: 15, marginLeft: 15, padding: 2 },
  searchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomSearch: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', height: 45, borderRadius: 10, paddingHorizontal: 12, marginRight: 10, borderWidth: 1, borderColor: '#DDD' },
  bottomInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  menuBtn: { backgroundColor: '#444', flexDirection: 'row', alignItems: 'center', height: 45, paddingHorizontal: 15, borderRadius: 10 },
  menuBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
});

export default HomeThreeScreen;