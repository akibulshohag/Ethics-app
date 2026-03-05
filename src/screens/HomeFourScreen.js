import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HomeFourScreen = ({ onBack }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Icon name="chevron-left" size={18} color="#FFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tandoori Planet</Text>
        </View>
        <Icon name="dots-vertical" size={24} color="#999" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Delivery Address Section */}
        <Text style={styles.deliveryTitle}>Delivery at home</Text>
        <Text style={styles.deliverySub}>22/2 wellnock road, birmingham</Text>

        {/* Items List Container */}
        <View style={styles.itemsCard}>
          {[1, 2, 3].map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Icon name="circle-slice-8" size={18} color="#F5A623" />
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemName}>Tandoori Chicken</Text>
                  <Text style={styles.itemPrice}>$12.99</Text>
                </View>
              </View>
              <View style={styles.stepperContainer}>
                <TouchableOpacity style={styles.stepperBtn}>
                  <Text style={styles.stepperChar}>—</Text>
                </TouchableOpacity>
                <Text style={styles.stepperVal}>1</Text>
                <TouchableOpacity style={styles.stepperBtn}>
                  <Text style={styles.stepperChar}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          <TouchableOpacity style={styles.addItemsBtn}>
            <Text style={styles.addItemsText}>+Add items</Text>
          </TouchableOpacity>
        </View>

        {/* Note Section */}
        <TouchableOpacity style={styles.noteContainer}>
          <Icon name="notebook-outline" size={22} color="#1A1A1A" />
          <Text style={styles.noteText}>Add a note for the restaurant</Text>
        </TouchableOpacity>

        {/* Promo Code Section */}
        <View style={styles.promoContainer}>
          <View style={styles.promoInputWrapper}>
            <TextInput 
              placeholder="Promo code" 
              placeholderTextColor="#999"
              style={styles.promoInput}
            />
          </View>
          <TouchableOpacity style={styles.applyBtn}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Info Rows */}
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Icon name="truck-delivery-outline" size={24} color="#1A1A1A" />
            <Text style={styles.infoText}>Delivery in 42 mins</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#1A1A1A" />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Icon name="phone-outline" size={24} color="#1A1A1A" />
            <Text style={styles.infoText}>Moshine, 44 7424043742</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#1A1A1A" />
        </View>

        {/* Bill Details */}
        <View style={styles.billSection}>
          <View style={styles.billHeader}>
            <Icon name="calendar-text-outline" size={24} color="#1A1A1A" />
            <View style={styles.billTitleContainer}>
              <Text style={styles.billMainTitle}>Total Bill</Text>
              <Text style={styles.billSubTitle}>Incl. taxes and charges</Text>
            </View>
            <Text style={styles.totalAmountMain}>$42.99</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Items Bill</Text>
            <Text style={styles.billValue}>$39.99</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>taxes and charges</Text>
            <Text style={styles.billValue}>$39.99</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Footer / Payment Action */}
      <View style={styles.footer}>
        <View style={styles.paymentMethod}>
          <TouchableOpacity style={styles.payUsingBtn}>
            <Text style={styles.payUsingLabel}>Pay Using</Text>
            <Icon name="menu-up" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.methodName}>Credit Card</Text>
        </View>

        <TouchableOpacity style={styles.placeOrderBtn}>
          <View>
            <Text style={styles.footerPrice}>$42.99</Text>
            <Text style={styles.footerTotalLabel}>Total Bill</Text>
          </View>
          <Text style={styles.placeOrderText}>Place Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { 
    backgroundColor: '#1E1E1E', 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 6,
    marginRight: 12
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  content: { flex: 1, paddingHorizontal: 15 },
  deliveryTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginTop: 15 },
  deliverySub: { fontSize: 13, color: '#777', marginTop: 4, marginBottom: 20 },
  itemsCard: { 
    backgroundColor: '#F2F6F8', 
    borderRadius: 15, 
    padding: 15,
    marginBottom: 20
  },
  itemRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 15
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center' },
  itemTextContainer: { marginLeft: 10 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  itemPrice: { fontSize: 14, color: '#666' },
  stepperContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#F5A623', 
    borderRadius: 6, 
    alignItems: 'center', 
    height: 30, 
    paddingHorizontal: 10
  },
  stepperBtn: { paddingHorizontal: 5 },
  stepperChar: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  stepperVal: { color: '#FFF', fontWeight: 'bold', marginHorizontal: 10, fontSize: 15 },
  addItemsBtn: { marginTop: 5 },
  addItemsText: { color: '#F5A623', fontWeight: 'bold', fontSize: 15 },
  noteContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#DDD', 
    borderRadius: 12, 
    padding: 15,
    marginBottom: 20
  },
  noteText: { marginLeft: 10, color: '#333', fontSize: 15 },
  promoContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#F2F6F8', 
    borderRadius: 12, 
    padding: 10,
    marginBottom: 25,
    alignItems: 'center'
  },
  promoInputWrapper: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    borderRadius: 8, 
    height: 45, 
    paddingHorizontal: 15,
    justifyContent: 'center'
  },
  promoInput: { fontSize: 14, color: '#333' },
  applyBtn: { paddingHorizontal: 25 },
  applyText: { color: '#F5A623', fontWeight: 'bold', fontSize: 16 },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center' },
  infoText: { marginLeft: 15, fontSize: 15, color: '#333' },
  billSection: { marginTop: 25 },
  billHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  billTitleContainer: { flex: 1, marginLeft: 15 },
  billMainTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  billSubTitle: { fontSize: 13, color: '#999' },
  totalAmountMain: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  billRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingLeft: 40,
    marginBottom: 10
  },
  billLabel: { color: '#777', fontSize: 14 },
  billValue: { color: '#777', fontSize: 14 },
  bottomSpacer: { height: 120 },
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  paymentMethod: { 
    borderWidth: 1, 
    borderColor: '#EEE', 
    borderRadius: 15, 
    padding: 10, 
    width: '35%' 
  },
  payUsingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payUsingLabel: { fontSize: 12, color: '#999' },
  methodName: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A', marginTop: 2 },
  placeOrderBtn: { 
    backgroundColor: '#F5A623', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderRadius: 15,
    paddingHorizontal: 20,
    height: 70,
    width: '60%'
  },
  footerPrice: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  footerTotalLabel: { color: '#FFF', fontSize: 12, opacity: 0.8 },
  placeOrderText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});

export default HomeFourScreen;