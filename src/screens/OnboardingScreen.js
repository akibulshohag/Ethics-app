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
  {
    key: 'slide-1',
    image: onboard1,
    showBack: false,
    isLast: false,
  },
  {
    key: 'slide-2',
    image: onboard2,
    showBack: true,
    isLast: false,
  },
  {
    key: 'slide-3',
    image: onboard3,
    showBack: true,
    isLast: true,
  },
];

const NextCircleButton = ({ onPress, bottom }) => (
  <TouchableOpacity
    style={[styles.nextBtn, { bottom }]}
    onPress={onPress}
    activeOpacity={0.88}
    accessibilityRole="button"
    accessibilityLabel="Next"
  >
    <Icon name="arrow-right" size={18} color="#111111" />
  </TouchableOpacity>
);

const GetStartedButton = ({ onPress, bottom, left, right }) => (
  <TouchableOpacity
    style={[styles.getStartedBtn, { bottom, left, right }]}
    onPress={onPress}
    activeOpacity={0.88}
    accessibilityRole="button"
    accessibilityLabel="Get Started"
  >
    <Text style={styles.getStartedText}>Get Started</Text>
    <View style={styles.getStartedArrowWrap}>
      <Icon name="arrow-right" size={22} color="#111111" />
    </View>
  </TouchableOpacity>
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

  const bottomInset = insets.bottom + 36;
  const getStartedBottom = insets.bottom + 28;

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
        {SLIDES.map(slide => (
          <View key={slide.key} style={styles.slide}>
            <Image
              source={slide.image}
              style={styles.slideImage}
              resizeMode="cover"
            />

            {slide.showBack ? (
              <TouchableOpacity
                style={[
                  styles.backHitArea,
                  { top: insets.top + 8, left: 16 },
                ]}
                onPress={handleBack}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel="Back"
              />
            ) : null}

            {slide.isLast ? (
              <GetStartedButton
                onPress={handleNext}
                bottom={getStartedBottom}
                left={28}
                right={28}
              />
            ) : (
              <NextCircleButton onPress={handleNext} bottom={bottomInset} />
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
  backHitArea: {
    position: 'absolute',
    width: 56,
    height: 56,
    zIndex: 12,
  },
  nextBtn: {
    position: 'absolute',
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 5,
    borderColor: '#232323',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
  },
  getStartedBtn: {
    position: 'absolute',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 28,
    paddingRight: 8,
    zIndex: 12,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  getStartedArrowWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default OnboardingScreen;
