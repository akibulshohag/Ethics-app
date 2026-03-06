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
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PromoDetailsScreen = () => {
  
  // Reusable card for the "More Offers" section
  const OfferCard = ({ name }) => (
    <View style={styles.offerCard}>
      <View style={styles.cardOrangeLabel}>
        <Text style={styles.cardLabelText}>{name}</Text>
      </View>
      <View style={styles.offerImageContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }} 
          style={styles.smallFoodImage}
        />
      </View>
      <View style={styles.offerFooter}>
        <Text style={styles.flatText}>Get Flat <Text style={styles.orangeText}>30% OFF</Text></Text>
        <Text style={styles.uptoText}>UPTO $3</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Top Header Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn}>
          <Icon name="chevron-left" size={18} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Icon name="dots-vertical" size={24} color="#666" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Main Restaurant Info Container */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.restaurantName}>Tandoori Planet</Text>
              <Text style={styles.restaurantSub}>42 min - Birmingham, UK</Text>
            </View>
            <TouchableOpacity style={styles.orderNowBtn}>
              <Text style={styles.orderNowText}>Order Now</Text>
            </TouchableOpacity>
          </View>

          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0' }} 
            style={styles.heroImage}
          />

          <Text style={styles.promoHeader}>Promo Code</Text>
          
          {/* Promo Code Copy Input */}
          <View style={styles.promoInputContainer}>
            <View style={styles.promoCodeBox}>
              <Text style={styles.promoCodeValue}>MULEN300FF</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn}>
              <Text style={styles.copyBtnText}>Copy Promo Code</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsTitle}>Terms and Conditions</Text>
          <View style={styles.termRow}>
            <Icon name="record" size={8} color="#666" style={styles.dot} />
            <Text style={styles.termText}>This promo code used ones per orde</Text>
          </View>
          <View style={styles.termRow}>
            <Icon name="record" size={8} color="#666" style={styles.dot} />
            <Text style={styles.termText}>This promo code used ones per orde</Text>
          </View>
        </View>

        {/* More Offers Section */}
        <Text style={styles.sectionTitle}>More Offers</Text>
        <View style={styles.offersGrid}>
          <OfferCard name="Tandoori Planet" />
          <OfferCard name="Streetly balty" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  navBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    alignItems: 'center' 
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1A1A1A', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 30 },
  
  // Info Card Styles
  infoCard: { 
    backgroundColor: '#F2F2F2', 
    borderRadius: 20, 
    padding: 15, 
    marginTop: 10 
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 15
  },
  restaurantName: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  restaurantSub: { fontSize: 12, color: '#666', marginTop: 2 },
  orderNowBtn: { 
    backgroundColor: '#F5A623', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 12 
  },
  orderNowText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  heroImage: { width: '100%', height: 200, borderRadius: 20, marginBottom: 15 },
  promoHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  
  // Promo Input
  promoInputContainer: { 
    flexDirection: 'row', 
    height: 55, 
    backgroundColor: '#EEE', 
    borderRadius: 15, 
    overflow: 'hidden',
    marginBottom: 15
  },
  promoCodeBox: { flex: 1, justifyContent: 'center', paddingLeft: 15 },
  promoCodeValue: { color: '#999', fontSize: 14 },
  copyBtn: { 
    backgroundColor: '#F5A623', 
    paddingHorizontal: 15, 
    justifyContent: 'center' 
  },
  copyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  
  termsTitle: { fontSize: 13, color: '#666', marginBottom: 5 },
  termRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { marginRight: 8 },
  termText: { fontSize: 11, color: '#666' },

  // More Offers Grid
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 15 },
  offersGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  offerCard: { width: '48%' },
  cardOrangeLabel: { 
    backgroundColor: '#F5A623', 
    borderTopLeftRadius: 8, 
    borderTopRightRadius: 8, 
    paddingVertical: 4, 
    alignItems: 'center',
    zIndex: 2
  },
  cardLabelText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  offerImageContainer: { 
    borderWidth: 1.5, 
    borderColor: '#F5A623', 
    borderRadius: 12, 
    marginTop: -5, 
    overflow: 'hidden' 
  },
  smallFoodImage: { width: '100%', height: 100 },
  offerFooter: { marginTop: 5 },
  flatText: { fontSize: 13, fontWeight: 'bold' },
  orangeText: { color: '#F5A623' },
  uptoText: { fontSize: 10, color: '#666' }
});

export default PromoDetailsScreen;