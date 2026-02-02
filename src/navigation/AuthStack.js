import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import Login from '../screens/LoginScreen';
import SignUp from '../screens/SignUpScreen';
import AccountScreen from '../screens/AccountScreen';
import CreatePinScreen from '../screens/CreatePinScreen';
import SetFingerprint from '../screens/SetFingerprint';
import ChooseInterests from '../screens/ChooseInterests';
import ForgotPassword from '../screens/ForgotPassword';
import OtpVerification from '../screens/OtpVerification';
import CreateNewPassword from '../screens/CreateNewPassword';
import HomeVersion from '../screens/HomeVersion';
import ProfileScreen from '../screens/ProfileScreen';
import VideoDetailsScreen from '../screens/VideoDetailsScreen';
import ChannelDetailsScreen from '../screens/ChanneDetailsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import LibraryScreen from '../screens/LibraryScreen';

const AccountNav = createStackNavigator();

const AuthStack = () => {
  return (
    <AccountNav.Navigator screenOptions={{ headerShown: false }}>
      <AccountNav.Screen name="Splash" component={SplashScreen} />
      <AccountNav.Screen name="Onboarding" component={OnboardingScreen} />
      <AccountNav.Screen name="Login" component={Login} />
      <AccountNav.Screen name="SignUp" component={SignUp} />
      <AccountNav.Screen name="Account" component={AccountScreen} />
      <AccountNav.Screen name="CreatePin" component={CreatePinScreen} />
      <AccountNav.Screen name="SetFingerprint" component={SetFingerprint} />
      <AccountNav.Screen name="ChooseInterests" component={ChooseInterests} />
      <AccountNav.Screen name="ForgotPassword" component={ForgotPassword} />
      <AccountNav.Screen name="OtpVerification" component={OtpVerification} />
      <AccountNav.Screen
        name="CreateNewPassword"
        component={CreateNewPassword}
      />
      <AccountNav.Screen name="Home" component={HomeVersion} />
      <AccountNav.Screen name="ProfileScreen" component={ProfileScreen} />
      <AccountNav.Screen name="Profile" component={ProfileScreen} />
      <AccountNav.Screen
        name="VideoDetailsScreen"
        component={VideoDetailsScreen}
      />
      <AccountNav.Screen
        name="ChannelDetailsScreen"
        component={ChannelDetailsScreen}
      />
      <AccountNav.Screen
        name="SubscriptionScreen"
        component={SubscriptionScreen}
      />
      <AccountNav.Screen
        name="LibraryScreen"
        component={LibraryScreen}
      />
    </AccountNav.Navigator>
  );
};

export default AuthStack;
