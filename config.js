import { Platform } from 'react-native';

export const APP_NAME = 'Ethics';
export const TEL_NUMBER = '018********';

// Override for physical device: use your computer's LAN IP (e.g. 192.168.1.x:3000)
const LOCAL_OVERRIDE = null; // e.g. 'http://192.168.1.100:3000/v1'

const checkConfig = server => {
  let config = {};
  switch (server) {
    case 'production':
      config = {
        apiBaseUrl: 'https://eatixapi.pino7.com/v1',
      };
      break;
    case 'staging':
      config = {
        apiBaseUrl: 'https://ss.example.com/api',
      };
      break;
    case 'local':
      if (LOCAL_OVERRIDE) {
        config = { apiBaseUrl: LOCAL_OVERRIDE };
      } else {
        // Android emulator: 10.0.2.2 = host machine
        // iOS simulator: localhost works
        const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
        config = {
          apiBaseUrl: `http://${host}:3000/v1`,
        };
      }
      break;
    default:
      break;
  }
  return config;
};

export const selectServer = 'production';

export const config = checkConfig(selectServer);
