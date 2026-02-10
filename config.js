export const APP_NAME = 'Ethics';
export const TEL_NUMBER = '018********';

const checkConfig = server => {
  let config = {};
  switch (server) {
    case 'production':
      config = {
        apiBaseUrl: 'https://api.example.com',
      };
      break;
    case 'staging':
      config = {
        apiBaseUrl: 'https://ss.example.com/api',
      };
      break;
    case 'local':
      config = {
        // When running on Android emulator, the host machine is accessible as 10.0.2.2
        // Backend (Nest) runs on port 3000 and uses a global "v1" prefix
        apiBaseUrl: 'http://10.0.2.2:3000/v1',
      };
      break;
    default:
      break;
  }
  return config;
};

export const selectServer = 'local';

export const config = checkConfig(selectServer);
