import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import DeliveryAddressModal from './DeliveryAddressModal';

const CheckoutSection = () => {
  const [selectedOption, setSelectedOption] = useState('standard');
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  const DeliveryOption = ({ id, title, time, price, selected }) => (
    <TouchableOpacity
      onPress={() => setSelectedOption(id)}
      style={[
        styles.optionRow,
        selected && styles.optionSelected
      ]}
    >
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionTime}>{time}</Text>
      </View>
      {price && <View style={styles.pricePill}><Text style={styles.pricePillText}>{price}</Text></View>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Delivery Address */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <Icon name="map-marker-outline" size={20} color={COLORS.black} />
            <Text style={styles.cardTitle}>Delivery address</Text>
          </View>
          <TouchableOpacity onPress={() => setAddressModalVisible(true)}>
            <Icon name="pencil-outline" size={20} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        <Image
          source={{ uri: 'https://img.freepik.com/free-vector/city-map-with-pin-pointers_23-2147614050.jpg' }}
          style={styles.mapImage}
        />
        <Text style={styles.addressText}>UK, London Briddge</Text>
      </View>

      {/* Delivery Instruction */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Delivery Instruction</Text>
        <TextInput
          style={styles.instructionInput}
          placeholder="(Optional) floor or Apt No or tell us how we"
          placeholderTextColor={COLORS.gray400}
        />
      </View>

      {/* Delivery Options */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Delivery Option</Text>
        <DeliveryOption
          id="priority"
          title="Priority"
          time="30-45 mins"
          price="+$22"
          selected={selectedOption === 'priority'}
        />
        <DeliveryOption
          id="standard"
          title="Standard"
          time="30-45 mins"
          selected={selectedOption === 'standard'}
        />
        <DeliveryOption
          id="scheduled"
          title="Scheduled"
          time="Select a date and date"
          selected={selectedOption === 'scheduled'}
        />
      </View>

      {/* Payment Method */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Icon name="credit-card-outline" size={20} color={COLORS.black} />
          <Text style={[styles.cardTitle, {marginLeft: 10}]}>Payment Method</Text>
        </View>
        <TouchableOpacity style={styles.addPayment}>
          <Text style={styles.addPaymentText}>+ Add payment Method</Text>
        </TouchableOpacity>
      </View>

      {/* Order Summary */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Icon name="clipboard-text-outline" size={20} color={COLORS.black} />
          <Text style={[styles.cardTitle, {marginLeft: 10}]}>Order Summary</Text>
        </View>
        <View style={[styles.summaryRow, {marginTop: 15}]}>
          <Text style={styles.summaryItem}>+  1x Mixed Vegetables</Text>
          <Text style={styles.summaryPrice}>+$ 160</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Subtotal</Text>
          <Text style={styles.billValue}>+$ 160</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Delivery Charge</Text>
          <Text style={styles.billValue}>+$ 50</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>VAT</Text>
          <Text style={styles.billValue}>+$1.5</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Promo Code</Text>
          <Text style={[styles.billValue, {color: COLORS.error}]}>-$50</Text>
        </View>
      </View>

      <Text style={styles.termsText}>
        By completing this order , I agree to all{' '}
        <Text style={styles.termsLink}>terms & condition .</Text>
      </Text>

      <DeliveryAddressModal 
        visible={addressModalVisible} 
        onClose={() => setAddressModalVisible(false)} 
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    color: COLORS.gray800,
  },
  mapImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  section: {
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gray700,
    marginBottom: 8,
  },
  instructionInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 30,
    paddingHorizontal: 20,
    height: 50,
    fontSize: 14,
    color: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 10,
    backgroundColor: '#F8F9FA',
  },
  optionSelected: {
    borderColor: COLORS.primaryOrange,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  optionTime: {
    fontSize: 10,
    color: COLORS.gray400,
  },
  pricePill: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pricePillText: {
    fontSize: 10,
    color: COLORS.gray500,
  },
  addPayment: {
    marginTop: 10,
    paddingLeft: 30,
  },
  addPaymentText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryItem: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  summaryPrice: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginVertical: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  billValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.gray800,
  },
  termsText: {
    fontSize: 10,
    color: COLORS.gray500,
    textAlign: 'center',
    marginVertical: 10,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
});

export default CheckoutSection;
