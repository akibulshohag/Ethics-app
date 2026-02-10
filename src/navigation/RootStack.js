import { createStackNavigator } from '@react-navigation/stack';
import BottomNaivgation from './BottomTabNavigation';
import AccountScreen from '../screens/AccountScreen';
import CreatePinScreen from '../screens/CreatePinScreen';
import SetFingerprint from '../screens/SetFingerprint';
import ChooseInterests from '../screens/ChooseInterests';
import SecurityScreen from '../screens/SecurityScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Root = createStackNavigator();

const RootStack = () => {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="Root" component={BottomNaivgation} />
      <Root.Screen name="Account" component={AccountScreen} />
      <Root.Screen name="SecurityScreen" component={SecurityScreen} />
      <Root.Screen
        name="ChangePasswordScreen"
        component={ChangePasswordScreen}
      />
      <Root.Screen name="CreatePin" component={CreatePinScreen} />
      <Root.Screen name="SetFingerprint" component={SetFingerprint} />
      <Root.Screen name="ChooseInterests" component={ChooseInterests} />
    </Root.Navigator>
  );
};

export default RootStack;
