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
import type { Permission } from 'react-native-health-connect';

const MIN_STEP_DIFF = 20;
const MIN_TIME_DIFF = 30000;

export const useStepTracker = () => {
  const lastSyncedSteps = useRef(0);
  const lastSyncTime = useRef(0);

  const [healthConnectStatus, setHealthConnectStatus] = useState<string | null>(null);
  const [grantedPermissions, setGrantedPermissions] = useState<any[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [healthConnectError, setHealthConnectError] = useState<string | null>(null);

  const shouldSync = (steps: number) => {
    const now = Date.now();
    if (steps - lastSyncedSteps.current >= MIN_STEP_DIFF) return true;
    if (now - lastSyncTime.current >= MIN_TIME_DIFF) return true;
    return false;
  };

  const syncSteps = async (steps: number) => {
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
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${your_token_here}`,
        },
        body: JSON.stringify(payload),
      });

      // Update refs after successful sync
      lastSyncedSteps.current = steps;
      lastSyncTime.current = Date.now();
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
        await syncSteps(steps);
      }
    } catch (err: any) {
      console.log('Read error:', err);
      setHealthConnectError(err?.message || String(err));
    }
  };

  const checkHealthConnectStatus = async () => {
    try {
      await initialize();

      const sdkStatus = await getSdkStatus(
        'com.google.android.healthconnect.controller',
        
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

      if (granted.length > 0) {
        setHealthConnectError(null);
      }

      return granted;
    } catch (err: any) {
      console.log('Status error:', err);
      setHealthConnectError(err?.message || String(err));
      return [];
    }
  };

  const hasStepsPermission = (permissions: any[]) => {
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
      console.log('🔵 STEP 1: Starting permission flow');

      const permissions: Permission[] = [{ accessType: 'read', recordType: 'Steps' }];

      console.log('🔵 STEP 2: Calling requestPermission...');
      const result = await requestPermission(permissions);
      console.log('🔵 STEP 3: requestPermission returned:', JSON.stringify(result));

      await new Promise<void>(res => setTimeout(res, 800));

      console.log('🔵 STEP 4: Calling getGrantedPermissions...');
      const granted = await getGrantedPermissions();
      console.log('🔵 STEP 5: granted:', JSON.stringify(granted));

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
    } catch (err: any) {
      console.log('🔴 Permission error:', err);
      console.log('🔴 Error message:', err?.message);
      console.log('🔴 Error stack:', err?.stack);
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
    grantedPermissions,
    totalSteps,
    healthConnectError,
    requestStepsPermission,
    refreshStatus,
    openHealthConnect: openHealthConnectDataManagement,
  };
};