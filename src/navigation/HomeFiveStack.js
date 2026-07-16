import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeFiveScreen from '../screens/HomeFiveScreen';

const HomeFiveStack = createStackNavigator();

const HomeFiveNavigation = () => {
  return (
    <HomeFiveStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeFiveScreen"
    >
      <HomeFiveStack.Screen
        name="HomeFiveScreen"
        component={HomeFiveScreen}
      />
    </HomeFiveStack.Navigator>
  );
};

export default HomeFiveNavigation;