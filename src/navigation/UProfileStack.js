import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import UserProfileScreen from '../screens/UserProfileScreen';

const UProfileStack = createStackNavigator();

const UProfileNavigation = () => {
  return (
    <UProfileStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="UserProfileScreen"
    >
      <UProfileStack.Screen
        name="UserProfileScreen"
        component={UserProfileScreen}
      />
    </UProfileStack.Navigator>
  );
};

export default UProfileNavigation;
