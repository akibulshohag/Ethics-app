import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setOnboardingDone } from '../redux/actions/appSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  DIMENSIONS,
  COMMON_STYLES,
} from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = DIMENSIONS.screenWidth;

const SLIDES = [
  {
    key: 'slide-1',
    imageUri:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070',
    title: 'Tasty Meal\nDelivered Faster\nThan You Think !',
    subtitle:
      "Hi! You haven't added any medicines yet. Want me to help you set up the first one?",
    buttonColor: '#1A1A1A',
    buttonHoverColor: '#F97507',
    arrowColor: '#1A1A1A',
    gradientColors: ['transparent', 'rgba(255,255,255,0.8)', '#ffffff'],
  },
  {
    key: 'slide-2',
    imageUri:
      'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072',
    title: 'See The Video\nChose Your\nFavorite Food !',
    subtitle:
      "Hi! You haven't added any medicines yet. Want me to help you set up the first one?",
    buttonColor: '#1A1A1A',
    buttonHoverColor: '#F97507',
    arrowColor: '#1A1A1A',
    gradientColors: ['transparent', 'rgba(255,255,255,0.7)', COLORS.white],
    showBack: true,
  },
  {
    key: 'slide-3',
    imageUri:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974',
    title: 'Enjoy Your Day\nand Make a\nHealthy Life',
    subtitle:
      "Hi! You haven't added any medicines yet. Want me to help you set up the first one?",
    buttonColor: '#1A1A1A',
    buttonHoverColor: '#F97507',
    arrowColor: '#1A1A1A',
    gradientColors: ['transparent', 'rgba(255,255,255,0.8)', '#ffffff'],
    isLast: true,
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex >= SLIDES.length - 1) {
      dispatch(setOnboardingDone(true));
      return;
    }
    scrollRef.current?.scrollTo({
      x: (currentIndex + 1) * SCREEN_WIDTH,
      animated: true,
    });
  };

  const handleBack = () => {
    if (currentIndex <= 0) {
      return;
    }
    scrollRef.current?.scrollTo({
      x: (currentIndex - 1) * SCREEN_WIDTH,
      animated: true,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={event => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
          );
          if (index !== currentIndex) {
            setCurrentIndex(index);
          }
        }}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.key} style={styles.slide}>
            <ImageBackground
              source={{ uri: slide.imageUri }}
              style={styles.backgroundImage}
            >
              {slide.showBack ? (
                <SafeAreaView style={styles.topNav}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                  >
                    <Text style={styles.backIcon}>←</Text>
                  </TouchableOpacity>
                </SafeAreaView>
              ) : (
                <SafeAreaView style={styles.topNav} />
              )}

              <LinearGradient
                colors={slide.gradientColors}
                style={styles.gradient}
              >
                <View style={styles.contentContainer}>
                  <View style={styles.paginationRow}>
                    {SLIDES.map((_, dotIndex) => (
                      <View
                        key={`dot-${dotIndex}`}
                        style={[
                          styles.dot,
                          dotIndex === index && styles.activeDot,
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.textWrapper}>
                    <Text style={styles.title}>{slide.title}</Text>
                    <Text style={styles.subtitle}>{slide.subtitle}</Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.nextButton,
                      {
                        backgroundColor: pressed
                          ? slide.buttonHoverColor
                          : slide.buttonColor,
                      },
                    ]}
                    onPress={handleNext}
                  >
                    <Text style={styles.nextText}>
                      {slide.isLast ? 'Get Started' : 'Next'}
                    </Text>
                    <View style={styles.arrowCircle}>
                      <Text
                        style={[styles.arrowIcon, { color: slide.arrowColor }]}
                      >
                        →
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: COMMON_STYLES.container,
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  topNav: {
    paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 30,
    color: COLORS.white,
    fontWeight: FONTS.thin,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentContainer: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xxl,
  },
  dot: COMMON_STYLES.dot,
  activeDot: COMMON_STYLES.activeDot,
  textWrapper: {
    marginBottom: SPACING.xxxxl,
  },
  title: {
    ...COMMON_STYLES.h1,
    textAlign: 'left ',
  },
  subtitle: {
    ...COMMON_STYLES.bodyMedium,
    textAlign: 'left',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.xxl,
    color: COLORS.gray700,
  },
  nextButton: {
    width: '100%',
    height: DIMENSIONS.buttonHeight,
    borderRadius: BORDER_RADIUS.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xxl,
    ...SHADOWS.large,
  },
  nextText: {
    ...COMMON_STYLES.bodyLarge,
    color: COLORS.white,
    fontWeight: FONTS.semiBold,
  },
  arrowCircle: COMMON_STYLES.arrowCircle,
  arrowIcon: {
    fontSize: 22,
  },
});

export default OnboardingScreen;
