import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SHADOWS } from '../constants/theme';

const H_MARGIN = 18;
const BAR_RADIUS = 30;
const BAR_HEIGHT = Platform.OS === 'ios' ? 68 : 62;
const FAB_SIZE = 56;
const NOTCH_WIDTH = FAB_SIZE + 12;

const FAB_GRADIENT = ['#FFAE7A', '#FF6A3D', '#FF5C7A'];
const TAB_INACTIVE = '#A8B0BD';
const TAB_ACTIVE = COLORS.primaryOrange;

const TAB_META = {
  Home1: {
    label: 'Home',
    active: 'home',
    inactive: 'home-outline',
  },
  Shorts: {
    label: 'Shorts',
    active: 'play-circle',
    inactive: 'play-circle-outline',
  },
  Orders: {
    label: 'Orders',
    active: 'shopping',
    inactive: 'shopping-outline',
  },
  Library: {
    label: 'Profile',
    active: 'account',
    inactive: 'account-outline',
  },
  Admin: {
    label: 'Admin',
    active: 'shield-crown',
    inactive: 'shield-crown-outline',
  },
};

const TabButton = ({ route, isFocused, onPress, onLongPress, options }) => {
  const meta = TAB_META[route.name];
  const scale = useRef(new Animated.Value(1)).current;
  const indicatorOpacity = useRef(
    new Animated.Value(isFocused ? 1 : 0),
  ).current;
  const indicatorScale = useRef(
    new Animated.Value(isFocused ? 1 : 0.4),
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(indicatorOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(indicatorScale, {
        toValue: isFocused ? 1 : 0.4,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [indicatorOpacity, indicatorScale, isFocused]);

  if (!meta) {
    return null;
  }

  const color = isFocused ? TAB_ACTIVE : TAB_INACTIVE;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        Animated.spring(scale, {
          toValue: 0.88,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }}
      style={styles.tabPressable}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Icon
          name={isFocused ? meta.active : meta.inactive}
          size={24}
          color={color}
        />
        <Text
          style={[
            styles.tabLabel,
            { color },
            isFocused && styles.tabLabelActive,
          ]}
          numberOfLines={1}
        >
          {meta.label}
        </Text>
        <Animated.View
          style={[
            styles.activeDash,
            {
              opacity: indicatorOpacity,
              transform: [{ scaleX: indicatorScale }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const FluidTabBar = ({ state, descriptors, navigation, insets }) => {
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options ?? {};
  const tabBarStyle = focusedOptions.tabBarStyle;

  if (tabBarStyle?.display === 'none') {
    return null;
  }

  const createIndex = state.routes.findIndex(route => route.name === 'Create');
  const leftRoutes =
    createIndex >= 0 ? state.routes.slice(0, createIndex) : state.routes;
  const rightRoutes =
    createIndex >= 0 ? state.routes.slice(createIndex + 1) : [];

  const createRoute = createIndex >= 0 ? state.routes[createIndex] : null;
  const isCreateFocused = createRoute != null && state.index === createIndex;

  const fabScale = useRef(new Animated.Value(1)).current;

  const renderTab = route => {
    const routeIndex = state.routes.findIndex(item => item.key === route.key);
    const isFocused = state.index === routeIndex;
    const { options } = descriptors[route.key];

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    return (
      <TabButton
        key={route.key}
        route={route}
        isFocused={isFocused}
        onPress={onPress}
        onLongPress={onLongPress}
        options={options}
      />
    );
  };

  const onCreatePress = () => {
    if (!createRoute) {
      return;
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: createRoute.key,
      canPreventDefault: true,
    });

    if (!isCreateFocused && !event.defaultPrevented) {
      navigation.navigate(createRoute.name, createRoute.params);
    }
  };

  const onCreateLongPress = () => {
    if (!createRoute) {
      return;
    }

    navigation.emit({
      type: 'tabLongPress',
      target: createRoute.key,
    });
  };

  const bottomGap = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 6);

  return (
    <View
      style={[styles.root, { paddingBottom: bottomGap }]}
      pointerEvents="box-none"
    >
      <View style={styles.floatingShell}>
        <View style={styles.barCard}>
          <View style={styles.tabsRow}>
            <View style={styles.sideGroup}>{leftRoutes.map(renderTab)}</View>
            <View style={styles.centerGap} />
            <View style={styles.sideGroup}>{rightRoutes.map(renderTab)}</View>
          </View>
        </View>
      </View>

      {createRoute ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={isCreateFocused ? { selected: true } : {}}
          onPress={onCreatePress}
          onLongPress={onCreateLongPress}
          onPressIn={() => {
            Animated.spring(fabScale, {
              toValue: 0.9,
              friction: 5,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(fabScale, {
              toValue: 1,
              friction: 5,
              useNativeDriver: true,
            }).start();
          }}
          style={styles.fabPressable}
        >
          <Animated.View
            style={[styles.fabShadowWrap, { transform: [{ scale: fabScale }] }]}
          >
            <LinearGradient
              colors={FAB_GRADIENT}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.fabGradient}
            >
              <Icon name="plus" size={30} color={COLORS.white} />
            </LinearGradient>
          </Animated.View>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: H_MARGIN,
  },
  floatingShell: {
    ...SHADOWS.large,
    borderRadius: BAR_RADIUS,
    backgroundColor: COLORS.white,
    overflow: 'visible',
  },
  barCard: {
    backgroundColor: COLORS.white,
    borderRadius: BAR_RADIUS,
    minHeight: BAR_HEIGHT,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(226, 229, 234, 0.9)',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: BAR_HEIGHT,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  centerGap: {
    width: NOTCH_WIDTH,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    paddingVertical: 4,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  activeDash: {
    marginTop: 5,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: TAB_ACTIVE,
  },
  fabPressable: {
    position: 'absolute',
    alignSelf: 'center',
    top: -22,
    zIndex: 30,
    elevation: 30,
  },
  fabShadowWrap: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    ...SHADOWS.orange,
  },
  fabGradient: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FluidTabBar;
