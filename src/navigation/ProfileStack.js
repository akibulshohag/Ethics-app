import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import ProfileScreen from '../screens/ProfileScreen';
import VideoDetailsScreen from '../screens/VideoDetailsScreen';
import ChannelDetailsScreen from '../screens/ChanneDetailsScreen';
import ShortsVideoScreen from '../screens/ShortsVideoScreen';
const ProfileStack = createStackNavigator();
const ProfileNavigation = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="ProfileScreen">
      <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
      <ProfileStack.Screen name="VideoDetailsScreen" component={VideoDetailsScreen} />
      <ProfileStack.Screen name="ChannelDetailsScreen" component={ChannelDetailsScreen} />
      <ProfileStack.Screen name="ShortsVideoScreen" component={ShortsVideoScreen} />
    </ProfileStack.Navigator>
  );
};

export default ProfileNavigation;