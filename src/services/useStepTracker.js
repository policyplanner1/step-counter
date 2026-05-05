import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  initialize,
  readRecords,
  requestPermission,
  getGrantedPermissions,
  getSdkStatus,
  openHealthConnectDataManagement,
} from 'react-native-health-connect';

const MIN_STEP_DIFF = 20;
const MIN_TIME_DIFF = 30000;

export const useStepTracker = () => {
  const lastSyncedSteps = useRef(0);
  const lastSyncTime = useRef(0);

  const [healthConnectStatus, setHealthConnectStatus] = useState(null);
  const [permissionResult, setPermissionResult] = useState([]);
  const [grantedPermissions, setGrantedPermissions] = useState([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [healthConnectError, setHealthConnectError] = useState(null);

  const shouldSync = (steps) => {
    const now = Date.now();

    if (steps - lastSyncedSteps.current >= MIN_STEP_DIFF) return true;
    if (now - lastSyncTime.current >= MIN_TIME_DIFF) return true;

    return false;
  };

  const syncSteps = async (steps) => {
    try {
      lastSyncedSteps.current = steps;
      lastSyncTime.current = Date.now();

      await fetch('http://YOUR_SERVER/steps/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensor_total: steps,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.log('Sync failed:', e);
    }
  };

  const getStepsFromHealth = async () => {
    try {
      const now = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const result = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: start.toISOString(),
          endTime: now.toISOString(),
        },
      });

      console.log('Health Connect readRecords result:', result);

      const steps = result.records.reduce((sum, r) => sum + r.count, 0);

      console.log('Total steps today:', steps);
      setTotalSteps(steps);

      if (shouldSync(steps)) {
        syncSteps(steps);
      }
    } catch (err) {
      console.log('Health Connect read error:', err);
      setHealthConnectError(err?.message || String(err));
    }
  };

  const checkHealthConnectStatus = async () => {
    try {
      await initialize();

      const sdkStatus = await getSdkStatus(
        'com.google.android.apps.healthdata'
      );

      console.log('Health Connect SDK status:', sdkStatus);
      setHealthConnectStatus(String(sdkStatus));

      // 🚨 CRITICAL CHECK
      if (sdkStatus !== 2) {
        setHealthConnectError(
          'Health Connect not installed or not ready'
        );
        return [];
      }

      const permissions = await getGrantedPermissions();
      console.log('Granted permissions:', permissions);

      setGrantedPermissions(permissions);
      setHealthConnectError(null);

      return permissions;
    } catch (err) {
      console.log('Status check error:', err);
      setHealthConnectError(err?.message || String(err));
      setGrantedPermissions([]);
      return [];
    }
  };

  const hasStepsPermission = (permissions) => {
    return permissions.some(
      (p) =>
        p.recordType === 'Steps' &&
        p.accessType === 'read'
    );
  };

  const refreshStatus = async () => {
    console.log('Refreshing Health Connect status');

    const permissions = await checkHealthConnectStatus();

    if (hasStepsPermission(permissions)) {
      await getStepsFromHealth();
    }
  };

  const requestStepsPermission = async () => {
    try {
      console.log('Requesting Steps permission');

      const result = await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
      ]);

      console.log('Permission result:', result);
      setPermissionResult(result);

      const permissions = await getGrantedPermissions();
      setGrantedPermissions(permissions);

      if (!hasStepsPermission(permissions)) {
        setHealthConnectError(
          'Steps permission not granted. Please enable it in Health Connect.'
        );
        return false;
      }

      //  Important delay (permission propagation fix)
      await new Promise((res) => setTimeout(res, 1000));

      await getStepsFromHealth();

      setHealthConnectError(null);
      return true;
    } catch (err) {
      console.log('Permission error:', err);
      setHealthConnectError(err?.message || String(err));
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkHealthConnectStatus();
    };

    init();

    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        console.log('App resumed → refresh');

        const permissions = await checkHealthConnectStatus();

        if (hasStepsPermission(permissions)) {
          await getStepsFromHealth();
        }
      }
    });

    return () => sub.remove();
  }, []);

  return {
    healthConnectStatus,
    permissionResult,
    grantedPermissions,
    totalSteps,
    healthConnectError,
    requestStepsPermission,
    refreshStatus,
    openHealthConnect: openHealthConnectDataManagement, // 👈 expose this
  };
};