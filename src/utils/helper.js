import {createNavigationContainerRef} from '@react-navigation/native';

export function validPhoneNumber(phone) {
  const regex = /(^(\+8801|8801|008801|01))(\d){9}$/;
  return regex.test(phone);
}

export function validEmail(email) {
  const regex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(email);
}

export function fontSize(size) {
  const {Dimensions} = require('react-native');
  const {width} = Dimensions.get('window');
  if (width < 350) {
    return size - 2;
  } else {
    return size;
  }
}

let navigator;
export function updateNavigator(nav) {
  if (nav) {
    navigator = nav;
  }
  return navigator;
}

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  navigationRef?.current?.navigate(name, params);
}