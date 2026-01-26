import { Platform } from 'react-native';
import querystring from 'qs';
import { config, selectServer } from '../../config';
import { version } from '../../package.json';
import { store } from '../redux';
import axios from 'axios';

function getUrl(endpoint, baseUrl) {
  const extra = querystring.stringify({
    f: 'ethics_app',
    v: version,
    os: Platform.OS,
    osv: Platform.Version,
  });
  let url = `${baseUrl}/${endpoint}`;
  if (url.indexOf('?') === -1) {
    url += '?' + extra;
  } else {
    url += '&' + extra;
  }
  return url;
}

export async function request({
  endpoint,
  method = 'GET',
  body,
  headers = {},
}) {
  const { app } = store.getState();
  let accessToken = app?.user?.token;
  const authHeaders = {};
  if (accessToken) {
    authHeaders['Authorization'] = `Bearer ${accessToken}`;
  }
  let baseUrl =
    selectServer === 'production' ? config.apiBaseUrl : config.apiBaseUrl;

  const url = getUrl(endpoint, baseUrl);
  const requestOptions = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    data: body ? body : undefined,
  };

  try {
    const response = await axios(requestOptions);
    return response.data;
  } catch (error) {
    console.log('API request error:', 'endpoint', endpoint, error);
    throw error;
  }
}

export function getData() {
  return request({
    endpoint: 'v1/example/',
    method: 'GET',
  });
}