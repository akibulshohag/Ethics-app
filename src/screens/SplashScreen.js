import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import splashArt from '../assets/img/b1.png';
import OnboardingDotLoader from '../components/OnboardingDotLoader';

const SPLASH_DURATION_MS = 2800;

const SplashScreen = ({ navigation }) => {
  const navigatedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (navigatedRef.current) {
        return;
      }
      navigatedRef.current = true;
      navigation.replace('Onboarding');
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <Image source={splashArt} style={styles.background} resizeMode="cover" />

      <View style={styles.loaderWrap} pointerEvents="none">
        <OnboardingDotLoader size={56} color="#FFFFFF" />
      </View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF7F0B',
  },
  background: {
    width,
    height,
  },
  loaderWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: height * 0.555,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SplashScreen;
