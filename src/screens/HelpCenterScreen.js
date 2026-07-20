import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  EATWAZE_PRIVACY_URL,
  EATWAZE_SUPPORT_EMAIL,
  EATWAZE_TERMS_URL,
  EATWAZE_WEBSITE_URL,
} from '../constants/communityTerms';

const CATEGORIES = ['General', 'Account', 'Orders', 'Video'];

const FAQ_DATA = [
  {
    category: 'General',
    question: 'What is Eatwaze?',
    answer:
      'Eatwaze is a UK food discovery app. Browse nearby restaurants, watch food shorts and videos, follow channels you like, and order from local vendors — all in one place.',
  },
  {
    category: 'General',
    question: 'How do I use Eatwaze?',
    answer:
      'Set your postcode or area on the home screen to see nearby food content. Tap Shorts or videos to watch, follow restaurants you like, and use Order when a vendor has an active menu. Create an account to save favourites, upload content, and place orders.',
  },
  {
    category: 'General',
    question: 'Where can I read the Privacy Policy and Terms?',
    answer:
      'Open Settings → Privacy Policy or Community Guidelines, or use the Contact us tab in Help Center to open our Privacy Policy and Terms of Use.',
  },
  {
    category: 'Account',
    question: 'How do I create or sign in to an account?',
    answer:
      'Tap Sign in from the home or library area, then register with email or use phone / social sign-in if available. You can reset a forgotten password from the login screen.',
  },
  {
    category: 'Account',
    question: 'How do I update my profile?',
    answer:
      'Open Library or your profile, then edit your name, photo, and business details (for vendors). Changes save to your Eatwaze account.',
  },
  {
    category: 'Account',
    question: 'How do I report or block someone?',
    answer:
      'Open the content or profile menu, then choose Report or Block. Reported content is reviewed under our community guidelines. Blocked users and their content are hidden from your feed.',
  },
  {
    category: 'Orders',
    question: 'How do I place an order?',
    answer:
      'Open a restaurant profile with an active menu, add items to your cart, then checkout. You need a signed-in account and a valid delivery address or collection option for that vendor.',
  },
  {
    category: 'Orders',
    question: 'Where can I see my order status?',
    answer:
      'Open the Orders tab to track live and past orders. Vendors and riders update status as the order is prepared and delivered.',
  },
  {
    category: 'Video',
    question: 'How do I upload a video or short?',
    answer:
      'Sign in, tap the + button, then choose a video from your library or record a new short. Add a title and details, then publish or schedule. Processing may take a short time before the video appears in your feed.',
  },
  {
    category: 'Video',
    question: 'How do I delete a video?',
    answer:
      'Go to your profile or Library, open the video you uploaded, tap the menu, and choose Delete. Deleted videos are removed from your channel and cannot be recovered.',
  },
  {
    category: 'Video',
    question: 'Why did my video upload fail?',
    answer:
      'Check your internet connection and that the file is a supported video format. Very large files may take longer or fail on a weak connection — try again on Wi‑Fi. If it still fails, contact support with the time you tried to upload.',
  },
];

const CONTACT_OPTIONS = [
  {
    label: 'Email support',
    icon: 'email-outline',
    url: `mailto:${EATWAZE_SUPPORT_EMAIL}?subject=${encodeURIComponent(
      'Eatwaze help request',
    )}`,
  },
  {
    label: 'Website',
    icon: 'earth',
    url: EATWAZE_WEBSITE_URL,
  },
  {
    label: 'Privacy Policy',
    icon: 'shield-account-outline',
    url: EATWAZE_PRIVACY_URL,
  },
  {
    label: 'Terms of Use',
    icon: 'file-document-outline',
    url: EATWAZE_TERMS_URL,
  },
];

const openExternalUrl = async url => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unavailable', 'This link cannot be opened on this device.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unavailable', 'Could not open this link. Please try again.');
  }
};

const HelpCenterScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('FAQ');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return FAQ_DATA.filter(item => {
      const matchesCategory = !query && item.category === selectedCategory;
      const matchesSearch =
        query.length > 0 &&
        (item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query));
      return query.length > 0 ? matchesSearch : matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const toggleAccordion = index => {
    const isNewArchitecture =
      typeof global !== 'undefined' &&
      (Boolean(global.nativeFabricUIManager) ||
        Boolean(global.__turboModuleProxy) ||
        Boolean(global.RN$Bridgeless));
    if (!isNewArchitecture) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const onSelectCategory = cat => {
    setSelectedCategory(cat);
    setSearchQuery('');
    setIsSearching(false);
    setExpandedIndex(0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabContainer}>
        {['FAQ', 'Contact us'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'FAQ' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryBtn,
                    selectedCategory === cat &&
                      !searchQuery.trim() &&
                      styles.categoryBtnActive,
                  ]}
                  onPress={() => onSelectCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === cat &&
                        !searchQuery.trim() &&
                        styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View
              style={[
                styles.searchContainer,
                isSearching && styles.searchContainerActive,
              ]}
            >
              <Icon
                name="magnify"
                size={24}
                color={isSearching ? '#FF7A00' : '#ccc'}
              />
              <TextInput
                placeholder="Search help topics"
                style={styles.searchInput}
                placeholderTextColor="#ccc"
                onFocus={() => setIsSearching(true)}
                onBlur={() => setIsSearching(false)}
                onChangeText={text => {
                  setSearchQuery(text);
                  setExpandedIndex(0);
                }}
                value={searchQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setExpandedIndex(0);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Icon name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>

            {filteredFaqs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No matching topics</Text>
                <Text style={styles.emptyText}>
                  Try another search, or open Contact us to email Eatwaze
                  support.
                </Text>
              </View>
            ) : (
              filteredFaqs.map((item, index) => (
                <View key={`${item.category}-${item.question}`} style={styles.accordionCard}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => toggleAccordion(index)}
                  >
                    <Text style={styles.questionText}>{item.question}</Text>
                    <Icon
                      name={
                        expandedIndex === index ? 'chevron-up' : 'chevron-down'
                      }
                      size={24}
                      color="#FF7A00"
                    />
                  </TouchableOpacity>
                  {expandedIndex === index && (
                    <View style={styles.accordionContent}>
                      <View style={styles.divider} />
                      <Text style={styles.answerText}>{item.answer}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          <View style={styles.contactContainer}>
            <Text style={styles.contactIntro}>
              Need more help? Reach Eatwaze support or read our policies below.
            </Text>
            {CONTACT_OPTIONS.map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.contactCard}
                activeOpacity={0.8}
                onPress={() => openExternalUrl(item.url)}
              >
                <View style={styles.contactLeft}>
                  <Icon
                    name={item.icon}
                    size={26}
                    color="#FF7A00"
                    style={styles.contactIcon}
                  />
                  <Text style={styles.contactLabel}>{item.label}</Text>
                </View>
                <Icon name="chevron-right" size={22} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  headerSpacer: { width: 28 },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#FF7A00' },
  tabText: { fontSize: 18, color: '#999', fontWeight: '500' },
  activeTabText: { color: '#FF7A00' },
  scrollContent: { paddingBottom: 30 },
  categoryScroll: { paddingVertical: 20, paddingHorizontal: 16 },
  categoryBtn: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FF7A00',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  categoryBtnActive: { backgroundColor: '#FF7A00' },
  categoryText: { color: '#FF7A00', fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F2F4',
    marginHorizontal: 16,
    borderRadius: 30,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchContainerActive: { backgroundColor: '#FFF1F0', borderColor: '#FF7A00' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#666', lineHeight: 20 },
  accordionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 20,
    marginBottom: 15,
    padding: 15,
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionText: { fontSize: 16, fontWeight: '700', color: '#333', flex: 1 },
  accordionContent: { marginTop: 10 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 10 },
  answerText: { fontSize: 14, color: '#666', lineHeight: 20 },
  contactContainer: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  contactIntro: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactIcon: {
    marginRight: 15,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
});

export default HelpCenterScreen;
