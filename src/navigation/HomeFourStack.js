import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeFourScreen from '../screens/HomeFourScreen';

const HomeFourStack = createStackNavigator();

const HomeFourNavigation = () => {
  return (
    <HomeFourStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeFourScreen"
    >
      <HomeFourStack.Screen
        name="HomeFourScreen"
        component={HomeFourScreen}
      />
    </HomeFourStack.Navigator>
  );
};

export default HomeFourNavigation;