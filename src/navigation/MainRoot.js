import React from 'react';
import { useSelector } from 'react-redux';
import BottomNaivgation from './BottomTabNavigation';
import RiderDashboardScreen from '../screens/RiderDashboardScreen';

/** Riders see only the delivery dashboard — no bottom tabs or home feed. */
export default function MainRoot() {
  const user = useSelector(s => s.app?.user);
  const role = String(user?.role || '').toLowerCase();
  if (role === 'rider') {
    return <RiderDashboardScreen />;
  }
  return <BottomNaivgation />;
}
