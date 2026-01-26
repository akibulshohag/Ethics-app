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
    default:
      break;
  }
  return config;
};

export const selectServer = 'staging';

export const config = checkConfig(selectServer);