import { Alert } from 'react-native';

export function isProfileComplete(user) {
  if (!user?.id) return false;
  if (user.profileComplete === true) return true;
  const name = String(user?.name || '').trim();
  const phone = String(user?.phone || '').trim();
  return name.length >= 2 && phone.length >= 8;
}

export function ensureProfileForAction(navigation, user, actionLabel = 'continue') {
  if (isProfileComplete(user)) {
    return true;
  }
  Alert.alert(
    'Complete your profile',
    `Please add your name and phone number before you ${actionLabel}.`,
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Edit profile',
        onPress: () => {
          try {
            navigation.navigate('Account', { fromProfileGate: true });
          } catch {
            navigation.navigate('Root', { screen: 'Account' });
          }
        },
      },
    ],
  );
  return false;
}
