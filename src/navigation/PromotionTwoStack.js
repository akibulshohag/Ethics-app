import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PromotionTwoScreen from '../screens/PromotionTwoScreen';

const PromotionTwoStack = createStackNavigator();

const PromotionTwoNavigation = () => {
  return (
    <PromotionTwoStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="PromotionTwoScreen"
    >
      <PromotionTwoStack.Screen
        name="PromotionTwoScreen"
        component={PromotionTwoScreen}
      />
    </PromotionTwoStack.Navigator>
  );
};

export default PromotionTwoNavigation;