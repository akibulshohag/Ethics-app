import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  getFocusedRouteNameFromRoute,
  useNavigation,
  useNavigationState,
} from '@react-navigation/native';
import HomeNavigation from './HomeNavigation';
import LibraryNavigation from './LibraryStack';
import ShortsNavigation from './ShortsStack';
import HomeOneNavigation from './HomeOneStack';
import HomeTwoNavigation from './HomeTwoStack';
import HomeSixNavigation from './HomeSixStack';
import HomeSevenNavigation from './HomeSevenStack';
import PromotionNavigation from './PromotionStack';
import PromotionOneNavigation from './PromotionOneStack';
import PromotionTwoNavigation from './PromotionTwoStack';
import PromotionThreeNavigation from './PromotionThreeStack';
import UProfileNavigation from './UProfileStack';
import VProfileNavigation from './VProfileStack';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import CreateVideoModalScreen from '../screens/CreateVideoModalScreen';
import AdminScreen from '../screens/AdminScreen';
import LiveOrdersScreen from '../screens/LiveOrdersScreen';
import OrderListScreen from '../screens/OrderListScreen';
import BusinessProfileViewScreen from '../screens/NewScreen/BusinessProfileViewScreen';
import UserViewsScreen from '../screens/NewScreen/UserViewsScreen';
import { BottomTabLessScreens } from '../constants/BottomLessScreens';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import FluidTabBar from './FluidTabBar';

const libraryTabIcon = require('../assets/Group.png');

/** Hide tab bar for these screens (LandingScreen, ProductShortsVideo, etc.) */
const getTabBarStyle = route => {
  if (route?.name === 'Shorts') return { display: 'none' };
  const routeName = getFocusedRouteNameFromRoute(route) ?? '';
  const name = routeName || (route?.name === 'Home1' ? 'LandingScreen' : '');
  return BottomTabLessScreens.includes(name) ? { display: 'none' } : undefined;
};

/** Orders tab: user role → own orders + status only; owner/admin → Live Orders with Accept/Reject */
function OrdersTabWrapper(props) {
  const user = useSelector(state => state.app?.user);
  const role = String(user?.role || '').toLowerCase();
  const isOwnerOrAdmin = [
    'owner',
    'vendor',
    'admin',
    'superadmin',
    'super_admin',
    'super-admin',
  ].includes(role);
  if (isOwnerOrAdmin) return <LiveOrdersScreen {...props} />;
  return <OrderListScreen {...props} />;
}

