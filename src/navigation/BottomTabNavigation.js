import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import HomeNavigation from './HomeNavigation';
import ProfileNavigation from './ProfileStack';
import ShortsNavigation from './ShortsStack';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import CreateVideoModalScreen from '../screens/CreateVideoModalScreen';
import { BottomTabLessScreens } from '../constants/BottomLessScreens';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants/theme';

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
              backgroundColor: COLORS.white,
              borderTopWidth: 1,
              borderTopColor: COLORS.gray200,
              height: tabHeight,
              paddingBottom: Platform.OS === 'ios' ? 20 : 8,
              paddingTop: 8,
            },
            tabBarActiveTintColor: COLORS.primaryOrange,
            tabBarInactiveTintColor: COLORS.gray500,
            tabBarLabelStyle: styles.tabBarLabelStyle,
            tabBarShowLabel: false,
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeNavigation}
            options={({ route }) => ({
              tabBarStyle: {
                backgroundColor: COLORS.white,
                borderTopWidth: 1,
                borderTopColor: COLORS.gray200,
                height: tabHeight,
                paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                paddingTop: 8,
                ...getTabBarStyle(route),
              },
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="home"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            })}
          />

          <Tab.Screen
            name="Shorts"
            component={ShortsNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="play-box-multiple-outline"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Create"
            component={CreateVideoModalScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <View style={styles.fabContainer}>
                  <Icon name="plus" size={30} color={COLORS.white} />
                </View>
              ),
            }}
          />

          <Tab.Screen
            name="Subscriptions"
            component={SubscriptionsScreen}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="youtube-subscription"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Library"
            component={ProfileNavigation}
            options={({ route }) => ({
              tabBarStyle: {
                backgroundColor: COLORS.white,
                borderTopWidth: 1,
                borderTopColor: COLORS.gray200,
                height: tabHeight,
                paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                paddingTop: 8,
                ...getTabBarStyle(route),
              },
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="library-outline"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            })}
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
  fabContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default BottomNaivgation;
