import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, ScrollView } from 'react-native';
import UserProfileCard from '../../components/UserProfileCard';

export default function UserProfileCardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <UserProfileCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
});

