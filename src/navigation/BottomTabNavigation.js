import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  InteractionManager,
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
import CreateVideoModalScreen from '../screens/CreateVideoModalScreen';
import AdminScreen from '../screens/AdminScreen';
import LiveOrdersScreen from '../screens/LiveOrdersScreen';
import OrderListScreen from '../screens/OrderListScreen';
import RiderDashboardScreen from '../screens/RiderDashboardScreen';
import { getRestaurantOrderCounts } from '../services/orderService';
import BusinessProfileViewScreen from '../screens/NewScreen/BusinessProfileViewScreen';
import UserViewsScreen from '../screens/NewScreen/UserViewsScreen';
import { BottomTabLessScreens } from '../constants/BottomLessScreens';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/theme';

const libraryTabIcon = require('../assets/Group.png');

/**
 * Hide tab bar only when the focused nested screen is known to be full-screen.
 * @param {object} route
 * @param {string} [fallbackWhenUnset] Home1 cold-start: LandingScreen vs HomeOneScreen
 */
const getTabBarStyle = (route, fallbackWhenUnset) => {
  if (route?.name === 'Shorts') return { display: 'none' };
  let routeName = getFocusedRouteNameFromRoute(route);
  // Nested state can exist before getFocusedRouteNameFromRoute resolves.
  if (!routeName && route?.state?.routes?.length) {
    const idx = route.state.index ?? 0;
    routeName = route.state.routes[idx]?.name;
  }
  // Cold start: nested focus is often undefined for a tick — use stack initial.
  if (!routeName && fallbackWhenUnset) {
    routeName = fallbackWhenUnset;
  }
  if (!routeName) return undefined;
  return BottomTabLessScreens.includes(routeName)
    ? { display: 'none' }
    : undefined;
};