const BottomNaivgation = () => {
  const tabHeight = Platform.OS === 'ios' ? 82 : 68;
  const user = useSelector(state => state.app?.user);
  const navigation = useNavigation(); // Root stack navigation
  const tabState = useNavigationState(state => state); // Bottom tab state
  const currentTabName =
    tabState?.routes?.[tabState?.index || 0]?.name ?? 'Home1';
  const isShortsFullScreen = currentTabName === 'Shorts';
  const role = (user?.role || '').toLowerCase();
  const isOwner = role === 'owner';
  const isVendor = role === 'vendor';
  const isUser = role === 'user';
  const isAdmin =
    role === 'admin' ||
    role === 'superadmin' ||
    role === 'super_admin' ||
    role === 'super-admin';
  const showVProfileTab = role === 'vendor';

  const requireLogin = (e, tabName) => {
    if (!user) {
      e.preventDefault();
      navigation.navigate('Root', {
        screen: 'Home1',
        params: { screen: 'HomeSevenScreen' },
      });
    }
  };

  const Tab = createBottomTabNavigator();
  const defaultTabBarStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: Platform.OS === 'ios' ? 88 : 76,
  };

  /** If not logged in, prevent opening Create/Library and go to HomeSevenScreen (login) inside Home1 tab */
  const redirectToHomeThreeIfGuest = e => {
    if (!user?.id) {
      e.preventDefault();
      const rootNav = navigation.getParent?.() ?? navigation;
      rootNav.navigate('Root', {
        screen: 'Home1',
        params: { screen: 'HomeSevenScreen' },
      });
    }
  };

  /** Get { tab, screen } for the currently focused tab so Create can return here on close */
  const getReturnToFromState = () => {
    const state = tabState;
    if (!state?.routes?.length) {
      return { tab: 'Home1', screen: 'LandingScreen' };
    }
    const currentRoute = state.routes[state.index || 0];
    const tabName = currentRoute?.name;
    if (!tabName || tabName === 'Create')
      return { tab: 'Home1', screen: 'HomeOneScreen' };
    const screenName = getFocusedRouteNameFromRoute(currentRoute);
    const defaults = { Home1: 'LandingScreen', Library: 'LibraryScreen' };
    return {
      tab: tabName,
      screen: screenName || defaults[tabName] || 'HomeOneScreen',
    };
  };

  const onCreateTabPress = (e, tabNavigation) => {
    if (!user?.id) {
      redirectToHomeThreeIfGuest(e);
      return;
    }
    e.preventDefault();
    const returnTo = getReturnToFromState();
    tabNavigation.navigate('Create', {
      returnTo,
      _openPicker: Date.now(),
    });
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isShortsFullScreen ? '#000' : undefined,
      }}
      edges={isShortsFullScreen ? [] : ['left', 'right']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
      >
        <Tab.Navigator
          initialRouteName="Home1"
          tabBar={props => <FluidTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            popToTopOnBlur: true,
            tabBarStyle: defaultTabBarStyle,
            tabBarActiveTintColor: COLORS.primaryOrange,
            tabBarInactiveTintColor: COLORS.gray600,
            tabBarShowLabel: false,
          }}
        >
          <Tab.Screen
            name="Home1"
            component={HomeOneNavigation}
            options={({ route }) => ({
              tabBarStyle: getTabBarStyle(route) ?? defaultTabBarStyle,
            })}
          />

          {/* <Tab.Screen
            name="Home9"
            component={PromotionOneNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="account-outline"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          /> */}

          {/* <Tab.Screen
            name="Home10"
            component={PromotionTwoNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="account-outline"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          /> */}

          {/* <Tab.Screen
            name="Home11"
            component={PromotionThreeNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="account-outline"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          /> */}

          <Tab.Screen
            name="Shorts"
            component={ShortsNavigation}
            options={({ route }) => ({
              tabBarStyle: getTabBarStyle(route) ?? defaultTabBarStyle,
            })}
          />

          {/* <Tab.Screen
            name="UProfile"
            component={UProfileNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="account-outline"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          /> */}

          {/* {showVProfileTab && (
            <Tab.Screen
              name="VProfile"
              component={VProfileNavigation}
              options={{
                tabBarIcon: ({ focused, color }) => (
                  <Icon
                    name="account-outline"
                    size={28}
                    color={focused ? COLORS.primaryOrange : COLORS.gray500}
                  />
                ),
              }}
            />
          )} */}

          <Tab.Screen
            name="Create"
            component={CreateVideoModalScreen}
            listeners={({ navigation: tabNavigation }) => ({
              tabPress: e => onCreateTabPress(e, tabNavigation),
            })}
            options={{
              tabBarStyle: defaultTabBarStyle,
            }}
          />

          {/* <Tab.Screen
            name="Subscriptions"
            component={SubscriptionsScreen}
            listeners={{
              tabPress: e => requireLogin(e, 'Subscriptions'),
            }}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="youtube-subscription"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          /> */}
          {/* {(isOwner || isVendor) && (
            <Tab.Screen
              name="Profile"
              component={BusinessProfileViewScreen}
              options={{
                tabBarIcon: ({ focused }) => (
                  <Icon
                    name="menu"
                    size={28}
                    color={focused ? COLORS.primaryOrange : COLORS.gray500}
                  />
                ),
              }}
            />
          )} */}

          {/* {isUser && (
            <Tab.Screen
              name="Home8"
              component={PromotionNavigation}
              options={{
                tabBarIcon: ({ focused, color }) => (
                  <Icon
                    name="account-outline"
                    size={28}
                    color={focused ? COLORS.primaryOrange : COLORS.gray500}
                  />
                ),
              }}
            />
          )} */}

          {/* <Tab.Screen
            name="Home"
            component={HomeNavigation}
            options={({ route }) => ({
              tabBarStyle: {
                ...defaultTabBarStyle,
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
          /> */}

          {isAdmin && (
            <Tab.Screen
              name="Admin"
              component={AdminScreen}
              options={{
                tabBarStyle: defaultTabBarStyle,
              }}
            />
          )}

          <Tab.Screen
            name="Orders"
            component={OrdersTabWrapper}
            listeners={{
              tabPress: redirectToHomeThreeIfGuest,
            }}
            options={({ route }) => ({
              tabBarStyle: getTabBarStyle(route) ?? defaultTabBarStyle,
            })}
          />

          <Tab.Screen
            name="Library"
            component={LibraryNavigation}
            listeners={({ navigation: tabNav }) => ({
              tabPress: e => {
                if (!user?.id) {
                  redirectToHomeThreeIfGuest(e);
                  return;
                }
                e.preventDefault();
                tabNav.navigate('Library', { screen: 'LibraryScreen' });
              },
            })}
            options={({ route }) => ({
              tabBarStyle: getTabBarStyle(route) ?? defaultTabBarStyle,
            })}
          />
        </Tab.Navigator>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  libraryTabIcon: {
    width: 26,
    height: 26,
  },
});

export default BottomNaivgation;
