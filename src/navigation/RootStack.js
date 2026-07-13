import { createStackNavigator } from '@react-navigation/stack';
import MainRoot from './MainRoot';
import AccountScreen from '../screens/AccountScreen';
import CreatePinScreen from '../screens/CreatePinScreen';
import SetFingerprint from '../screens/SetFingerprint';
import ChooseInterests from '../screens/ChooseInterests';
import SecurityScreen from '../screens/SecurityScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import Login from '../screens/LoginScreen';
import SignUp from '../screens/SignUpScreen';
import ForgotPassword from '../screens/ForgotPassword';
import OtpVerification from '../screens/OtpVerification';
import CreateNewPassword from '../screens/CreateNewPassword';
import MenuManageScreen from '../screens/MenuManageScreen';
import ChatScreen from '../screens/ChatScreen';
import DetailedChatScreen from '../screens/DetailedChatScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import RiderDetailScreen from '../screens/RiderDetailScreen';
import LiveOrdersScreen from '../screens/LiveOrdersScreen';
import EarningsScreen from '../screens/EarningsScreen';
import MessageListScreen from '../screens/MessageListScreen';
import UserViewsScreen from '../screens/NewScreen/UserViewsScreen';
import ShortsVideoScreen from '../screens/ShortsVideoScreen';
import ChannelReviewsScreen from '../screens/NewScreen/ChannelReviewsScreen';
import VideoDetailsScreen from '../screens/VideoDetailsScreen';
import CustomPlaylistScreen from '../screens/CustomPlaylistScreen';
import CartDetailsScreen from '../screens/CartDetailsScreen';
import FeaturedVideoUploadScreen from '../screens/FeaturedVideoUploadScreen';
import PostCreateNew from '../screens/reelsNewScreen/PostCreateNew';
import PostEditNew from '../screens/reelsNewScreen/PostEditNew';
import PostCaptionNew from '../screens/reelsNewScreen/PostCaptionNew';
import PostPreviewNew from '../screens/reelsNewScreen/PostPreviewNew';
import PostScheduleNew from '../screens/reelsNewScreen/PostScheduleNew';
import PrinterSettingsScreen from '../screens/PrinterSettingsScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';

const Root = createStackNavigator();

const RootStack = () => {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="Root" component={MainRoot} />
      <Root.Screen name="Login" component={Login} />
      <Root.Screen name="SignUp" component={SignUp} />
      <Root.Screen name="ForgotPassword" component={ForgotPassword} />
      <Root.Screen name="OtpVerification" component={OtpVerification} />
      <Root.Screen name="CreateNewPassword" component={CreateNewPassword} />
      <Root.Screen name="Account" component={AccountScreen} />
      <Root.Screen name="SecurityScreen" component={SecurityScreen} />
      <Root.Screen
        name="ChangePasswordScreen"
        component={ChangePasswordScreen}
      />
      <Root.Screen name="CreatePin" component={CreatePinScreen} />
      <Root.Screen name="SetFingerprint" component={SetFingerprint} />
      <Root.Screen name="ChooseInterests" component={ChooseInterests} />
      <Root.Screen name="PrinterSettingsScreen" component={PrinterSettingsScreen} />
      <Root.Screen name="PhoneAuthScreen" component={PhoneAuthScreen} />
      <Root.Screen name="MenuManageScreen" component={MenuManageScreen} />
      <Root.Screen name="ChatScreen" component={ChatScreen} />
      <Root.Screen name="DetailedChatScreen" component={DetailedChatScreen} />
      <Root.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} />
      <Root.Screen name="RiderDetailScreen" component={RiderDetailScreen} />
      <Root.Screen name="CartDetailsScreen" component={CartDetailsScreen} />
      <Root.Screen name="OrdersList" component={LiveOrdersScreen} />
      <Root.Screen name="Earnings" component={EarningsScreen} />
      <Root.Screen name="MessageList" component={MessageListScreen} />
      <Root.Screen name="UserViewsScreen" component={UserViewsScreen} />
      <Root.Screen name="ShortsVideoScreen" component={ShortsVideoScreen} />
      <Root.Screen
        name="ChannelReviewsScreen"
        component={ChannelReviewsScreen}
      />
      <Root.Screen name="VideoDetailsScreen" component={VideoDetailsScreen} />
      <Root.Screen
        name="CustomPlaylistScreen"
        component={CustomPlaylistScreen}
        getId={({ params }) =>
          params?.playlistId != null
            ? String(params.playlistId)
            : 'custom-pl-root-none'
        }
      />
      <Root.Screen
        name="FeaturedVideoUpload"
        component={FeaturedVideoUploadScreen}
      />
      <Root.Screen name="PostCreateNew" component={PostCreateNew} />
      <Root.Screen name="PostEditNew" component={PostEditNew} />
      <Root.Screen name="PostCaptionNew" component={PostCaptionNew} />
      <Root.Screen name="PostPreviewNew" component={PostPreviewNew} />
      <Root.Screen name="PostScheduleNew" component={PostScheduleNew} />
    </Root.Navigator>
  );
};

export default RootStack;
