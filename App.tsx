import React, { useEffect } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useStepTracker } from './src/services/useStepTracker';

export default function App() {
  const {
    healthConnectStatus,
    grantedPermissions,
    totalSteps,
    healthConnectError,
    requestStepsPermission,
    refreshStatus,
    openHealthConnect,
  } = useStepTracker();

  useEffect(() => {
    refreshStatus();
  }, []);

  const isReady =
    healthConnectStatus === '2' && grantedPermissions?.length > 0;

  const handlePrimaryAction = () => {
    if (healthConnectStatus === '0') {
      openHealthConnect('com.google.android.apps.healthdata');
    } else if (healthConnectStatus === '1') {
      openHealthConnect('com.google.android.apps.healthdata');
    } else if (
      healthConnectStatus === '2' &&
      grantedPermissions?.length === 0
    ) {
      requestStepsPermission();
    } else if (isReady) {
      refreshStatus();
    }
  };

  const getButtonTitle = () => {
    if (healthConnectStatus === '0') return 'Install Health Connect';
    if (healthConnectStatus === '1') return 'Open Health Connect';
    if (healthConnectStatus === '2' && grantedPermissions?.length === 0)
      return 'Allow Step Access';
    if (isReady) return 'Sync Steps';
    return 'Checking...';
  };

  const getStatusText = () => {
    if (healthConnectStatus === '0')
      return 'Health Connect is required.';
    if (healthConnectStatus === '1')
      return 'Complete Health Connect setup.';
    if (healthConnectStatus === '2' && grantedPermissions?.length === 0)
      return 'Permission required to read steps.';
    if (isReady && totalSteps === 0)
      return 'No step data found.';
    if (isReady) return 'Tracking steps.';
    return 'Checking device...';
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: '600' }}>
        Step Tracker
      </Text>

      {/* ALWAYS render — no early return */}
      {!healthConnectStatus ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <>
          <Text style={{ fontSize: 36, marginTop: 20 }}>
            {totalSteps}
          </Text>

          <Text style={{ color: '#666' }}>steps today</Text>

          <Text
            style={{
              marginTop: 20,
              marginBottom: 20,
              textAlign: 'center',
              color: '#555',
            }}
          >
            {getStatusText()}
          </Text>

          <View style={{ width: '100%' }}>
            <Button
              title={getButtonTitle()}
              onPress={handlePrimaryAction}
            />
          </View>
        </>
      )}

      {healthConnectError && (
        <Text style={{ color: 'red', marginTop: 15 }}>
          {healthConnectError}
        </Text>
      )}
    </View>
  );
}