import { Button, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = () => {
  const navigation = useNavigation();
  return (
    <SafeAreaView>
      <Text>HomeScreen</Text>
      <Button
        title="Go to Video Details"
        onPress={() => navigation.navigate('VideoDetailsScreen')}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({});