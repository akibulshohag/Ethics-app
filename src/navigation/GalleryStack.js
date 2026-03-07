import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import GalleryScreen from '../screens/GalleryScreen';

const GalleryStack = createStackNavigator();

const GalleryNavigation = () => {
  return (
    <GalleryStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="GalleryScreen"
    >
      <GalleryStack.Screen
        name="GalleryScreen"
        component={GalleryScreen}
      />
    </GalleryStack.Navigator>
  );
};

export default GalleryNavigation;