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

  const shouldSync = steps => {
    const now = Date.now();
    if (steps - lastSyncedSteps.current >= MIN_STEP_DIFF) return true;
    if (now - lastSyncTime.current >= MIN_TIME_DIFF) return true;
    return false;
  };

  const syncSteps = async steps => {
    try {
      const now = new Date();

      const payload = {
        steps,
        distance_km: Number((steps * 0.0008).toFixed(2)),
        calories: Math.round(steps * 0.04),
        active_minutes: Math.max(1, Math.floor(steps / 1000)),
        date: now.toISOString().split('T')[0],
      };

      console.log('Sync payload:', payload);

      await fetch('https://rewardplanners.com/api/crm/v1/steps/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

      const steps = result.records.reduce((sum, r) => sum + r.count, 0);

      console.log('Total steps:', steps);
      setTotalSteps(steps);

      if (shouldSync(steps)) {
        syncSteps(steps);
      }
    } catch (err) {
      console.log('Read error:', err);
      setHealthConnectError(err?.message || String(err));
    }
  };

  const checkHealthConnectStatus = async () => {
    try {
      await initialize();

      const sdkStatus = await getSdkStatus(
        'com.google.android.apps.healthdata',
      );

      console.log('SDK STATUS:', sdkStatus);
      setHealthConnectStatus(String(sdkStatus));

      if (sdkStatus === 0) {
        setHealthConnectError('Health Connect not installed');
        return [];
      }

      if (sdkStatus === 1) {
        setHealthConnectError('Health Connect needs setup');
        return [];
      }

      const granted = await getGrantedPermissions();
      console.log('Granted permissions:', granted);

      setGrantedPermissions(granted);

      // ✅ Only clear error if permission exists
      if (granted.length > 0) {
        setHealthConnectError(null);
      }

      return granted;
    } catch (err) {
      console.log('Status error:', err);
      setHealthConnectError(err?.message || String(err));
      return [];
    }
  };

  const hasStepsPermission = permissions => {
    return permissions.some(
      p => p.recordType === 'Steps' && p.accessType === 'read',
    );
  };

  const refreshStatus = async () => {
    console.log('Refreshing status');

    const perms = await checkHealthConnectStatus();

    if (hasStepsPermission(perms)) {
      await getStepsFromHealth();
    }
  };

  const requestStepsPermission = async () => {
    try {
      console.log(' Starting permission flow');

      const permissions = [{ accessType: 'read', recordType: 'Steps' }];

      //  STEP 1: CALL PERMISSION
      await requestPermission(permissions);

      //  STEP 2: WAIT (VERY IMPORTANT)
      await new Promise(res => setTimeout(res, 1500));

      //  STEP 3: OPEN HEALTH CONNECT SCREEN
      openHealthConnectDataManagement();

      //  STEP 4: CHECK AGAIN
      const granted = await getGrantedPermissions();
      console.log('AFTER REQUEST:', granted);

      setGrantedPermissions(granted);

      if (!hasStepsPermission(granted)) {
        setHealthConnectError(
          'Enable Steps permission in Health Connect → App permissions',
        );
        return false;
      }

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

    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        console.log('App resumed');

        const perms = await checkHealthConnectStatus();

        if (hasStepsPermission(perms)) {
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
    openHealthConnect: openHealthConnectDataManagement,
  };
};
