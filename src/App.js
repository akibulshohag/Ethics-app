import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView, Text } from 'react-native-gesture-handler';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider, useSelector } from 'react-redux';
import { store, persistor } from './redux';
import _ from 'lodash';
import AuthStack from './navigation/AuthStack';
import NetInfo from '@react-native-community/netinfo';
import { Offline } from './components/Offline';
import Toast, { BaseToast } from 'react-native-toast-message';
import colors from './constants/colors';
import { Alert, BackHandler, View, StyleSheet } from 'react-native';
// import Loading from './components/Loading';
import RootStack from './navigation/RootStack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './utils/helper';
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from './services/notificationSocket';

const AppContent = () => {
  const { user, onboardingDone } = useSelector(state => state.app);

  useEffect(() => {
    if (user?.id) {
      connectNotificationSocket(user.id);
    } else {
      disconnectNotificationSocket();
    }
    return () => disconnectNotificationSocket();
  }, [user?.id]);
  const backAction = () => {
    if (!navigationRef.current || !navigationRef.current.isReady()) {
      return false;
    }

    const currentRouteName = navigationRef.current.getCurrentRoute()?.name;

    if (navigationRef.current.canGoBack()) {
      navigationRef.current.goBack();
      return true;
    } else {
      if (currentRouteName === 'HomeScreen') {
        Alert.alert('Warning', 'Are you sure to close Ethics App', [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          { text: 'Yes', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      } else {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'HomeScreen' }],
        });
        return true;
      }
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => {
      backHandler.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      {_.isEmpty(user) && !onboardingDone ? (
        <AuthStack />
      ) : (
        <RootStack />
      )}
    </NavigationContainer>
  );
};

const App = () => {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnected(state.isConnected);
    });
    return () => {
      unsubscribe();
    };
  }, [connected]);

  if (!connected) {
    // return <Offline />;
    return (
      <View>
        <Text>No Internet Connection</Text>
      </View>
    );
  }
  const toastConfig = {
    success: props => (
      <BaseToast
        {...props}
        style={styles.toastStyle}
        contentContainerStyle={styles.toastContainer}
        text1Style={styles.toastText}
      />
    ),
  };

  return (
    <GestureHandlerRootView style={styles.gestureView}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate
            // loading={
            //   <Loading
            //     customStyle={styles.loadingView}
            //     msg="App is loading, Please wait..."
            //   />
            // }
            persistor={persistor}
          >
            <AppContent />

            <Toast
              config={toastConfig}
              position="bottom"
              visibilityTime={2000}
            />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gestureView: {
    flex: 1,
  },
  toastStyle: {
    backgroundColor: '#12B76A',
    borderRadius: 8,
    height: 40,
  },
  toastContainer: {
    paddingHorizontal: 15,
  },
  toastText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
  },
  rootView: {
    flex: 1,
  },
  loadingView: {
    backgroundColor: colors.white,
  },
});

export default App;
