import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { upsertMyAppRating } from '../services/appRatingService';

const { width, height } = Dimensions.get('window');

const HomeFiveScreen = ({ onHomePress }) => {
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.app?.user);
  const token = currentUser?.token;
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const goHome = () => {
    if (onHomePress) {
      onHomePress();
    } else {
      navigation.navigate('HomeOneScreen');
    }
  };

  const submitAndGoHome = async () => {
    if (!token) {
      Alert.alert('Login required', 'Please login to submit a rating.');
      goHome();
      return;
    }
    if (!rating) {
      Alert.alert('Rate the app', 'Please select a star rating first.');
      return;
    }
    setSubmitting(true);
    try {
      await upsertMyAppRating(token, { rating });
      goHome();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

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
          onPress={submitAndGoHome}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color="#F5A623" />
              <Text style={styles.thanksTextMuted}>Submitting…</Text>
            </View>
          ) : (
            <Text style={styles.thanksText}>Thanks for Ordering</Text>
          )}
        </TouchableOpacity>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.rateText}>Rate our App</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Icon
                  name={star <= rating ? 'star' : 'star-outline'}
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
  thanksTextMuted: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  submittingRow: { flexDirection: 'row', alignItems: 'center' },
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
  },
});

export default HomeFiveScreen;
