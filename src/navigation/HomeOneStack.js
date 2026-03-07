import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeOneScreen from '../screens/HomeOneScreen';
import ProductShortsVideo from '../screens/NewScreen/ProductShortsVideo';

const HomeOneStack = createStackNavigator();

const HomeOneNavigation = () => {
  return (
    <HomeOneStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeOneScreen"
    >
      <HomeOneStack.Screen
        name="HomeOneScreen"
        component={HomeOneScreen}
      />
      <HomeOneStack.Screen
        name="ProductShortsVideo"
        component={ProductShortsVideo}
      />
    </HomeOneStack.Navigator>
  );
};

export default HomeOneNavigation;