import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SHADOWS } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DeliveryAddressModal = ({ visible, onClose }) => {
  const [selectedAddress, setSelectedAddress] = useState(1);

  const addresses = [
    {
      id: 1,
      title: 'Add a new address',
      detail: 'Noyaapra jamemosjdi road London',
      city: 'Dhaka',
    },
    {
      id: 2,
      title: 'Road,5 Dhamondi',
      detail: 'Noyaapra jamemosjdi road London',
      hasEdit: true,
    },
    {
      id: 3,
      title: 'Road,5 Dhamondi',
      detail: 'Noyaapra jamemosjdi road London',
      hasEdit: true,
    },
  ];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Top Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Delivery address</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {addresses.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.addressItem,
                  selectedAddress === item.id && styles.addressItemSelected
                ]}
                onPress={() => setSelectedAddress(item.id)}
              >
                <View style={styles.itemMain}>
                  <View style={[
                    styles.radioButton,
                    selectedAddress === item.id && styles.radioButtonSelected
                  ]}>
                    {selectedAddress === item.id && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDetail}>{item.detail}</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  {item.city && <Text style={styles.cityText}>{item.city}</Text>}
                  {item.hasEdit && (
                    <TouchableOpacity>
                      <Icon name="pencil-outline" size={20} color={COLORS.black} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.addNewRow}>
              <Icon name="plus" size={20} color={COLORS.gray600} />
              <Text style={styles.addNewText}>Add a new address</Text>
            </TouchableOpacity>

            <View style={styles.divider} />
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
              <Text style={styles.actionBtnText}>Add address details</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: SCREEN_HEIGHT * 0.6,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeBtn: {
    padding: 5,
  },
  scrollArea: {
    flex: 1,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  addressItemSelected: {
    borderColor: COLORS.primaryOrange,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  radioButtonSelected: {
    backgroundColor: COLORS.white,
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primaryOrange,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  itemRight: {
    paddingLeft: 10,
  },
  cityText: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  addNewText: {
    fontSize: 14,
    color: COLORS.gray600,
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginBottom: 20,
  },
  footer: {
    marginTop: 10,
  },
  actionBtn: {
    backgroundColor: COLORS.primaryOrange,
    height: 45,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.medium,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DeliveryAddressModal;
