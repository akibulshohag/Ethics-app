import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import Home from '../screens/HomeScreen';
import VideoDetailsScreen from '../screens/VideoDetailsScreen';
const HomeStack = createStackNavigator();
const HomeNavigation = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="HomeScreen">
      <HomeStack.Screen name="HomeScreen" component={Home} />
      <HomeStack.Screen name="VideoDetailsScreen" component={VideoDetailsScreen} />
    </HomeStack.Navigator>
  );
};

export default HomeNavigation;