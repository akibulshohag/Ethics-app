import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PromotionThreeScreen from '../screens/PromotionThreeScreen';

const PromotionThreeStack = createStackNavigator();

const PromotionThreeNavigation = () => {
  return (
    <PromotionThreeStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="PromotionThreeScreen"
    >
      <PromotionThreeStack.Screen
        name="PromotionThreeScreen"
        component={PromotionThreeScreen}
      />
    </PromotionThreeStack.Navigator>
  );
};

export default PromotionThreeNavigation;