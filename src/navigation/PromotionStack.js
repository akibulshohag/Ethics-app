import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PromotionScreen from '../screens/PromotionScreen';
import PromotionDetailScreen from '../screens/PromotionDetailScreen';
import PromotionTwoScreen from '../screens/PromotionTwoScreen';

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
      <PromotionStack.Screen
        name="PromotionDetail"
        component={PromotionDetailScreen}
      />
      <PromotionStack.Screen
        name="PromotionTwo"
        component={PromotionTwoScreen}
      />
    </PromotionStack.Navigator>
  );
};

export default PromotionNavigation;