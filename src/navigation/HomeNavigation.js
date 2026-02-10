import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Home from '../screens/HomeScreen';
import HomeVersion from '../screens/HomeVersion';
const HomeStack = createStackNavigator();
const HomeNavigation = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeScreen"
    >
      <HomeStack.Screen name="HomeScreen" component={HomeVersion} />
    </HomeStack.Navigator>
  );
};

export default HomeNavigation;
