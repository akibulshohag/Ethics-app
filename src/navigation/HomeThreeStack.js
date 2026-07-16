import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeThreeScreen from '../screens/HomeThreeScreen';

const HomeThreeStack = createStackNavigator();

const HomeThreeNavigation = () => {
  return (
    <HomeThreeStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeThreeScreen"
    >
      <HomeThreeStack.Screen
        name="HomeThreeScreen"
        component={HomeThreeScreen}
      />
    </HomeThreeStack.Navigator>
  );
};

export default HomeThreeNavigation;