import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import Home from '../screens/HomeScreen';
const HomeStack = createStackNavigator();
const HomeNavigation = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="HomeScreen">
      <HomeStack.Screen name="HomeScreen" component={Home} />
    </HomeStack.Navigator>
  );
};

export default HomeNavigation;