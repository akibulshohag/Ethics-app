import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const HomeSixScreen = ({ onBack, onLoginPress }) => {
  const [userType, setUserType] = useState('Diner');

  const RadioButton = ({ label, value }) => (
    <TouchableOpacity 
      style={styles.radioButton} 
      onPress={() => setUserType(value)}
    >
      <Icon 
        name={userType === value ? "radiobox-marked" : "radiobox-blank"} 
        size={24} 
        color="#F5A623" 
      />
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }} 
      style={styles.backgroundImage}
      blurRadius={1}
    >
      <StatusBar barStyle="light-content" transparent backgroundColor="transparent" />
      <SafeAreaView style={styles.overlay}>
        
        {/* Header Navigation */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Icon name="chevron-left" size={18} color="#FFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Icon name="dots-vertical" size={26} color="#FFF" />
        </View>

        <View style={styles.centerContainer}>
          {/* Registration Card */}
          <View style={styles.registerCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.headerTitle}>Create Your Account</Text>
            </View>

            <View style={styles.cardBody}>
              {/* User Type Selection */}
              <View style={styles.radioGroup}>
                <View style={styles.radioRow}>
                  <RadioButton label="Diner" value="Diner" />
                  <RadioButton label="Business" value="Business" />
                </View>
                <View style={styles.radioRowCenter}>
                  <RadioButton label="vendor" value="vendor" />
                </View>
              </View>

              {/* Input Fields */}
              <View style={styles.inputWrapper}>
                <Icon name="email-outline" size={20} color="#FFF" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Placeholder" 
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Icon name="lock-outline" size={20} color="#FFF" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Password" 
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                  style={styles.input}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Icon name="lock-outline" size={20} color="#FFF" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Password" 
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                  style={styles.input}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.btnText}>Sign Up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={onLoginPress}>
                  <Text style={styles.btnText}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Social Section */}
          <View style={styles.socialContainer}>
            <Text style={styles.socialTitle}>Sign in with</Text>
            <View style={styles.socialPill}>
              <TouchableOpacity style={styles.socialIcon}>
                <Icon name="facebook" size={32} color="#1877F2" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIcon}>
                <Icon name="google" size={32} color="#EA4335" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: width, height: height },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  navHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    alignItems: 'center' 
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 6 
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25 },
  registerCard: { 
    width: '100%', 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    overflow: 'hidden', 
    elevation: 8 
  },
  cardHeader: { backgroundColor: '#F5A623', paddingVertical: 18, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  cardBody: { padding: 20 },
  radioGroup: { marginBottom: 20 },
  radioRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  radioRowCenter: { alignItems: 'center' },
  radioButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#EEE', 
    borderRadius: 20, 
    paddingHorizontal: 12, 
    paddingVertical: 6 
  },
  radioLabel: { marginLeft: 8, fontSize: 16, color: '#333' },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F7C16F', 
    borderRadius: 8, 
    height: 50, 
    paddingHorizontal: 15, 
    marginBottom: 15 
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFF', fontSize: 15 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  actionBtn: { 
    backgroundColor: '#F5A623', 
    width: '46%', 
    height: 45, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  socialContainer: { alignItems: 'center', marginTop: 30 },
  socialTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  socialPill: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 20, 
    paddingVertical: 4, 
    borderRadius: 25 
  },
  socialIcon: { marginHorizontal: 12 }
});

export default HomeSixScreen;