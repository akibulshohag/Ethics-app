import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import VendorProfileScreen from '../screens/VendorProfileScreen';

const VProfileStack = createStackNavigator();

const VProfileNavigation = () => {
  return (
    <VProfileStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="VendorProfileScreen"
    >
      <VProfileStack.Screen
        name="VendorProfileScreen"
        component={VendorProfileScreen}
      />
    </VProfileStack.Navigator>
  );
};

export default VProfileNavigation;
