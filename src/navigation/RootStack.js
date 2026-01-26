import {createStackNavigator} from '@react-navigation/stack';
import BottomNaivgation from './BottomTabNavigation';

const Root = createStackNavigator();

const RootStack = () => {
  return (
    <Root.Navigator screenOptions={{headerShown: false}}>
      <Root.Screen name="Root" component={BottomNaivgation} />
    </Root.Navigator>
  );
};

export default RootStack;