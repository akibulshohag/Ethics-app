import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import { deleteMyAccount } from '../services/userSafetyService';
import { asyncStorageKeysToRemoveOnLogout } from '../utils/logoutStorage';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  COMMON_STYLES,
} from '../constants/theme';
import { config } from '../../config';
import { getSocialIcon } from '../constants/socialLinks';
import { safeImageUri } from '../utils/helper';

const DARK_MODE_KEY = '@ethics_dark_mode';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.app);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_KEY).then(val => {
      setIsDarkMode(val === 'true');
    });
  }, []);

  const setDarkMode = value => {
    setIsDarkMode(value);
    AsyncStorage.setItem(DARK_MODE_KEY, String(value)).catch(() => {});
  };

  const navigateToSecurity = () => {
    navigation.navigate('SecurityScreen');
  };

  const resetToLogin = async () => {
    dispatch(appSetUser(null));
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = asyncStorageKeysToRemoveOnLogout(allKeys);
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Root',
          state: {
            index: 0,
            routes: [
              {
                name: 'Home1',
                state: {
                  index: 1,
                  routes: [
                    { name: 'HomeOneScreen' },
                    { name: 'HomeSevenScreen' },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your EatWaze account and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm deletion',
              'Are you sure you want to permanently delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      await deleteMyAccount();
                      await resetToLogin();
                    } catch (error) {
                      Alert.alert(
                        'Could not delete account',
                        error?.message ||
                          'Please try again or contact support.',
                      );
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    setTimeout(() => {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                // Clear user data from Redux
                dispatch(appSetUser(null));

                const allKeys = await AsyncStorage.getAllKeys();
                const toRemove = asyncStorageKeysToRemoveOnLogout(allKeys);
                if (toRemove.length > 0) {
                  await AsyncStorage.multiRemove(toRemove);
                }

                // Reset to Home1 tab with HomeSevenScreen (no back stack)
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Root',
                      state: {
                        index: 0,
                        routes: [
                          {
                            name: 'Home1',
                            state: {
                              index: 1,
                              routes: [
                                { name: 'HomeOneScreen' },
                                { name: 'HomeSevenScreen' },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                });
              } catch (error) {
                console.error('Logout error:', error);
                setTimeout(() => {
                  Alert.alert('Error', 'Failed to logout. Please try again.');
                }, 100);
              }
            },
          },
        ],
        { cancelable: true },
      );
    }, 100);
  };

  const MenuItem = ({
    iconName,
    title,
    rightElement,
    color = COLORS.textPrimary,
    onPress,
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Icon name={iconName} size={22} color={color} />
        <Text style={[styles.menuText, { color }]}>{title}</Text>
      </View>
      {rightElement ? (
        rightElement
      ) : (
        <Icon name="chevron-right" size={20} color={COLORS.gray400} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SettingsScreen')}>
          <Icon name="dots-vertical" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: safeImageUri(
                  user?.photos?.[0] ??
                    (Array.isArray(user?.photos) ? user.photos[0] : null),
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.name || user?.email || 'U',
                  )}&background=FF8C00&color=fff`,
                ),
              }}
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => navigation.navigate('AccountScreen')}
            >
              <Icon name="pencil" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>
            {user?.name || user?.nickname || 'Guest User'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
          {Array.isArray(user?.socialLinks) &&
            user.socialLinks.filter(l => (l?.url || '').trim()).length > 0 && (
              <View style={styles.socialLinksRow}>
                {user.socialLinks
                  .filter(l => (l?.url || '').trim())
                  .map((link, index) => (
                    <TouchableOpacity
                      key={`${link.type}-${index}`}
                      style={styles.socialLinkIconBtn}
                      onPress={() => {
                        const url = (link.url || '').trim();
                        if (url)
                          Linking.openURL(
                            url.startsWith('http') ? url : `https://${url}`,
                          );
                      }}
                    >
                      <Icon
                        name={getSocialIcon(link.type)}
                        size={26}
                        color={COLORS.primaryOrange}
                      />
                    </TouchableOpacity>
                  ))}
              </View>
            )}
        </View>

        {/* Profile location map */}
        {user?.latitude != null && user?.longitude != null && (
          <View style={styles.locationSection}>
            <Text style={styles.locationSectionTitle}>Your location</Text>
            {user?.address ? (
              <Text style={styles.locationAddress}>{user.address}</Text>
            ) : null}
            <Image
              source={{
                uri: `https://maps.googleapis.com/maps/api/staticmap?center=${
                  user.latitude
                },${user.longitude}&zoom=14&size=${
                  Dimensions.get('window').width - 32
                }x120&markers=${user.latitude},${user.longitude}&key=${
                  config.googleMapsApiKey
                }`,
              }}
              style={styles.locationMapImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Premium Banner */}
        <TouchableOpacity
          style={styles.premiumBanner}
          onPress={() => navigation.navigate('SubscriptionScreen')}
        >
          <View style={styles.premiumLeft}>
            <Icon name="crown-outline" size={40} color={COLORS.white} />
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>Join Premium!</Text>
              <Text style={styles.premiumSubtitle}>
                Manage your subscription and upload limits
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.menuList}>
          <MenuItem
            iconName="package-variant"
            title="Subscription & Plans"
            onPress={() => navigation.navigate('SubscriptionScreen')}
          />
          <MenuItem
            iconName="play-circle-outline"
            title="Your Channel"
            onPress={() =>
              user?.id
                ? navigation.navigate('ChannelDetailsScreen', {
                    userId: user.id,
                  })
                : navigation.navigate('AccountScreen')
            }
          />
          <MenuItem
            iconName="shield-check-outline"
            title="Turn on Incognito"
            onPress={() => navigation.navigate('IncognitoScreen')}
          />
          <MenuItem
            iconName="account-outline"
            title="Your Account"
            onPress={() => navigation.navigate('AccountScreen')}
          />
          {String(user?.role || '').toLowerCase() === 'owner' && (
            <MenuItem
              iconName="silverware-fork-knife"
              title="Manage menu"
              color={COLORS.primaryOrange}
              onPress={() => navigation.navigate('MenuManageScreen')}
            />
          )}
          <MenuItem
            iconName="cart-check"
            title={
              String(user?.role || '').toLowerCase() === 'owner'
                ? 'Restaurant orders'
                : 'My orders'
            }
            onPress={() => navigation.navigate('OrderListScreen')}
          />

          <View style={styles.separator} />

          <MenuItem
            iconName="clock-outline"
            title="Time Watched"
            onPress={() => navigation.navigate('TimeWatchedScreen')}
          />
          <MenuItem
            iconName="theme-light-dark"
            title="Dark Mode"
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={setDarkMode}
                trackColor={{
                  false: COLORS.gray200,
                  true: COLORS.primaryOrange,
                }}
                thumbColor={COLORS.white}
              />
            }
          />
          <MenuItem
            iconName="shield-lock-outline"
            title="Security"
            onPress={navigateToSecurity}
          />
          <MenuItem
            iconName="cog-outline"
            title="Settings"
            onPress={() => navigation.navigate('SettingsScreen')}
          />

          <MenuItem
            iconName="help-circle-outline"
            title="Help Center"
            onPress={() => navigation.navigate('HelpCenterScreen')}
          />

          <View style={{ marginTop: SPACING.lg }}>
            <MenuItem
              iconName="account-remove-outline"
              title="Delete account"
              color={COLORS.error}
              onPress={deletingAccount ? undefined : handleDeleteAccount}
            />
            <MenuItem
              iconName="logout"
              title="Logout"
              color={COLORS.error}
              onPress={handleLogout}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
    marginLeft: SPACING.xl,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryOrange,
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.primaryOrange,
    padding: 6,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  userEmail: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  socialLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  socialLinkIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF4EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.lg,
  },
  locationSectionTitle: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  locationMapImage: {
    width: Dimensions.get('window').width - 32 - SPACING.xl * 2,
    height: 120,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray200,
  },
  premiumBanner: {
    backgroundColor: COLORS.primaryOrange,
    marginHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumTextContainer: {
    marginLeft: SPACING.lg,
    flex: 1,
  },
  premiumTitle: {
    color: COLORS.white,
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
  },
  premiumSubtitle: {
    color: COLORS.white,
    fontSize: FONTS.xs,
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
  menuList: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: FONTS.base,
    fontWeight: FONTS.medium,
    marginLeft: SPACING.lg,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: SPACING.md,
  },
});

export default ProfileScreen;
