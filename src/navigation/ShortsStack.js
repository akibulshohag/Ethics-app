import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ShortsVideoScreen from '../screens/ShortsVideoScreen';
import CreateShortsScreen from '../screens/CreateShortsScreen';
import LiveShortsScreen from '../screens/LiveShortsScreen';

const ShortsStack = createStackNavigator();

const ShortsNavigation = () => {
  return (
    <ShortsStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="ShortsVideoScreen"
    >
      <ShortsStack.Screen name="ShortsVideoScreen" component={ShortsVideoScreen} />
      <ShortsStack.Screen name="CreateShortsScreen" component={CreateShortsScreen} />
      <ShortsStack.Screen name="LiveShortsScreen" component={LiveShortsScreen} />
    </ShortsStack.Navigator>
  );
};

export default ShortsNavigation;
