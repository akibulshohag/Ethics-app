import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PromotionOneScreen from '../screens/PromotionOneScreen';

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
    </PromotionOneStack.Navigator>
  );
};

export default PromotionOneNavigation;