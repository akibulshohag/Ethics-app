import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  DIMENSIONS,
  COMMON_STYLES,
} from '../constants/theme';

const HomeVersion = () => {
  const CATEGORIES = ['Trending', 'All', 'For You', 'Live'];

  const StoryCircle = ({ label }) => (
    <View style={styles.storyContainer}>
      <View style={styles.storyBorder}>
        <Image
          source={{ uri: 'https://via.placeholder.com/100' }}
          style={styles.storyImage}
        />
      </View>
      <Text style={styles.storyLabel}>{label}</Text>
    </View>
  );

  const VideoCard = () => (
    <View style={styles.videoCard}>
      <Image
        source={{ uri: 'https://via.placeholder.com/400x200' }}
        style={styles.mainVideoThumb}
      />
      <View style={styles.videoInfo}>
        <View style={styles.channelIcon} />
        <View style={styles.textContainer}>
          <Text style={styles.videoTitle}>
            Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix
          </Text>
          <Text style={styles.videoMeta}>
            BBC Earth • 9.8M views • 3 months ago
          </Text>
        </View>
        <Icon name="dots-vertical" size={20} color={COLORS.textPrimary} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <Text style={styles.logoText}>
          eat<Text style={{ color: '#FF7A00' }}>ix</Text>
        </Text>
        <View style={styles.navIcons}>
          <Icon
            name="magnify"
            size={26}
            color={COLORS.textPrimary}
            style={styles.iconSpaced}
          />
          <Icon
            name="bell-outline"
            size={26}
            color={COLORS.textPrimary}
            style={styles.iconSpaced}
          />
          <View style={styles.profileMini} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {CATEGORIES.map((cat, i) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, i === 0 && styles.chipActive]}
            >
              <Text style={[styles.chipText, i === 0 && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.storyScroll}
        >
          {['Tomato Guy', 'Fire Baking', 'Tomato Girl'].map(name => (
            <StoryCircle key={name} label={name} />
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Icon name="video-outline" size={24} color={COLORS.primaryOrange} />
          <Text style={styles.sectionTitle}>Shorts</Text>
        </View>
        <View style={styles.shortsGrid}>
          <Image
            source={{ uri: 'https://via.placeholder.com/200x300' }}
            style={styles.shortThumb}
          />
          <Image
            source={{ uri: 'https://via.placeholder.com/200x300' }}
            style={styles.shortThumb}
          />
        </View>

        <VideoCard />
        <VideoCard />
      </ScrollView>

      <View style={styles.tabBar}>
        <Icon name="home" size={28} color={COLORS.primaryOrange} />
        <Icon
          name="play-box-multiple-outline"
          size={28}
          color={COLORS.gray500}
        />
        <View style={styles.fabContainer}>
          <Icon name="plus" size={30} color={COLORS.white} />
        </View>
        <Icon name="youtube-subscription" size={28} color={COLORS.gray500} />
        <Icon name="library-outline" size={28} color={COLORS.gray500} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: SPACING.xxl,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  logoText: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
  },
  navIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpaced: {
    marginRight: SPACING.md,
  },
  profileMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray300,
  },
  chipScroll: {
    marginVertical: SPACING.md,
    paddingLeft: SPACING.lg,
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.xxxl,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
    marginRight: SPACING.md,
  },
  chipActive: {
    backgroundColor: COLORS.primaryOrange,
  },
  chipText: {
    color: COLORS.primaryOrange,
    fontWeight: FONTS.semiBold,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  storyScroll: {
    paddingLeft: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  storyContainer: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  storyBorder: {
    padding: SPACING.xs,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.primaryOrange,
  },
  storyImage: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
  },
  storyLabel: {
    fontSize: FONTS.xs,
    marginTop: SPACING.xs,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    marginLeft: SPACING.md,
  },
  shortsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  shortThumb: {
    width: '48%',
    height: 280,
    borderRadius: BORDER_RADIUS.lg,
  },
  videoCard: {
    marginBottom: SPACING.xl,
  },
  mainVideoThumb: {
    width: '100%',
    height: 220,
  },
  videoInfo: {
    flexDirection: 'row',
    padding: SPACING.md,
    alignItems: 'flex-start',
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray200,
  },
  textContainer: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  videoTitle: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  videoMeta: {
    fontSize: FONTS.sm,
    color: COLORS.gray600,
    marginTop: SPACING.xs,
  },
  tabBar: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.gray200,
  },
  fabContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -SPACING.md,
  },
});

export default HomeVersion;
