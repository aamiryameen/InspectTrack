import { useState, useEffect, useRef, useCallback } from 'react';
import { magnetometer } from 'react-native-sensors';
import { RecordingSettings } from '../../../utils/settingsUtils';

interface MagnetometerData {
  x: number;
  y: number;
  z: number;
}

interface MagnetometerDataPoint extends MagnetometerData {
  timestamp: number;
}

interface UseMagnetometerReturn {
  magnetometerData: MagnetometerData;
  magnetometerDataRef: React.MutableRefObject<MagnetometerDataPoint[]>;
  startMagnetometerDataCollection: (startTimestamp?: number) => void;
  stopMagnetometerDataCollection: () => void;
}

export const useMagnetometer = (settings: RecordingSettings): UseMagnetometerReturn => {
  const [magnetometerData, setMagnetometerData] = useState<MagnetometerData>({ x: 0, y: 0, z: 0 });
  const magnetometerSubscription = useRef<any>(null);
  const previousMagnetometerData = useRef<MagnetometerData>({ x: 0, y: 0, z: 0 });
  const magnetometerDataRef = useRef<MagnetometerDataPoint[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const lastRecordedDataRef = useRef<MagnetometerData>({ x: 0, y: 0, z: 0 });

  const getUTCTimestamp = (): number => {
    try {
      return Date.now();
    } catch (error) {
      return Date.now();
    }
  };

  // Threshold to detect significant changes (in μT for magnetometer)
  const changeThreshold = 1.0;

  const hasValueChanged = (current: MagnetometerData, last: MagnetometerData): boolean => {
    const dx = Math.abs(current.x - last.x);
    const dy = Math.abs(current.y - last.y);
    const dz = Math.abs(current.z - last.z);
    return dx > changeThreshold || dy > changeThreshold || dz > changeThreshold;
  };

  const startMagnetometer = useCallback(() => {
    const alpha = 0.1;
    const threshold = 0.05;

    magnetometerSubscription.current = magnetometer.subscribe(({ x, y, z }) => {
      let filteredX = alpha * x + (1 - alpha) * previousMagnetometerData.current.x;
      let filteredY = alpha * y + (1 - alpha) * previousMagnetometerData.current.y;
      let filteredZ = alpha * z + (1 - alpha) * previousMagnetometerData.current.z;

      if (Math.abs(filteredX - previousMagnetometerData.current.x) < threshold) {
        filteredX = previousMagnetometerData.current.x;
      }
      if (Math.abs(filteredY - previousMagnetometerData.current.y) < threshold) {
        filteredY = previousMagnetometerData.current.y;
      }
      if (Math.abs(filteredZ - previousMagnetometerData.current.z) < threshold) {
        filteredZ = previousMagnetometerData.current.z;
      }

      const currentData = { x: filteredX, y: filteredY, z: filteredZ };
      previousMagnetometerData.current = currentData;
      setMagnetometerData(currentData);

      // Record data when values change during recording
      if (isRecordingRef.current && hasValueChanged(currentData, lastRecordedDataRef.current)) {
        const utcTimestamp = getUTCTimestamp();
        magnetometerDataRef.current.push({
          timestamp: utcTimestamp,
          x: filteredX,
          y: filteredY,
          z: filteredZ,
        });
        lastRecordedDataRef.current = { ...currentData };
      }
    });
  }, []);

  const startMagnetometerDataCollection = useCallback((startTimestamp?: number) => {
    magnetometerDataRef.current = [];
    const recordingStartTime = startTimestamp || Date.now();
    recordingStartTimeRef.current = recordingStartTime;
    isRecordingRef.current = true;

    const initialTimestamp = recordingStartTime;
    const initialData = { ...previousMagnetometerData.current };
    magnetometerDataRef.current.push({
      timestamp: initialTimestamp,
      x: initialData.x,
      y: initialData.y,
      z: initialData.z,
    });
    lastRecordedDataRef.current = { ...initialData };
  }, []);

  const stopMagnetometerDataCollection = useCallback(() => {
    isRecordingRef.current = false;
  }, []);

  useEffect(() => {
    startMagnetometer();
    return () => {
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.unsubscribe();
      }
      stopMagnetometerDataCollection();
    };
  }, [startMagnetometer, stopMagnetometerDataCollection]);

  return {
    magnetometerData,
    magnetometerDataRef,
    startMagnetometerDataCollection,
    stopMagnetometerDataCollection,
  };
};
