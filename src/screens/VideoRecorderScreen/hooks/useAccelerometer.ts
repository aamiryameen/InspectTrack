import { useState, useEffect, useRef, useCallback } from 'react';
import { accelerometer } from 'react-native-sensors';
import { RecordingSettings } from '../../../utils/settingsUtils';

interface AccelData {
  x: number;
  y: number;
  z: number;
}

interface AccelDataPoint extends AccelData {
  timestamp: number;
}

interface UseAccelerometerReturn {
  accelData: AccelData;
  accelDataRef: React.MutableRefObject<AccelDataPoint[]>;
  startAccelerometerDataCollection: (startTimestamp?: number) => void;
  stopAccelerometerDataCollection: () => void;
}

export const useAccelerometer = (settings: RecordingSettings): UseAccelerometerReturn => {
  const [accelData, setAccelData] = useState<AccelData>({ x: 0, y: 0, z: 0 });
  const accelSubscription = useRef<any>(null);
  const previousAccelData = useRef<AccelData>({ x: 0, y: 0, z: 0 });
  const accelDataRef = useRef<AccelDataPoint[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const lastRecordedDataRef = useRef<AccelData>({ x: 0, y: 0, z: 0 });

  const getUTCTimestamp = (): number => {
    try {
      return Date.now();
    } catch (error) {
      return Date.now();
    }
  };

  // Threshold to detect significant changes (in m/s² for accelerometer)
  const changeThreshold = 0.1;

  const hasValueChanged = (current: AccelData, last: AccelData): boolean => {
    const dx = Math.abs(current.x - last.x);
    const dy = Math.abs(current.y - last.y);
    const dz = Math.abs(current.z - last.z);
    return dx > changeThreshold || dy > changeThreshold || dz > changeThreshold;
  };

  const startAccelerometer = useCallback(() => {
    const alpha = 0.1;
    const threshold = 0.05;

    accelSubscription.current = accelerometer.subscribe(({ x, y, z }) => {
      let filteredX = alpha * x + (1 - alpha) * previousAccelData.current.x;
      let filteredY = alpha * y + (1 - alpha) * previousAccelData.current.y;
      let filteredZ = alpha * z + (1 - alpha) * previousAccelData.current.z;

      if (Math.abs(filteredX - previousAccelData.current.x) < threshold) {
        filteredX = previousAccelData.current.x;
      }
      if (Math.abs(filteredY - previousAccelData.current.y) < threshold) {
        filteredY = previousAccelData.current.y;
      }
      if (Math.abs(filteredZ - previousAccelData.current.z) < threshold) {
        filteredZ = previousAccelData.current.z;
      }

      const currentData = { x: filteredX, y: filteredY, z: filteredZ };
      previousAccelData.current = currentData;
      setAccelData(currentData);

      // Record data when values change during recording
      if (isRecordingRef.current && hasValueChanged(currentData, lastRecordedDataRef.current)) {
        const utcTimestamp = getUTCTimestamp();
        accelDataRef.current.push({
          timestamp: utcTimestamp,
          x: filteredX,
          y: filteredY,
          z: filteredZ,
        });
        lastRecordedDataRef.current = { ...currentData };
      }
    });
  }, []);

  const startAccelerometerDataCollection = useCallback((startTimestamp?: number) => {
    accelDataRef.current = [];
    const recordingStartTime = startTimestamp || Date.now();
    recordingStartTimeRef.current = recordingStartTime;
    isRecordingRef.current = true;

    const initialTimestamp = recordingStartTime;
    const initialData = { ...previousAccelData.current };
    accelDataRef.current.push({
      timestamp: initialTimestamp,
      x: initialData.x,
      y: initialData.y,
      z: initialData.z,
    });
    lastRecordedDataRef.current = { ...initialData };
  }, []);

  const stopAccelerometerDataCollection = useCallback(() => {
    isRecordingRef.current = false;
  }, []);

  useEffect(() => {
    startAccelerometer();

    return () => {
      if (accelSubscription.current) {
        accelSubscription.current.unsubscribe();
      }
      stopAccelerometerDataCollection();
    };
  }, [startAccelerometer, stopAccelerometerDataCollection]);

  return {
    accelData,
    accelDataRef,
    startAccelerometerDataCollection,
    stopAccelerometerDataCollection,
  };
};
