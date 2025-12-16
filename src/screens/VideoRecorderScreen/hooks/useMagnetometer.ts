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
  const magnetometerCollectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const getUTCTimestamp = (): number => {
    try {
      return Date.now();
    } catch (error) {
      return Date.now();
    }
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

      previousMagnetometerData.current = { x: filteredX, y: filteredY, z: filteredZ };
      setMagnetometerData({ x: filteredX, y: filteredY, z: filteredZ });
    });
  }, []);

  const startMagnetometerDataCollection = useCallback((startTimestamp?: number) => {
    magnetometerDataRef.current = [];
    const recordingStartTime = startTimestamp || Date.now();
    recordingStartTimeRef.current = recordingStartTime;
    const samplingInterval = settings.gps.updateInterval * 1000;

    const initialTimestamp = recordingStartTime;
    magnetometerDataRef.current.push({
      timestamp: initialTimestamp,
      x: previousMagnetometerData.current.x,
      y: previousMagnetometerData.current.y,
      z: previousMagnetometerData.current.z,
    });

    magnetometerCollectionInterval.current = setInterval(() => {
      const utcTimestamp = getUTCTimestamp();

      magnetometerDataRef.current.push({
        timestamp: utcTimestamp,
        x: previousMagnetometerData.current.x,
        y: previousMagnetometerData.current.y,
        z: previousMagnetometerData.current.z,
      });
    }, samplingInterval);
  }, [settings.gps.updateInterval]);

  const stopMagnetometerDataCollection = useCallback(() => {
    if (magnetometerCollectionInterval.current) {
      clearInterval(magnetometerCollectionInterval.current);
      magnetometerCollectionInterval.current = null;
    }
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
