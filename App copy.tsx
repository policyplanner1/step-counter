import React from 'react';
import { View, Text, Button } from 'react-native';
import { useStepTracker } from './src/services/useStepTracker';

export default function App() {
  const {
    healthConnectStatus,
    permissionResult,
    grantedPermissions,
    totalSteps,
    healthConnectError,
    requestStepsPermission,
    refreshStatus,
    openHealthConnect,
  } = useStepTracker();

  //  Smart button renderer
  const renderActionButton = () => {
    // 0 → Not installed
    if (healthConnectStatus === '0') {
      return (
        <Button
          title="Install Health Connect"
          onPress={() =>
            openHealthConnect('com.google.android.apps.healthdata')
          }
        />
      );
    }

    // 1 → Installed but needs update / setup
    if (healthConnectStatus === '1') {
      return (
        <Button
          title="Open / Update Health Connect"
          onPress={() =>
            openHealthConnect('com.google.android.apps.healthdata')
          }
        />
      );
    }

    // 2 → Installed but no permission
    if (
      healthConnectStatus === '2' &&
      grantedPermissions?.length === 0
    ) {
      return (
        <Button
          title="Grant Steps Permission"
          onPress={requestStepsPermission}
        />
      );
    }

    // 2 → Fully ready
    if (
      healthConnectStatus === '2' &&
      grantedPermissions?.length > 0
    ) {
      return (
        <Button
          title="Sync Steps"
          onPress={refreshStatus}
        />
      );
    }

    return null;
  };

  // 🔍 Status message helper
  const getStatusMessage = () => {
    if (healthConnectStatus === '0') {
      return 'Health Connect is not installed. Please install it.';
    }

    if (healthConnectStatus === '1') {
      return 'Health Connect needs setup or update.';
    }

    if (
      healthConnectStatus === '2' &&
      grantedPermissions?.length === 0
    ) {
      return 'Permission required to read steps.';
    }

    if (
      healthConnectStatus === '2' &&
      grantedPermissions?.length > 0 &&
      totalSteps === 0
    ) {
      return 'No step data found. Install a fitness app like Google Fit or Samsung Health.';
    }

    if (healthConnectStatus === '2') {
      return 'Ready. Steps are syncing.';
    }

    return '';
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Health Connect Debug
      </Text>

      <Text>SDK status: {healthConnectStatus ?? 'unknown'}</Text>
      <Text>Granted permissions: {grantedPermissions?.length ?? 0}</Text>
      <Text>Permission result: {JSON.stringify(permissionResult)}</Text>
      <Text>Steps today: {totalSteps}</Text>

      {/* 🔥 Single Smart Button */}
      <View style={{ marginTop: 20, width: '100%' }}>
        {renderActionButton()}
      </View>

      {/* 🧠 UX Guidance */}
      <Text
        style={{
          marginTop: 12,
          color: '#555',
          textAlign: 'center',
        }}
      >
        {getStatusMessage()}
      </Text>

      {/* ❌ Error display */}
      {healthConnectError ? (
        <Text
          style={{
            color: 'red',
            marginTop: 10,
            textAlign: 'center',
          }}
        >
          Error: {healthConnectError}
        </Text>
      ) : null}
    </View>
  );
}