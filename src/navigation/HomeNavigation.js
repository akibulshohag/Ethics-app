import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeVersion from '../screens/HomeVersion';
import VideoDetailsScreen from '../screens/VideoDetailsScreen';

const HomeStack = createStackNavigator();

const HomeNavigation = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeScreen"
    >
      <HomeStack.Screen name="HomeScreen" component={HomeVersion} />
      <HomeStack.Screen name="VideoDetailsScreen" component={VideoDetailsScreen} />
    </HomeStack.Navigator>
  );
};

export default HomeNavigation;
