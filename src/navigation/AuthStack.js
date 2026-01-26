import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import Login from '../screens/LoginScreen';

const AccountNav = createStackNavigator();

const AuthStack = () => {
  return (
    <AccountNav.Navigator screenOptions={{headerShown: false}}>
      <AccountNav.Screen name="Login" component={Login} />
    </AccountNav.Navigator>
  );
};

export default AuthStack;