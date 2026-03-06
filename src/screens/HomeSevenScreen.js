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

const HomeSevenScreen = ({ onBack, onSignUp }) => {
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }} 
      style={styles.backgroundImage}
      resizeMode="cover"
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
          {/* Login Card */}
          <View style={styles.loginCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.headerTitle}>Diner log in</Text>
            </View>

            <View style={styles.cardBody}>
              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <Icon name="email-outline" size={22} color="#FFF" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Placeholder" 
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  style={styles.input}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <Icon name="lock-outline" size={22} color="#FFF" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Password" 
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                  style={styles.input}
                />
              </View>

              {/* Remember & Forgot Row */}
              <View style={styles.utilityRow}>
                <TouchableOpacity 
                  style={styles.checkboxContainer} 
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <Icon 
                    name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={18} 
                    color="#6D4C41" 
                  />
                  <Text style={styles.utilityText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={[styles.utilityText, styles.underline]}>Foregate Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={onSignUp}>
                  <Text style={styles.btnText}>Sign Up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.btnText}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Social Login Section */}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
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
  loginCard: { 
    width: '100%', 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    overflow: 'hidden', 
    elevation: 10 
  },
  cardHeader: { backgroundColor: '#F5A623', paddingVertical: 18, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  cardBody: { padding: 25 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F7C16F', 
    borderRadius: 8, 
    height: 52, 
    paddingHorizontal: 15, 
    marginBottom: 20 
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFF', fontSize: 16 },
  utilityRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 30 
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  utilityText: { fontSize: 11, color: '#666', marginLeft: 5 },
  underline: { textDecorationLine: 'underline' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { 
    backgroundColor: '#F5A623', 
    width: '46%', 
    height: 48, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  socialContainer: { alignItems: 'center', marginTop: 35 },
  socialTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  socialPill: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 22, 
    paddingVertical: 4, 
    borderRadius: 30 
  },
  socialIcon: { marginHorizontal: 12 }
});

export default HomeSevenScreen;