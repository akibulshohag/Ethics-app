import { createStackNavigator } from '@react-navigation/stack';
import BottomNaivgation from './BottomTabNavigation';
import AccountScreen from '../screens/AccountScreen';
import CreatePinScreen from '../screens/CreatePinScreen';
import SetFingerprint from '../screens/SetFingerprint';
import ChooseInterests from '../screens/ChooseInterests';
import SecurityScreen from '../screens/SecurityScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import Login from '../screens/LoginScreen';
import SignUp from '../screens/SignUpScreen';
import MenuManageScreen from '../screens/MenuManageScreen';
import ChatScreen from '../screens/ChatScreen';
import DetailedChatScreen from '../screens/DetailedChatScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';

const Root = createStackNavigator();

const RootStack = () => {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="Root" component={BottomNaivgation} />
      <Root.Screen name="Login" component={Login} />
      <Root.Screen name="SignUp" component={SignUp} />
      <Root.Screen name="Account" component={AccountScreen} />
      <Root.Screen name="SecurityScreen" component={SecurityScreen} />
      <Root.Screen
        name="ChangePasswordScreen"
        component={ChangePasswordScreen}
      />
      <Root.Screen name="CreatePin" component={CreatePinScreen} />
      <Root.Screen name="SetFingerprint" component={SetFingerprint} />
      <Root.Screen name="ChooseInterests" component={ChooseInterests} />
      <Root.Screen name="MenuManageScreen" component={MenuManageScreen} />
      <Root.Screen name="ChatScreen" component={ChatScreen} />
      <Root.Screen name="DetailedChatScreen" component={DetailedChatScreen} />
      <Root.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} />
    </Root.Navigator>
  );
};

export default RootStack;