/** Orders tab: rider → dashboard; owner/admin → live orders; user → own orders */
function OrdersTabWrapper(props) {
  const user = useSelector(state => state.app?.user);
  const role = String(user?.role || '').toLowerCase();
  if (role === 'rider') return <RiderDashboardScreen {...props} />;
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
  const browseLocation = useSelector(state => state.app?.browseLocation);
  const browseLat =
    browseLocation?.lat != null ? Number(browseLocation.lat) : null;
  const browseLng =
    browseLocation?.lng != null ? Number(browseLocation.lng) : null;
  const hasSavedBrowse =
    Number.isFinite(browseLat) && Number.isFinite(browseLng);
  /** Match HomeOneStack initial route so cold-start Landing hides tabs. */
  const home1UnsetFallback = hasSavedBrowse
    ? 'HomeOneScreen'
    : 'LandingScreen';
  const navigation = useNavigation(); // Root stack navigation
  const tabState = useNavigationState(state => state); // Bottom tab state
  const currentTabName =
    tabState?.routes?.[tabState?.index || 0]?.name ?? 'Home1';
  const isShortsFullScreen = currentTabName === 'Shorts';
  const role = (user?.role || '').toLowerCase();
  const isOwner = role === 'owner';
  const isVendor = role === 'vendor';
  const isUser = role === 'user';
  const isRider = role === 'rider';
  const [ordersBadge, setOrdersBadge] = useState(0);

  useEffect(() => {
    if (!user?.token) {
      setOrdersBadge(0);
      return;
    }
    let cancelled = false;
    let timer = null;
    const loadCounts = () => {
      getRestaurantOrderCounts(user.token)
        .then(counts => {
          if (!cancelled) setOrdersBadge(Number(counts?.pending) || 0);
        })
        .catch(() => {
          if (!cancelled) setOrdersBadge(0);
        });
    };
    // Don't compete with home first paint.
    const handle = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      loadCounts();
      timer = setInterval(loadCounts, 90000);
    });
    return () => {
      cancelled = true;
      handle?.cancel?.();
      if (timer) clearInterval(timer);
    };
  }, [user?.token, user?.role]);
  const isAdmin =
    role === 'admin' ||
    role === 'superadmin' ||
    role === 'super_admin' ||
    role === 'super-admin';
  const showVProfileTab = role === 'vendor';

  const Tab = createBottomTabNavigator();

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
      return { tab: 'Home1', screen: 'HomeOneScreen' };
    }
    const currentRoute = state.routes[state.index || 0];
    const tabName = currentRoute?.name;
    if (!tabName || tabName === 'Create')
      return { tab: 'Home1', screen: 'HomeOneScreen' };
    const screenName = getFocusedRouteNameFromRoute(currentRoute);
    const defaults = { Home1: 'HomeOneScreen', Library: 'LibraryScreen' };
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
        backgroundColor: isShortsFullScreen ? '#000' : COLORS.white,
      }}
      edges={isShortsFullScreen ? [] : ['bottom']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.white }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
      >
        <Tab.Navigator
          initialRouteName="Home1"
          sceneContainerStyle={{ backgroundColor: COLORS.white }}
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
            name="Home1"
            component={HomeOneNavigation}
            listeners={({ navigation: tabNav, route }) => ({
              tabPress: e => {
                const routeName =
                  getFocusedRouteNameFromRoute(route) ?? 'HomeOneScreen';
                if (routeName === 'LandingScreen' || routeName === 'HomeOneScreen')
                  return;
                if (
                  routeName === 'HomeOneScreen' ||
                  routeName === 'HomeOneCuisineScreen'
                ) {
                  e.preventDefault();
                  tabNav.navigate('Home1', {
                    screen: routeName,
                    params: { homeTabReset: Date.now() },
                    merge: true,
                  });
                  return;
                }
                e.preventDefault();
                tabNav.navigate('Home1', { screen: 'HomeOneScreen' });
              },
            })}
            options={({ route }) => {
              const hidden = getTabBarStyle(route, home1UnsetFallback);
              const defaultVisibleStyle = {
                backgroundColor: COLORS.white,
                borderTopWidth: 1,
                borderTopColor: COLORS.gray200,
                height: tabHeight,
                paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                paddingTop: 8,
              };
              return {
                tabBarIcon: ({ focused, color }) => (
                  <Icon
                    name="home"
                    size={28}
                    color={focused ? COLORS.primaryOrange : COLORS.gray500}
                  />
                ),
                tabBarStyle: hidden ?? defaultVisibleStyle,
              };
            }}
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
            options={({ route }) => {
              const hidden = getTabBarStyle(route);
              const defaultVisibleStyle = {
                backgroundColor: COLORS.white,
                borderTopWidth: 1,
                borderTopColor: COLORS.gray200,
                height: tabHeight,
                paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                paddingTop: 8,
              };
              return {
                tabBarIcon: ({ focused, color }) => (
                  <Icon
                    name="play-box-multiple-outline"
                    size={28}
                    color={focused ? COLORS.primaryOrange : COLORS.gray500}
                  />
                ),
                tabBarStyle: hidden ?? defaultVisibleStyle,
              };
            }}
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
              tabBarIcon: () => (
                <View style={styles.fabContainer}>
                  <Icon name="plus" size={30} color={COLORS.white} />
                </View>
              ),
            }}
          />

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
          /> */}

          {isAdmin && (
            <Tab.Screen
              name="Admin"
              component={AdminScreen}
              options={{
                tabBarIcon: ({ focused, color }) => (
                  <Icon
                    name="cog"
                    size={28}
                    color={focused ? COLORS.primaryOrange : COLORS.gray500}
                  />
                ),
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
              tabBarBadge: ordersBadge > 0 ? ordersBadge : undefined,
              tabBarStyle: {
                backgroundColor: COLORS.white,
                borderTopWidth: 1,
                borderTopColor: COLORS.gray200,
                height: tabHeight,
                paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                paddingTop: 8,
                ...getTabBarStyle(route),
              },
              tabBarIcon: ({ focused }) => (
                <Icon
                  name="cart-outline"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
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
              tabBarStyle: {
                backgroundColor: COLORS.white,
                borderTopWidth: 1,
                borderTopColor: COLORS.gray200,
                height: tabHeight,
                paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                paddingTop: 8,
                ...getTabBarStyle(route),
              },
              tabBarIcon: ({ focused }) => (
                <Icon
                  name="file-document-outline"
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
  libraryTabIcon: {
    width: 26,
    height: 26,
  },
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
