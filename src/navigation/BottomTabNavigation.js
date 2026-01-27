import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import HomeNavigation from './HomeNavigation';
import ProfileScreen from '../screens/ProfileScreen';
import { BottomTabLessScreens } from '../constants/BottomLessScreens';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const getTabBarStyle = route => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? '';
  return BottomTabLessScreens.includes(routeName) ? { display: 'none' } : {};
};

const BottomNaivgation = () => {
  const tabHeight = Platform.OS === 'ios' ? 82 : 68;

  const Tab = createBottomTabNavigator();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
      >
        <Tab.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            popToTopOnBlur: true,
            tabBarStyle: {
              backgroundColor: '#FEFEFE',
              borderTopWidth: 1,
              borderTopColor: '#FEFEFE',
              height: tabHeight,
              paddingBottom: Platform.OS === 'ios' ? 20 : 8,
              paddingTop: 8,
            },
            tabBarActiveTintColor: '#4275c2',
            tabBarInactiveTintColor: '#b42d2d',
            tabBarLabelStyle: styles.tabBarLabelStyle,
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeNavigation}
            options={({ route }) => ({
              tabBarLabel: 'Home',
              tabBarStyle: {
                backgroundColor: '#FEFEFE',
                borderTopWidth: 1,
                borderTopColor: 'red',
                height: tabHeight,
                paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                paddingTop: 8,
                ...getTabBarStyle(route),
              },
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="home-outline"
                  size={26}
                  color={color}
                  style={{ opacity: focused ? 1 : 0.7 }}
                />
              ),
            })}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarLabel: 'Profile',
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="account-circle-outline"
                  size={26}
                  color={color}
                  style={{ opacity: focused ? 1 : 0.7 }}
                />
              ),
            }}
          />
        </Tab.Navigator>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 4,
  },
});

export default BottomNaivgation;
