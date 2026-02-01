import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProfileScreen = () => {
  const navigation = useNavigation();

  const handleLogout = () => {
    // In a real app, you would dispatch a logout action to clear user data from Redux
    Alert.alert('Logged out', 'You have been logged out successfully');
    // Navigate back to auth screens
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile Screen</Text>
        <Text style={styles.subtitle}>Manage your account settings</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('VideoDetailsScreen')}>
          <Text style={styles.logoutButtonText}>Videos Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('ChannelDetailsScreen')}>
          <Text style={styles.logoutButtonText}>Channel Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('ShortsVideoScreen')}>
          <Text style={styles.logoutButtonText}>Shorts Video</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: '#FF7F0B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
