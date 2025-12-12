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
  const gyroCollectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const getUTCTimestamp = (): number => {
    try {
      return Date.now();
    } catch (error) {
      console.error('Error getting UTC timestamp:', error);
      return Date.now();
    }
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

      previousGyroData.current = { x: filteredX, y: filteredY, z: filteredZ };
      setGyroData({ x: filteredX, y: filteredY, z: filteredZ });
    });
  }, []);

  const startGyroscopeDataCollection = useCallback((startTimestamp?: number) => {
    gyroDataRef.current = [];
    const recordingStartTime = startTimestamp || Date.now();
    recordingStartTimeRef.current = recordingStartTime;
    const samplingInterval = settings.gps.updateInterval * 1000;

    // Capture first data point immediately at start time
    const initialTimestamp = recordingStartTime;
    gyroDataRef.current.push({
      timestamp: initialTimestamp,
      x: previousGyroData.current.x,
      y: previousGyroData.current.y,
      z: previousGyroData.current.z,
    });

    // Then continue collecting at intervals
    gyroCollectionInterval.current = setInterval(() => {
      const utcTimestamp = getUTCTimestamp();

      gyroDataRef.current.push({
        timestamp: utcTimestamp,
        x: previousGyroData.current.x,
        y: previousGyroData.current.y,
        z: previousGyroData.current.z,
      });
    }, samplingInterval);
  }, [settings.gps.updateInterval]);

  const stopGyroscopeDataCollection = useCallback(() => {
    if (gyroCollectionInterval.current) {
      clearInterval(gyroCollectionInterval.current);
      gyroCollectionInterval.current = null;
    }
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

