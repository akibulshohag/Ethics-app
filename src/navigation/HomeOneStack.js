import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from '../screens/LandingScreen';
import HomeOneScreen from '../screens/HomeOneScreen';
import ProductShortsVideo from '../screens/NewScreen/ProductShortsVideo';
import HomeThreeScreen from '../screens/HomeThreeScreen';
import HomeFourScreen from '../screens/HomeFourScreen';
import HomeFiveScreen from '../screens/HomeFiveScreen';
import HomeTwoScreen from '../screens/HomeTwoScreen';
import HomeSixScreen from '../screens/HomeSixScreen';
import HomeSevenScreen from '../screens/HomeSevenScreen';
import BusinessProfileViewScreen from '../screens/NewScreen/BusinessProfileViewScreen';
import FollowersListScreen from '../screens/NewScreen/FollowersListScreen';
import FollowingListScreen from '../screens/NewScreen/FollowingListScreen';
import PromotionScreen from '../screens/PromotionScreen';
import PromotionFullDetailScreen from '../screens/PromotionFullDetailScreen';
import AllPromotionsScreen from '../screens/AllPromotionsScreen';
import CartDetailsScreen from '../screens/CartDetailsScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import HomeShortsExploreScreen from '../screens/HomeShortsExploreScreen';
import OrderNowBrowseScreen from '../screens/OrderNowBrowseScreen';
import VideoDetailsScreen from '../screens/VideoDetailsScreen';

const HomeOneStack = createStackNavigator();

const HomeOneNavigation = () => {
  return (
    <HomeOneStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="LandingScreen"
    >
      <HomeOneStack.Screen name="LandingScreen" component={LandingScreen} />
      <HomeOneStack.Screen name="HomeOneScreen" component={HomeOneScreen} />
      <HomeOneStack.Screen
        name="ProductShortsVideo"
        component={ProductShortsVideo}
      />
      <HomeOneStack.Screen
        name="HomeThreeScreen"
        component={HomeThreeScreen}
      />
      <HomeOneStack.Screen
        name="HomeFourScreen"
        component={HomeFourScreen}
      />
      <HomeOneStack.Screen
        name="HomeFiveScreen"
        component={HomeFiveScreen}
      />
      <HomeOneStack.Screen
        name="HomeTwoScreen"
        component={HomeTwoScreen}
      />
      <HomeOneStack.Screen
        name="HomeSixScreen"
        component={HomeSixScreen}
      />
      <HomeOneStack.Screen
        name="HomeSevenScreen"
        component={HomeSevenScreen}
      />
      <HomeOneStack.Screen
        name="BusinessProfileViewScreen"
        component={BusinessProfileViewScreen}
      />
      <HomeOneStack.Screen
        name="FollowersListScreen"
        component={FollowersListScreen}
      />
      <HomeOneStack.Screen
        name="FollowingListScreen"
        component={FollowingListScreen}
      />
      <HomeOneStack.Screen
        name="PromotionScreen"
        component={PromotionScreen}
      />
      <HomeOneStack.Screen
        name="PromotionFullDetail"
        component={PromotionFullDetailScreen}
      />
      <HomeOneStack.Screen
        name="AllPromotions"
        component={AllPromotionsScreen}
      />
      <HomeOneStack.Screen
        name="CartDetailsScreen"
        component={CartDetailsScreen}
      />
      <HomeOneStack.Screen
        name="CheckoutScreen"
        component={CheckoutScreen}
      />
      <HomeOneStack.Screen
        name="HomeShortsExploreScreen"
        component={HomeShortsExploreScreen}
      />
      <HomeOneStack.Screen
        name="OrderNowBrowseScreen"
        component={OrderNowBrowseScreen}
      />
      <HomeOneStack.Screen
        name="VideoDetailsScreen"
        component={VideoDetailsScreen}
      />
    </HomeOneStack.Navigator>
  );
};

export default HomeOneNavigation;