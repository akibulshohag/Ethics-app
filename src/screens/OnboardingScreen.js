import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { setOnboardingDone } from '../redux/actions/appSlice';

import onboard1 from '../assets/img/b2.png';
import onboard2 from '../assets/img/b3.png';
import onboard3 from '../assets/img/b4.png';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDES = [
  { key: 'slide-1', image: onboard1, isLast: false },
  { key: 'slide-2', image: onboard2, isLast: false },
  { key: 'slide-3', image: onboard3, isLast: true },
];

const ORANGE = '#F97507';

const PrimaryActionButton = ({
  label,
  onPress,
  bottom,
  left,
  right,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    style={[styles.primaryBtn, { bottom, left, right }]}
    onPress={onPress}
    activeOpacity={0.88}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || label}
  >
    <Text style={styles.primaryBtnText}>{label}</Text>
    <View style={styles.primaryBtnArrowWrap}>
      <Icon name="arrow-right" size={22} color={ORANGE} />
    </View>
  </TouchableOpacity>
);

const GetExploringButton = props => (
  <PrimaryActionButton label="Get Exploring" {...props} />
);

const LetsGetStartedButton = props => (
  <PrimaryActionButton label="Let's Get Started" {...props} />
);

const PreviousButton = ({ onPress, top, left }) => (
  <TouchableOpacity
    style={[styles.prevBtn, { top, left }]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel="Previous"
  >
    <Icon name="arrow-left" size={18} color="#FFFFFF" />
    <Text style={styles.prevText}>Previous</Text>
  </TouchableOpacity>
);

const SkipButton = ({ onPress, top, right }) => (
  <TouchableOpacity
    style={[styles.skipBtn, { top, right }]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel="Skip onboarding"
  >
    <Text style={styles.skipText}>Skip</Text>
    <Icon name="arrow-right" size={18} color="#FFFFFF" />
  </TouchableOpacity>
);

const OnboardingDots = ({ total, activeCount, bottom }) => (
  <View style={[styles.dotsRow, { bottom }]} pointerEvents="none">
    {Array.from({ length: total }).map((_, index) => (
      <View
        key={`dot-${index}`}
        style={[
          styles.dot,
          index > 0 && styles.dotSpacing,
          index < activeCount ? styles.dotActive : styles.dotInactive,
        ]}
      />
    ))}
  </View>
);

const OnboardingScreen = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToIndex = useCallback(index => {
    const nextIndex = Math.max(0, Math.min(index, SLIDES.length - 1));
    scrollRef.current?.scrollTo({
      x: nextIndex * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentIndex(nextIndex);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex >= SLIDES.length - 1) {
      dispatch(setOnboardingDone(true));
      return;
    }
    goToIndex(currentIndex + 1);
  }, [currentIndex, dispatch, goToIndex]);

  const handleBack = useCallback(() => {
    if (currentIndex <= 0) {
      return;
    }
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  const onScrollEnd = useCallback(
    event => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      if (index !== currentIndex) {
        setCurrentIndex(index);
      }
    },
    [currentIndex],
  );

  const handleSkip = useCallback(() => {
    dispatch(setOnboardingDone(true));
  }, [dispatch]);

  const actionBottom = insets.bottom + 24;
  const dotsBottom = insets.bottom + 92;
  const headerTop = insets.top + 10;
  const actionHorizontal = 24;

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
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.key} style={styles.slide}>
            <Image
              source={slide.image}
              style={styles.slideImage}
              resizeMode="cover"
            />

            {index > 0 ? (
              <PreviousButton
                onPress={handleBack}
                top={headerTop}
                left={20}
              />
            ) : null}

            <SkipButton
              onPress={handleSkip}
              top={headerTop}
              right={20}
            />

            <OnboardingDots
              total={SLIDES.length}
              activeCount={index + 1}
              bottom={dotsBottom}
            />

            {slide.isLast ? (
              <LetsGetStartedButton
                onPress={handleNext}
                bottom={actionBottom}
                left={actionHorizontal}
                right={actionHorizontal}
              />
            ) : (
              <GetExploringButton
                onPress={handleNext}
                bottom={actionBottom}
                left={actionHorizontal}
                right={actionHorizontal}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5A623',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  slideImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  prevBtn: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    zIndex: 12,
  },
  prevText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    zIndex: 12,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBtn: {
    position: 'absolute',
    height: 58,
    borderRadius: 29,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 28,
    paddingRight: 6,
    zIndex: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  primaryBtnArrowWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSpacing: {
    marginLeft: 10,
  },
  dotActive: {
    backgroundColor: ORANGE,
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});

export default OnboardingScreen;
