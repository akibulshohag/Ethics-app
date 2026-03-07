import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import GalleryOneScreen from '../screens/GalleryOneScreen';

const GalleryOneStack = createStackNavigator();

const GalleryOneNavigation = () => {
  return (
    <GalleryOneStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="GalleryOneScreen"
    >
      <GalleryOneStack.Screen
        name="GalleryOneScreen"
        component={GalleryOneScreen}
      />
    </GalleryOneStack.Navigator>
  );
};

export default GalleryOneNavigation;