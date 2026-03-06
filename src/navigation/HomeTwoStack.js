import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeTwoScreen from '../screens/HomeTwoScreen';

const HomeTwoStack = createStackNavigator();

const HomeTwoNavigation = () => {
  return (
    <HomeTwoStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeTwoScreen"
    >
      <HomeTwoStack.Screen
        name="HomeTwoScreen"
        component={HomeTwoScreen}
      />
    </HomeTwoStack.Navigator>
  );
};

export default HomeTwoNavigation;