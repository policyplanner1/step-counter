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
  } = useStepTracker();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Health Connect debug</Text>
      <Text>SDK status: {healthConnectStatus ?? 'unknown'}</Text>
      <Text>Granted permissions: {grantedPermissions?.length ?? 0}</Text>
      <Text>Permission result: {JSON.stringify(permissionResult)}</Text>
      <Text>Steps today: {totalSteps}</Text>
      <View style={{ marginVertical: 16, width: '100%' }}>
        <Button
          title="Request Health Connect Steps Permission"
          onPress={requestStepsPermission}
        />
      </View>
      <View style={{ marginVertical: 8, width: '100%' }}>
        <Button
          title="Refresh Status"
          onPress={refreshStatus}
        />
      </View>
      {grantedPermissions?.length === 0 ? (
        <Text style={{ marginTop: 10, color: '#555', textAlign: 'center' }}>
          No Health Connect steps permission granted yet. Tap the button and allow Steps access.
        </Text>
      ) : null}
      {healthConnectError ? (
        <Text style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>Error: {healthConnectError}</Text>
      ) : null}
    </View>
  );
}
