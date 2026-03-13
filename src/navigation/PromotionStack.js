import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PromotionScreen from '../screens/PromotionScreen';
import PromotionFullDetailScreen from '../screens/PromotionFullDetailScreen';
import PromotionDetailScreen from '../screens/PromotionDetailScreen';
import PromotionTwoScreen from '../screens/PromotionTwoScreen';
import AllPromotionsScreen from '../screens/AllPromotionsScreen';

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
        name="AllPromotions"
        component={AllPromotionsScreen}
      />
      <PromotionStack.Screen
        name="PromotionFullDetail"
        component={PromotionFullDetailScreen}
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