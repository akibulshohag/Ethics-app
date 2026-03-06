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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PromotionsScreen = () => {
  
  const PromotionCard = ({ name }) => (
    <View style={styles.promoCard}>
      {/* Label above the image */}
      <View style={styles.cardOrangeHeader}>
        <Text style={styles.cardHeaderText}>{name}</Text>
      </View>
      
      {/* Image container with orange border */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }} 
          style={styles.foodImage}
        />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.getFlatText}>
          Get Flat <Text style={styles.highlightText}>30% OFF</Text>
        </Text>
        <Text style={styles.uptoText}>UPTO $3</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />
      
      {/* Dark Header */}
      <View style={styles.headerBackground}>
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.backButton}>
            <Icon name="chevron-left" size={16} color="#000" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Icon name="dots-vertical" size={24} color="#FFF" />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>OFFERS &</Text>
          <View style={styles.orangePill}>
            <Text style={styles.pillText}>PROMOTIONS</Text>
          </View>
        </View>
      </View>

      {/* FIXED: The missing orange divider strip */}
      <View style={styles.orangeDivider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>
        <View style={styles.promoGrid}>
          <PromotionCard name="Tandoori Planet" />
          <PromotionCard name="Streetly balty" />
          <PromotionCard name="Bangal hub" />
          <PromotionCard name="Indian Grill" />
          <PromotionCard name="Streetly balty" />
          <PromotionCard name="Tandoori Planet" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  headerBackground: {
    backgroundColor: '#2C3E50', // Dark Slate Blue
    paddingBottom: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    zIndex: 2,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 10,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  backButtonText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  titleContainer: { alignItems: 'center', marginTop: 5 },
  mainTitle: { color: '#FFF', fontSize: 42, fontWeight: 'bold' },
  orangePill: {
    backgroundColor: '#F5A623', // Brand Orange
    paddingHorizontal: 25,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: -5,
  },
  pillText: { color: '#FFF', fontSize: 42, fontWeight: 'bold' },
  
  // NEW: Orange strip sitting behind/below the header
  orangeDivider: {
    backgroundColor: '#F5A623',
    height: 40,
    width: '100%',
    marginTop: -30, // Tucks under the curved header
    zIndex: 1,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  scrollArea: { paddingHorizontal: 12, paddingTop: 10 },
  promoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  promoCard: { width: '48%', marginBottom: 20 },
  cardOrangeHeader: {
    backgroundColor: '#F5A623',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 3,
  },
  cardHeaderText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  imageContainer: {
    borderWidth: 2,
    borderColor: '#F5A623',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: -8, 
  },
  foodImage: { width: '100%', height: 110 },
  cardFooter: { marginTop: 6, paddingLeft: 2 },
  getFlatText: { fontSize: 14, color: '#000', fontWeight: 'bold' },
  highlightText: { color: '#F5A623' },
  uptoText: { fontSize: 11, color: '#666' },
});

export default PromotionsScreen;