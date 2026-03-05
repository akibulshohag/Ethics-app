import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeVersion from '../screens/HomeVersion';
import VideoDetailsScreen from '../screens/VideoDetailsScreen';
import ChannelDetailsScreen from '../screens/ChanneDetailsScreen';
import ShortsVideoScreen from '../screens/ShortsVideoScreen';
import TrendingScreen from '../screens/TrendingScreen';
import ForYouScreen from '../screens/ForYouScreen';
import LiveShortsScreen from '../screens/LiveShortsScreen';
import SearchScreen from '../screens/SearchScreen';
import CartUiScreen from '../screens/CartUiScreen';
import CartDetailsScreen from '../screens/CartDetailsScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import ChatScreen from '../screens/ChatScreen';

const HomeStack = createStackNavigator();

const SearchScreenWithNav = ({ navigation }) => (
  <SearchScreen onBack={() => navigation.goBack()} />
);

const HomeNavigation = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeScreen"
    >
      <HomeStack.Screen name="HomeScreen" component={HomeVersion} />
      <HomeStack.Screen name="SearchScreen" component={SearchScreenWithNav} />
      <HomeStack.Screen name="VideoDetailsScreen" component={VideoDetailsScreen} />
      <HomeStack.Screen
        name="ChannelDetailsScreen"
        component={ChannelDetailsScreen}
      />
      <HomeStack.Screen name="ShortsVideoScreen" component={ShortsVideoScreen} />
      <HomeStack.Screen name="TrendingScreen" component={TrendingScreen} />
      <HomeStack.Screen name="ForYouScreen" component={ForYouScreen} />
      <HomeStack.Screen name="LiveShortsScreen" component={LiveShortsScreen} />
      <HomeStack.Screen name="CartUiScreen" component={CartUiScreen} />
      <HomeStack.Screen name="CartDetailsScreen" component={CartDetailsScreen} />
      <HomeStack.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <HomeStack.Screen name="ChatScreen" component={ChatScreen} />
    </HomeStack.Navigator>
  );
};

export default HomeNavigation;
