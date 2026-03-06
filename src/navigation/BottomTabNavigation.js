import React from 'react';
import {
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
} from '@react-navigation/native';
import HomeNavigation from './HomeNavigation';
import LibraryNavigation from './LibraryStack';
import ShortsNavigation from './ShortsStack';
import HomeOneNavigation from './HomeOneStack';
import HomeTwoNavigation from './HomeTwoStack';
import HomeThreeNavigation from './HomeThreeStack';
import HomeFourNavigation from './HomeFourStack';
import HomeFiveNavigation from './HomeFiveStack';
import HomeSixNavigation from './HomeSixStack';
import HomeSevenNavigation from './HomeSevenStack';
import UProfileNavigation from './UProfileStack';
import VProfileNavigation from './VProfileStack';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import CreateVideoModalScreen from '../screens/CreateVideoModalScreen';
import AdminScreen from '../screens/AdminScreen';
import MessageListScreen from '../screens/MessageListScreen';
import LiveOrdersScreen from '../screens/LiveOrdersScreen';
import EarningsScreen from '../screens/EarningsScreen';
import BusinessProfileViewScreen from '../screens/NewScreen/BusinessProfileViewScreen';
import UserProfileCardScreen from '../screens/NewScreen/UserProfileCardScreen';
import { BottomTabLessScreens } from '../constants/BottomLessScreens';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants/theme';

const getTabBarStyle = route => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? '';
  return BottomTabLessScreens.includes(routeName) ? { display: 'none' } : {};
};

/** Orders tab: user role → own orders + status only; owner/admin → Live Orders with Accept/Reject */
function OrdersTabWrapper(props) {
  const user = useSelector(state => state.app?.user);
  const role = String(user?.role || '').toLowerCase();
  const isOwnerOrAdmin = ['owner', 'admin', 'superadmin', 'super_admin'].includes(role);
  if (isOwnerOrAdmin) return <LiveOrdersScreen {...props} />;
  return <OrderListScreen {...props} />;
}

const BottomNaivgation = () => {
  const tabHeight = Platform.OS === 'ios' ? 82 : 68;
  const user = useSelector(state => state.app?.user);
  const navigation = useNavigation();
  const showCreateTab = user?.role === 'owner' || user?.role === 'admin';
  const showVProfileTab = (user?.role || '').toLowerCase() === 'vendor';

  const requireLogin = (e, tabName) => {
    if (!user) {
      e.preventDefault();
      navigation.navigate('Login');
    }
  };

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

          <Tab.Screen
            name="UserProfileCard"
            component={UserProfileCardScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <Icon
                  name="account-circle-outline"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Home1"
            component={HomeOneNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="home"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Home2"
            component={HomeTwoNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="home"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Home3"
            component={HomeThreeNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="home"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Home4"
            component={HomeFourNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="home"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Home5"
            component={HomeFiveNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="home"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Home6"
            component={HomeSixNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="home"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Home7"
            component={HomeSevenNavigation}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="home"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

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
            name="MessageList"
            component={MessageListScreen}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="message-text"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="OrdersList"
            component={LiveOrdersScreen}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="clipboard-list-outline"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
            name="Earnings"
            component={EarningsScreen}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <Icon
                  name="currency-usd"
                  size={28}
                  color={focused ? COLORS.primaryOrange : COLORS.gray500}
                />
              ),
            }}
          />

          <Tab.Screen
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
          />

          {showVProfileTab && (
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
          )}

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
          />

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

          <Tab.Screen
            name="Library"
            component={LibraryNavigation}
            listeners={{
              tabPress: e => requireLogin(e, 'Library'),
            }}
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
