import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const HomeFiveScreen = ({ onHomePress }) => {
  const navigation = useNavigation();

  const goHome = () => {
    if (onHomePress) {
      onHomePress();
    } else {
      navigation.navigate('HomeOneScreen');
    }
  };

  useEffect(() => {
    const timer = setTimeout(goHome, 10000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F5A623" />
      
      <View style={styles.content}>
        {/* Top Message */}
        <Text style={styles.successText}>Order successfully placed</Text>

        {/* Center Card */}
        <TouchableOpacity
          style={styles.thanksCard}
          activeOpacity={0.9}
          onPress={goHome}
        >
          <Text style={styles.thanksText}>Thanks for Ordering</Text>
        </TouchableOpacity>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.rateText}>Help us and rate</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star}>
                <Icon 
                  name="star-outline" 
                  size={45} 
                  color="#FFF" 
                  style={styles.starIcon} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Optional: Navigation back to home */}
      {/* <TouchableOpacity 
        style={styles.homeLink} 
        onPress={onHomePress}
      >
        <Text style={styles.homeLinkText}>Back to Home</Text>
      </TouchableOpacity> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5A623', // Brand orange color
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 25,
  },
  thanksCard: {
    backgroundColor: '#FFF',
    width: '90%',
    paddingVertical: 25,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  thanksText: {
    color: '#1A1A1A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  ratingSection: {
    marginTop: 40,
    alignItems: 'center',
  },
  rateText: {
    color: '#FFF',
    fontSize: 18,
    marginBottom: 15,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starIcon: {
    marginHorizontal: 5,
  },
  homeLink: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  homeLinkText: {
    color: '#FFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  }
});

export default HomeFiveScreen;