import { useState, useEffect, useRef, useCallback } from 'react';
import { gyroscope } from 'react-native-sensors';
import { RecordingSettings } from '../../../utils/settingsUtils';

interface GyroData {
  x: number;
  y: number;
  z: number;
}

interface GyroDataPoint extends GyroData {
  timestamp: number;
}

interface UseGyroscopeReturn {
  gyroData: GyroData;
  gyroDataRef: React.MutableRefObject<GyroDataPoint[]>;
  startGyroscopeDataCollection: (startTimestamp?: number) => void;
  stopGyroscopeDataCollection: () => void;
}

export const useGyroscope = (settings: RecordingSettings): UseGyroscopeReturn => {
  const [gyroData, setGyroData] = useState<GyroData>({ x: 0, y: 0, z: 0 });
  const gyroSubscription = useRef<any>(null);
  const previousGyroData = useRef<GyroData>({ x: 0, y: 0, z: 0 });
  const gyroDataRef = useRef<GyroDataPoint[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const lastRecordedDataRef = useRef<GyroData>({ x: 0, y: 0, z: 0 });

  const getUTCTimestamp = (): number => {
    try {
      return Date.now();
    } catch (error) {
      console.error('Error getting UTC timestamp:', error);
      return Date.now();
    }
  };

  // Threshold to detect significant changes (in rad/s for gyroscope)
  const changeThreshold = 0.01;

  const hasValueChanged = (current: GyroData, last: GyroData): boolean => {
    const dx = Math.abs(current.x - last.x);
    const dy = Math.abs(current.y - last.y);
    const dz = Math.abs(current.z - last.z);
    return dx > changeThreshold || dy > changeThreshold || dz > changeThreshold;
  };

  const startGyroscope = useCallback(() => {
    const alpha = 0.1;
    const threshold = 0.05;

    gyroSubscription.current = gyroscope.subscribe(({ x, y, z }) => {
      let filteredX = alpha * x + (1 - alpha) * previousGyroData.current.x;
      let filteredY = alpha * y + (1 - alpha) * previousGyroData.current.y;
      let filteredZ = alpha * z + (1 - alpha) * previousGyroData.current.z;

      if (Math.abs(filteredX - previousGyroData.current.x) < threshold) {
        filteredX = previousGyroData.current.x;
      }
      if (Math.abs(filteredY - previousGyroData.current.y) < threshold) {
        filteredY = previousGyroData.current.y;
      }
      if (Math.abs(filteredZ - previousGyroData.current.z) < threshold) {
        filteredZ = previousGyroData.current.z;
      }

      const currentData = { x: filteredX, y: filteredY, z: filteredZ };
      previousGyroData.current = currentData;
      setGyroData(currentData);

      // Record data when values change during recording
      if (isRecordingRef.current && hasValueChanged(currentData, lastRecordedDataRef.current)) {
        const utcTimestamp = getUTCTimestamp();
        gyroDataRef.current.push({
          timestamp: utcTimestamp,
          x: filteredX,
          y: filteredY,
          z: filteredZ,
        });
        lastRecordedDataRef.current = { ...currentData };
      }
    });
  }, []);

  const startGyroscopeDataCollection = useCallback((startTimestamp?: number) => {
    gyroDataRef.current = [];
    const recordingStartTime = startTimestamp || Date.now();
    recordingStartTimeRef.current = recordingStartTime;
    isRecordingRef.current = true;

    const initialTimestamp = recordingStartTime;
    const initialData = { ...previousGyroData.current };
    gyroDataRef.current.push({
      timestamp: initialTimestamp,
      x: initialData.x,
      y: initialData.y,
      z: initialData.z,
    });
    lastRecordedDataRef.current = { ...initialData };
  }, []);

  const stopGyroscopeDataCollection = useCallback(() => {
    isRecordingRef.current = false;
  }, []);

  useEffect(() => {
    startGyroscope();

    return () => {
      if (gyroSubscription.current) {
        gyroSubscription.current.unsubscribe();
      }
      stopGyroscopeDataCollection();
    };
  }, [startGyroscope, stopGyroscopeDataCollection]);

  return {
    gyroData,
    gyroDataRef,
    startGyroscopeDataCollection,
    stopGyroscopeDataCollection,
  };
};
