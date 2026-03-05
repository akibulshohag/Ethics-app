import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LibraryScreen from '../screens/LibraryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AccountScreen from '../screens/AccountScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import VideoDetailsScreen from '../screens/VideoDetailsScreen';
import ChannelDetailsScreen from '../screens/ChanneDetailsScreen';
import ShortsVideoScreen from '../screens/ShortsVideoScreen';
import ChannelProfileScreen from '../screens/ChannelProfileScreen';
import CreateShortsScreen from '../screens/CreateShortsScreen';
import UploadVideoScreen from '../screens/UploadVideoScreen';
import LikedScreen from '../screens/LikedScreen';
import WatchLaterScreen from '../screens/WatchLaterScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GeneralSettingsScreen from '../screens/GeneralSettingsScreen';
import DataSavingScreen from '../screens/DataSavingScreen';
import VideoQualityPreferencesScreen from '../screens/VideoQualityPreferencesScreen';
import BackgroundDownloadsScreen from '../screens/BackgroundDownloadsScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import IncognitoScreen from '../screens/IncognitoScreen';
import TimeWatchedScreen from '../screens/TimeWatchedScreen';
import MenuManageScreen from '../screens/MenuManageScreen';
import OrderListScreen from '../screens/OrderListScreen';
import ChatScreen from '../screens/ChatScreen';

const LibraryStack = createStackNavigator();

const LibraryNavigation = () => {
  return (
    <LibraryStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="LibraryScreen"
    >
      <LibraryStack.Screen name="LibraryScreen" component={LibraryScreen} />
      <LibraryStack.Screen name="ProfileScreen" component={ProfileScreen} />
      <LibraryStack.Screen name="AccountScreen" component={AccountScreen} />
      <LibraryStack.Screen
        name="SubscriptionScreen"
        component={SubscriptionScreen}
      />
      <LibraryStack.Screen
        name="VideoDetailsScreen"
        component={VideoDetailsScreen}
      />
      <LibraryStack.Screen
        name="ChannelDetailsScreen"
        component={ChannelDetailsScreen}
      />
      <LibraryStack.Screen
        name="ShortsVideoScreen"
        component={ShortsVideoScreen}
      />
      <LibraryStack.Screen
        name="ChannelProfileScreen"
        component={ChannelProfileScreen}
      />
      <LibraryStack.Screen
        name="CreateShortsScreen"
        component={CreateShortsScreen}
      />
      <LibraryStack.Screen
        name="UploadVideoScreen"
        component={UploadVideoScreen}
      />
      <LibraryStack.Screen name="LikedScreen" component={LikedScreen} />
      <LibraryStack.Screen name="WatchLaterScreen" component={WatchLaterScreen} />
      <LibraryStack.Screen name="FavoritesScreen" component={FavoritesScreen} />
      <LibraryStack.Screen name="SettingsScreen" component={SettingsScreen} />
      <LibraryStack.Screen
        name="GeneralSettingsScreen"
        component={GeneralSettingsScreen}
      />
      <LibraryStack.Screen
        name="DataSavingScreen"
        component={DataSavingScreen}
      />
      <LibraryStack.Screen
        name="VideoQualityPreferencesScreen"
        component={VideoQualityPreferencesScreen}
      />
      <LibraryStack.Screen
        name="BackgroundDownloadsScreen"
        component={BackgroundDownloadsScreen}
      />
      <LibraryStack.Screen
        name="HelpCenterScreen"
        component={HelpCenterScreen}
      />
      <LibraryStack.Screen name="IncognitoScreen" component={IncognitoScreen} />
      <LibraryStack.Screen
        name="TimeWatchedScreen"
        component={TimeWatchedScreen}
      />
      <LibraryStack.Screen name="MenuManageScreen" component={MenuManageScreen} />
      <LibraryStack.Screen name="OrderListScreen" component={OrderListScreen} />
      <LibraryStack.Screen name="ChatScreen" component={ChatScreen} />
    </LibraryStack.Navigator>
  );
};

export default LibraryNavigation;
