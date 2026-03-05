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

const HomeTwoScreen = ({ onBack }) => {
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }} 
      style={styles.backgroundImage}
      blurRadius={2}
    >
      <StatusBar barStyle="light-content" transparent backgroundColor="transparent" />
      <SafeAreaView style={styles.overlay}>
        
        {/* Top Navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Icon name="chevron-left" size={20} color="#FFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Icon name="dots-vertical" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.centerContainer}>
          {/* Login Card */}
          <View style={styles.loginCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.loginTitle}>LOGIN</Text>
            </View>

            <View style={styles.cardBody}>
              {/* Email/Placeholder Input */}
              <View style={styles.inputContainer}>
                <Icon name="email-outline" size={22} color="#FFF" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Placeholder" 
                  placeholderTextColor="rgba(255,255,255,0.8)"
                  style={styles.input}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Icon name="lock-outline" size={22} color="#FFF" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Password" 
                  placeholderTextColor="rgba(255,255,255,0.8)"
                  secureTextEntry
                  style={styles.input}
                />
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.row}>
                <TouchableOpacity 
                  style={styles.checkboxRow} 
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <Icon 
                    name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={20} 
                    color="#555" 
                  />
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Social Sign In */}
          <View style={styles.socialSection}>
            <Text style={styles.socialLabel}>Sign in with</Text>
            <View style={styles.socialIconsRow}>
              <TouchableOpacity style={styles.socialCircle}>
                <Icon name="facebook" size={30} color="#1877F2" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialCircle}>
                <Icon name="google" size={30} color="#EA4335" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loginCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
  },
  cardHeader: {
    backgroundColor: '#F5A623',
    paddingVertical: 15,
    alignItems: 'center',
  },
  loginTitle: {
    color: '#222',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardBody: {
    padding: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7C16F',
    borderRadius: 10,
    height: 55,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 5,
  },
  forgotText: {
    fontSize: 11,
    color: '#666',
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#F5A623',
    width: '45%',
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  socialSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  socialLabel: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  socialIconsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 30,
  },
  socialCircle: {
    marginHorizontal: 15,
  }
});

export default HomeTwoScreen;