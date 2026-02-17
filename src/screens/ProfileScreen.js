import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  COMMON_STYLES,
} from '../constants/theme';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.app);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

                // Clear AsyncStorage data
                await AsyncStorage.clear();

                // Force navigation to Login screen
                // Reset navigation stack to prevent going back
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
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
        <TouchableOpacity>
          <Icon name="dots-vertical" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/150' }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editBadge}>
              <Icon name="pencil" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
        </View>

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
          <MenuItem iconName="play-circle-outline" title="Your Channel" />
          <MenuItem iconName="shield-check-outline" title="Turn on Incognito" />
          <MenuItem
            iconName="account-outline"
            title="Your Account"
            onPress={() => navigation.navigate('AccountScreen')}
          />

          <View style={styles.separator} />

          <MenuItem iconName="clock-outline" title="Time Watched" />
          <MenuItem
            iconName="theme-light-dark"
            title="Dark Mode"
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
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
            onPress={() => navigation.navigate('SecurityScreen')}
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
