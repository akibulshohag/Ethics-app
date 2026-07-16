import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeSevenScreen from '../screens/HomeSevenScreen';

const HomeSevenStack = createStackNavigator();

const HomeSevenNavigation = () => {
  return (
    <HomeSevenStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeSixScreen"
    >
      <HomeSevenStack.Screen
        name="HomeSixScreen"
        component={HomeSevenScreen}
      />
    </HomeSevenStack.Navigator>
  );
};

export default HomeSevenNavigation;