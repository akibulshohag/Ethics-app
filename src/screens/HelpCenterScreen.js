import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const HelpCenterScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('FAQ');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['General', 'Account', 'Service', 'Video'];

  const searchResults = [
    "Why did my video upload didn't working?",
    "Why can't I add multiple accounts?",
    "Why can't I delete an uploaded video?",
    "Why can't I sync accounts with MeTube?",
  ];

  const faqData = [
    {
      question: 'What is Eatwaze?',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
    },
    {
      question: 'How to use Eatwaze?',
      answer: 'Follow the onboarding steps to set up your profile...',
    },
    {
      question: 'How do I delete a video?',
      answer:
        'To delete a video, go to your profile, select the video you want to delete, and tap the delete button.',
    },
  ];

  const contactOptions = [
    { label: 'Customer Service', icon: 'headphones' },
    { label: 'WhatsApp', icon: 'whatsapp' },
    { label: 'Website', icon: 'earth' },
    { label: 'Facebook', icon: 'facebook' },
    { label: 'Twitter', icon: 'twitter' },
    { label: 'Instagram', icon: 'instagram' },
  ];

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <TouchableOpacity>
          <Icon name="dots-horizontal-circle-outline" size={28} color="#333" />
        </TouchableOpacity>
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
      >
        {activeTab === 'FAQ' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryBtn,
                    selectedCategory === cat && styles.categoryBtnActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === cat && styles.categoryTextActive,
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
                placeholder="Search"
                style={styles.searchInput}
                placeholderTextColor="#ccc"
                onFocus={() => setIsSearching(true)}
                onBlur={() => setIsSearching(false)}
                onChangeText={setSearchQuery}
                value={searchQuery}
              />
              <Icon name="tune-variant" size={20} color="#FF7A00" />
            </View>

            {isSearching ? (
              <View style={styles.resultsCard}>
                {searchResults.map((result, index) => (
                  <TouchableOpacity key={index} style={styles.resultItem}>
                    <Text style={styles.resultText}>{result}</Text>
                    {index < searchResults.length - 1 && (
                      <View style={styles.resultDivider} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              faqData.map((item, index) => (
                <View key={index} style={styles.accordionCard}>
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
          /* Contact Us UI */
          <View style={styles.contactContainer}>
            {contactOptions.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactCard}
                activeOpacity={0.8}
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
  resultsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  resultItem: { paddingHorizontal: 20, paddingVertical: 15 },
  resultText: { fontSize: 15, color: '#333', fontWeight: '500' },
  resultDivider: { height: 1, backgroundColor: '#F1F2F4', marginTop: 15 },
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

  // New Contact Us Styles
  contactContainer: {
    paddingTop: 20,
    paddingHorizontal: 16,
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
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
