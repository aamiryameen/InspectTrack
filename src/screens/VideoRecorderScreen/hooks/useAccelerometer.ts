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
  const accelCollectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const getUTCTimestamp = (): number => {
    try {
      return Date.now();
    } catch (error) {
      return Date.now();
    }
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

      previousAccelData.current = { x: filteredX, y: filteredY, z: filteredZ };
      setAccelData({ x: filteredX, y: filteredY, z: filteredZ });
    });
  }, []);

  const startAccelerometerDataCollection = useCallback((startTimestamp?: number) => {
    accelDataRef.current = [];
    const recordingStartTime = startTimestamp || Date.now();
    recordingStartTimeRef.current = recordingStartTime;
    const samplingInterval = 500; // 500ms interval during video recording

    const initialTimestamp = recordingStartTime;
    accelDataRef.current.push({
      timestamp: initialTimestamp,
      x: previousAccelData.current.x,
      y: previousAccelData.current.y,
      z: previousAccelData.current.z,
    });

    accelCollectionInterval.current = setInterval(() => {
      const utcTimestamp = getUTCTimestamp();

      accelDataRef.current.push({
        timestamp: utcTimestamp,
        x: previousAccelData.current.x,
        y: previousAccelData.current.y,
        z: previousAccelData.current.z,
      });
    }, samplingInterval);
  }, []);

  const stopAccelerometerDataCollection = useCallback(() => {
    if (accelCollectionInterval.current) {
      clearInterval(accelCollectionInterval.current);
      accelCollectionInterval.current = null;
    }
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
