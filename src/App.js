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
import { Alert, AppState, BackHandler, View, StyleSheet, Linking, InteractionManager } from 'react-native';
import FaceUnlockCameraHost from './components/FaceUnlockCameraHost';
import BiometricMethodPickerHost from './components/BiometricMethodPickerHost';
// import Loading from './components/Loading';
import RootStack from './navigation/RootStack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './utils/helper';
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from './services/notificationSocket';
import { parseSharedContentUrl } from './utils/contentLinks';
import {
  ensureSessionOnStartup,
  setupSessionLifecycle,
} from './services/sessionService';
import { StripeProvider } from '@stripe/stripe-react-native';
import { getPaymentConfig } from './services/paymentService';

/** Mount camera host after first interactions so home TTI stays light. */
const DeferredFaceHost = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
    return () => handle?.cancel?.();
  }, []);
  if (!ready) return null;
  return (
    <>
      <FaceUnlockCameraHost />
      <BiometricMethodPickerHost />
    </>
  );
};

const AppContent = () => {
  const { user, onboardingDone } = useSelector(state => state.app);

  useEffect(() => {
    const cleanup = setupSessionLifecycle();
    return cleanup;
  }, []);

  useEffect(() => {
    if (user?.id && user?.token) {
      const handle = InteractionManager.runAfterInteractions(() => {
        ensureSessionOnStartup();
      });
      return () => handle?.cancel?.();
    }
    return undefined;
  }, [user?.id, user?.token]);

  useEffect(() => {
    if (!user?.id) {
      disconnectNotificationSocket();
      return undefined;
    }
    // Don't compete with home feed right as the app becomes interactive.
    const handle = InteractionManager.runAfterInteractions(() => {
      connectNotificationSocket(user.id);
    });
    return () => {
      handle?.cancel?.();
      disconnectNotificationSocket();
    };
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
        Alert.alert('Warning', 'Are you sure you want to close Eatwaze?', [
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

  useEffect(() => {
    const navigateFromUrl = url => {
      const parsed = parseSharedContentUrl(url);
      if (!parsed || !navigationRef.current?.isReady?.()) return;
      const { type, id } = parsed;
      if (type === 'video') {
        navigationRef.current.navigate('VideoDetailsScreen', { videoId: id });
        return;
      }
      if (type === 'post') {
        navigationRef.current.navigate('UserViewsScreen', {
          sharedPostId: id,
          focusPostsTab: true,
          deepLinkVisitSeq: Date.now(),
        });
        return;
      }
      navigationRef.current.navigate('Root', {
        screen: 'Shorts',
        params: {
          screen: 'ShortsVideoScreen',
          params: { initialShortId: id, shortId: id, deepLinkVisitSeq: Date.now() },
        },
      });
    };

    const openInitial = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          setTimeout(() => navigateFromUrl(initialUrl), 400);
        }
      } catch {}
    };
    openInitial();

    const sub = Linking.addEventListener('url', ({ url }) => navigateFromUrl(url));
    return () => sub?.remove?.();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      {_.isEmpty(user) && !onboardingDone ? <AuthStack /> : <RootStack />}
    </NavigationContainer>
  );
};

const App = () => {
  // null = unknown; only show offline UX when NetInfo says disconnected.
  const [connected, setConnected] = useState(null);
  const [stripePublishableKey, setStripePublishableKey] = useState('');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnected(state.isConnected);
    });
    NetInfo.fetch()
      .then(state => setConnected(state.isConnected))
      .catch(() => setConnected(true));
    return () => {
      unsubscribe();
    };
  }, []);

  const refreshStripeKey = React.useCallback(() => {
    getPaymentConfig()
      .then(data => {
        if (data?.publishableKey) {
          setStripePublishableKey(String(data.publishableKey));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      refreshStripeKey();
    });
    return () => handle?.cancel?.();
  }, [refreshStripeKey]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        InteractionManager.runAfterInteractions(() => {
          refreshStripeKey();
        });
      }
    });
    return () => sub.remove();
  }, [refreshStripeKey]);

  if (connected === false) {
    return (
      <View style={styles.offlineWrap}>
        <Text style={styles.offlineText}>No Internet Connection</Text>
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

  const appTree = (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <AppContent />
        <DeferredFaceHost />
        <Toast
          config={toastConfig}
          position="bottom"
          visibilityTime={2000}
        />
      </PersistGate>
    </Provider>
  );

  return (
    <GestureHandlerRootView style={styles.gestureView}>
      <SafeAreaProvider>
        {stripePublishableKey ? (
          <StripeProvider
            publishableKey={stripePublishableKey}
            merchantIdentifier="merchant.com.eatwaze.app"
            urlScheme="eatwaze"
          >
            {appTree}
          </StripeProvider>
        ) : (
          appTree
        )}
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
  offlineWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 24,
  },
  offlineText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
});

export default App;
