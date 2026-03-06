import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PromotionScreen from '../screens/PromotionScreen';

const PromotionStack = createStackNavigator();

const PromotionNavigation = () => {
  return (
    <PromotionStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="PromotionScreen"
    >
      <PromotionStack.Screen
        name="PromotionScreen"
        component={PromotionScreen}
      />
    </PromotionStack.Navigator>
  );
};

export default PromotionNavigation;