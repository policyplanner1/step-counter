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
    console.log('🚀 App Mounted');
    refreshStatus();
  }, []);

  useEffect(() => {
    console.log('📊 Health Connect Status:', healthConnectStatus);
    console.log('📊 Permissions:', grantedPermissions);
    console.log('📊 Steps:', totalSteps);
    console.log('❌ Error:', healthConnectError);
  }, [healthConnectStatus, grantedPermissions, totalSteps, healthConnectError]);

  const isReady =
    healthConnectStatus === '2' && grantedPermissions?.length > 0;

  const handlePrimaryAction = async () => {
    console.log('👉 Button pressed');

    //  Not installed
    if (healthConnectStatus === '0') {
      console.log('➡️ Install Health Connect');
      openHealthConnect('com.google.android.apps.healthdata');
      return;
    }

    //  Needs setup
    if (healthConnectStatus === '1') {
      console.log('➡️ Open Health Connect setup');
      openHealthConnect('com.google.android.apps.healthdata');
      return;
    }

    //  YOUR CURRENT STATE (IMPORTANT FIX)
    if (healthConnectStatus === '3') {
      console.log(' Forcing permission request (registration step)');

      try {
        await requestStepsPermission(); //  THIS FIXES EVERYTHING
      } catch (e) {
        console.log('Permission request failed → opening Health Connect');
        openHealthConnect('com.google.android.apps.healthdata');
      }

      return;
    }

    //  Permission missing
    if (healthConnectStatus === '2' && grantedPermissions?.length === 0) {
      console.log('➡️ Requesting permission');
      await requestStepsPermission();
      return;
    }

    //  Ready → fetch steps
    if (isReady) {
      console.log('➡️ Syncing steps');
      await refreshStatus();
    }
  };

  const getButtonTitle = () => {
    if (healthConnectStatus === '0') return 'Install Health Connect';
    if (healthConnectStatus === '1') return 'Setup Health Connect';
    if (healthConnectStatus === '3') return 'Allow Step Access';
    if (healthConnectStatus === '2' && grantedPermissions?.length === 0)
      return 'Allow Step Access';
    if (isReady) return 'Sync Steps';
    return 'Checking...';
  };

  const getStatusText = () => {
    if (healthConnectStatus === '0')
      return 'Health Connect is not installed.';

    if (healthConnectStatus === '1')
      return 'Complete Health Connect setup.';

    if (healthConnectStatus === '3')
      return 'Tap below to register your app with Health Connect.';

    if (healthConnectStatus === '2' && grantedPermissions?.length === 0)
      return 'Permission required to read steps.';

    if (isReady && totalSteps === 0)
      return 'No step data found. Make sure a fitness app is connected.';

    if (isReady)
      return 'Steps synced successfully.';

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