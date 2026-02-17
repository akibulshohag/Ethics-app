import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../screens/ProfileScreen';
import AccountScreen from '../screens/AccountScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GeneralSettingsScreen from '../screens/GeneralSettingsScreen';
import DataSavingScreen from '../screens/DataSavingScreen';
import VideoQualityPreferencesScreen from '../screens/VideoQualityPreferencesScreen';
import BackgroundDownloadsScreen from '../screens/BackgroundDownloadsScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import VideoDetailsScreen from '../screens/VideoDetailsScreen';
import ChannelDetailsScreen from '../screens/ChanneDetailsScreen';
import ShortsVideoScreen from '../screens/ShortsVideoScreen';
import ChannelProfileScreen from '../screens/ChannelProfileScreen';
import CreateShortsScreen from '../screens/CreateShortsScreen';
import UploadVideoScreen from '../screens/UploadVideoScreen';

const ProfileStack = createStackNavigator();

const ProfileNavigation = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="ProfileScreen"
    >
      <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
      <ProfileStack.Screen name="AccountScreen" component={AccountScreen} />
      <ProfileStack.Screen
        name="SubscriptionScreen"
        component={SubscriptionScreen}
      />

      <ProfileStack.Screen name="SettingsScreen" component={SettingsScreen} />

      <ProfileStack.Screen
        name="GeneralSettingsScreen"
        component={GeneralSettingsScreen}
      />

      <ProfileStack.Screen
        name="DataSavingScreen"
        component={DataSavingScreen}
      />

      <ProfileStack.Screen
        name="VideoQualityPreferencesScreen"
        component={VideoQualityPreferencesScreen}
      />

      <ProfileStack.Screen
        name="BackgroundDownloadsScreen"
        component={BackgroundDownloadsScreen}
      />

      <ProfileStack.Screen
        name="HelpCenterScreen"
        component={HelpCenterScreen}
      />

      <ProfileStack.Screen
        name="VideoDetailsScreen"
        component={VideoDetailsScreen}
      />
      <ProfileStack.Screen
        name="ChannelDetailsScreen"
        component={ChannelDetailsScreen}
      />
      <ProfileStack.Screen
        name="ShortsVideoScreen"
        component={ShortsVideoScreen}
      />
      <ProfileStack.Screen
        name="ChannelProfileScreen"
        component={ChannelProfileScreen}
      />
      <ProfileStack.Screen
        name="CreateShortsScreen"
        component={CreateShortsScreen}
      />
      <ProfileStack.Screen
        name="UploadVideoScreen"
        component={UploadVideoScreen}
      />
    </ProfileStack.Navigator>
  );
};

export default ProfileNavigation;
