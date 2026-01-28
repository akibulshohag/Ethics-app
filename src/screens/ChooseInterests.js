import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import NotificationModal from './NotificationModal';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  COMMON_STYLES,
} from '../constants/theme';

const INTERESTS = [
  { id: '1', name: 'Burger', image: 'https://i.imgur.com/your-burger.png' },
  { id: '2', name: 'Vegetables', image: 'https://i.imgur.com/your-veg.png' },
  { id: '3', name: 'Pizza', image: 'https://i.imgur.com/your-pizza.png' },
  { id: '4', name: 'Biryani', image: 'https://i.imgur.com/your-biryani.png' },
  { id: '5', name: 'Fish Fry', image: 'https://i.imgur.com/your-fish.png' },
  { id: '6', name: 'Drink', image: 'https://i.imgur.com/your-drink.png' },
  { id: '7', name: 'Beef', image: 'https://i.imgur.com/your-beef.png' },
  { id: '8', name: 'Mattoon', image: 'https://i.imgur.com/your-mutton.png' },
  { id: '9', name: 'Camino', image: 'https://i.imgur.com/your-camino.png' },
  {
    id: '10',
    name: 'Diabetes',
    image: 'https://i.imgur.com/your-diabetes.png',
  },
  { id: '11', name: 'Others', image: 'https://i.imgur.com/your-others.png' },
];

const ChooseInterests = () => {
  const navigation = useNavigation();
  const [selectedIds, setSelectedIds] = useState(['1', '7', '10']);
  const [showNotification, setShowNotification] = useState(false);
  const [showGoHome, setShowGoHome] = useState(false);

  const toggleInterest = id => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.chip,
          isSelected ? styles.chipSelected : styles.chipUnselected,
        ]}
        onPress={() => toggleInterest(item.id)}
      >
        <Image source={{ uri: item.image }} style={styles.chipImage} />
        <Text
          style={[
            styles.chipText,
            isSelected ? styles.textSelected : styles.textUnselected,
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF7A00" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Interests Foods</Text>
        <Text style={styles.headerSubtitle}>
          Let's get started on your journey to better health.
        </Text>
      </View>

      <View style={styles.content}>
        <FlatList
          data={INTERESTS}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.button, styles.skipButton]}>
            <Text style={[styles.buttonText, styles.skipText]}>Skip</Text>
          </TouchableOpacity>
          {showGoHome ? (
            <TouchableOpacity
              style={[styles.button, styles.nextButton]}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={[styles.buttonText, styles.nextText]}>
                Go to Home
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.nextButton]}
              onPress={() => setShowNotification(true)}
            >
              <Text style={[styles.buttonText, styles.nextText]}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <NotificationModal
        visible={showNotification}
        onAllow={() => {
          setShowNotification(false);
          setShowGoHome(true);
        }}
        onDecline={() => setShowNotification(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryOrange,
  },
  header: {
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  headerTitle: {
    ...COMMON_STYLES.h1,
    color: COLORS.white,
    lineHeight: 40,
    marginBottom: SPACING.md,
  },
  headerSubtitle: {
    ...COMMON_STYLES.body,
    color: COLORS.white,
    opacity: 0.9,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
  },
  listContent: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xxxl,
    borderWidth: 1,
    marginBottom: SPACING.md,
    width: '48%',
  },
  chipSelected: {
    backgroundColor: COLORS.primaryOrange,
    borderColor: COLORS.primaryOrange,
  },
  chipUnselected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.gray300,
  },
  chipImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.md,
  },
  chipText: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
  },
  textSelected: {
    color: COLORS.white,
  },
  textUnselected: {
    color: COLORS.textPrimary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  button: {
    flex: 0.48,
    height: 58,
    borderRadius: BORDER_RADIUS.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#FFF4EB',
  },
  nextButton: {
    backgroundColor: COLORS.primaryOrange,
  },
  buttonText: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
  },
  skipText: {
    color: COLORS.primaryOrange,
  },
  nextText: {
    color: COLORS.white,
  },
});

export default ChooseInterests;
