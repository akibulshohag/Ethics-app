import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import Login from '../screens/LoginScreen';
import SignUp from '../screens/SignUpScreen';

const AccountNav = createStackNavigator();

const AuthStack = () => {
  return (
    <AccountNav.Navigator screenOptions={{ headerShown: false }}>
      <AccountNav.Screen name="Splash" component={SplashScreen} />
      <AccountNav.Screen name="Onboarding" component={OnboardingScreen} />
      <AccountNav.Screen name="Login" component={Login} />
      <AccountNav.Screen name="SignUp" component={SignUp} />
    </AccountNav.Navigator>
  );
};

export default AuthStack;
