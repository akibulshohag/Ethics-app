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
    </LibraryStack.Navigator>
  );
};

export default LibraryNavigation;
