import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  COMMUNITY_EULA_SUMMARY,
  EATWAZE_PRIVACY_URL,
  EATWAZE_TERMS_URL,
} from '../constants/communityTerms';

export default function TermsAcceptRow({ accepted, onToggle, compact = false }) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => onToggle(!accepted)}
        activeOpacity={0.8}
      >
        <Icon
          name={accepted ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={accepted ? '#F5A623' : '#888'}
        />
        <Text style={styles.checkLabel}>
          I agree to the{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL(EATWAZE_TERMS_URL).catch(() => {})}
          >
            Terms of Use
          </Text>{' '}
          and{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL(EATWAZE_PRIVACY_URL).catch(() => {})}
          >
            Privacy Policy
          </Text>
          . {COMMUNITY_EULA_SUMMARY}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  wrapCompact: {
    marginTop: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#444',
  },
  link: {
    color: '#F5A623',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
