import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PromotionOneScreen from '../screens/PromotionOneScreen';
import PromotionDetailScreen from '../screens/PromotionDetailScreen';
import PromotionTwoScreen from '../screens/PromotionTwoScreen';

const PromotionOneStack = createStackNavigator();

const PromotionOneNavigation = () => {
  return (
    <PromotionOneStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="PromotionOneScreen"
    >
      <PromotionOneStack.Screen
        name="PromotionOneScreen"
        component={PromotionOneScreen}
      />
      <PromotionOneStack.Screen
        name="PromotionDetail"
        component={PromotionDetailScreen}
      />
      <PromotionOneStack.Screen
        name="PromotionTwo"
        component={PromotionTwoScreen}
      />
    </PromotionOneStack.Navigator>
  );
};

export default PromotionOneNavigation;