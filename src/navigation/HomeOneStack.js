import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeOneScreen from '../screens/HomeOneScreen';
import ProductShortsVideo from '../screens/NewScreen/ProductShortsVideo';
import HomeThreeScreen from '../screens/HomeThreeScreen';
import HomeFourScreen from '../screens/HomeFourScreen';
import HomeFiveScreen from '../screens/HomeFiveScreen';
import HomeTwoScreen from '../screens/HomeTwoScreen';
import HomeSixScreen from '../screens/HomeSixScreen';
import HomeSevenScreen from '../screens/HomeSevenScreen';
import CartDetailsScreen from '../screens/CartDetailsScreen';
import CheckoutScreen from '../screens/CheckoutScreen';

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
      <HomeOneStack.Screen
        name="HomeThreeScreen"
        component={HomeThreeScreen}
      />
      <HomeOneStack.Screen
        name="HomeFourScreen"
        component={HomeFourScreen}
      />
      <HomeOneStack.Screen
        name="HomeFiveScreen"
        component={HomeFiveScreen}
      />
      <HomeOneStack.Screen
        name="HomeTwoScreen"
        component={HomeTwoScreen}
      />
      <HomeOneStack.Screen
        name="HomeSixScreen"
        component={HomeSixScreen}
      />
      <HomeOneStack.Screen
        name="HomeSevenScreen"
        component={HomeSevenScreen}
      />
      <HomeOneStack.Screen
        name="CartDetailsScreen"
        component={CartDetailsScreen}
      />
      <HomeOneStack.Screen
        name="CheckoutScreen"
        component={CheckoutScreen}
      />
    </HomeOneStack.Navigator>
  );
};

export default HomeOneNavigation;