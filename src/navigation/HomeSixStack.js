import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeSixScreen from '../screens/HomeSixScreen';

const HomeSixStack = createStackNavigator();

const HomeSixNavigation = () => {
  return (
    <HomeSixStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeSixScreen"
    >
      <HomeSixStack.Screen
        name="HomeSixScreen"
        component={HomeSixScreen}
      />
    </HomeSixStack.Navigator>
  );
};

export default HomeSixNavigation;