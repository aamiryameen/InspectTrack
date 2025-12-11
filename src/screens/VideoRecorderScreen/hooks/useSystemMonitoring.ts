import { useState, useEffect, useRef, useCallback } from 'react';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

const { CpuUsageModule } = NativeModules;

interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  totalStorageGB: number;
  recordingVideoSizeGB: number;
}

interface UseSystemMonitoringReturn extends SystemStats {
  cpuStatsRef: React.MutableRefObject<number[]>;
  memoryStatsRef: React.MutableRefObject<number[]>;
  resetStats: () => void;
  setRecordingVideoPath: (path: string | null) => void;
}

const getAppCpuUsage = async (): Promise<number> => {
  try {
    if (CpuUsageModule?.getAppCpuUsage) {
      const appCpuUsage = await CpuUsageModule.getAppCpuUsage();
      return Math.round(appCpuUsage);
    }
    return -1;
  } catch (error) {
    console.warn('App CPU usage not available:', error);
    return -1;
  }
};

const getMemoryUsage = async (): Promise<number> => {
  try {
    if (CpuUsageModule?.getMemoryUsage) {
      const memoryMB = await CpuUsageModule.getMemoryUsage();
      return Math.round(memoryMB);
    }
    return -1;
  } catch (error) {
    console.warn('Memory usage not available:', error);
    return -1;
  }
};

const getStorageInfo = async (): Promise<{ usedGB: number; totalGB: number } | null> => {
  try {
    if (CpuUsageModule?.getStorageInfo) {
      const storageInfo = await CpuUsageModule.getStorageInfo();
      return storageInfo;
    }
    return null;
  } catch (error) {
    console.warn('Storage info not available:', error);
    return null;
  }
};

export const useSystemMonitoring = (isRecording: boolean): UseSystemMonitoringReturn => {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [storageUsage, setStorageUsage] = useState(0);
  const [totalStorageGB, setTotalStorageGB] = useState(0);
  const [recordingVideoSizeGB, setRecordingVideoSizeGB] = useState(0);

  const cpuStatsRef = useRef<number[]>([]);
  const memoryStatsRef = useRef<number[]>([]);
  const lastCpuRef = useRef<number>(0);
  const recordingVideoPathRef = useRef<string | null>(null);

  const resetStats = useCallback(() => {
    cpuStatsRef.current = [];
    memoryStatsRef.current = [];
    recordingVideoPathRef.current = null;
    setRecordingVideoSizeGB(0);
  }, []);

  const setRecordingVideoPath = useCallback((path: string | null) => {
    recordingVideoPathRef.current = path;
  }, []);

  const getRecordingVideoSize = useCallback(async (): Promise<number> => {
    try {
      const filePath = recordingVideoPathRef.current;

      if (!filePath) {
        return 0;
      }

      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        return 0;
      }

      const fileInfo = await RNFS.stat(filePath);
      const sizeBytes = fileInfo.size || 0;

      const sizeGB = sizeBytes / (1024 * 1024 * 1024);
      return parseFloat(sizeGB.toFixed(4));
    } catch (error) {
      return 0;
    }
  }, []);

  useEffect(() => {
    const updateSystemStats = async () => {
      try {
        let appCpuUsage = await getAppCpuUsage();

        if (appCpuUsage < 0) {
          appCpuUsage = lastCpuRef.current || 0;
        }

        const smoothedCpu = lastCpuRef.current === 0
          ? appCpuUsage
          : Math.round(lastCpuRef.current * 0.3 + appCpuUsage * 0.7);
        lastCpuRef.current = smoothedCpu;

        setCpuUsage(smoothedCpu);

        const memoryMB = await getMemoryUsage();
        if (memoryMB >= 0) {
          setMemoryUsage(memoryMB);
        }

        const storageInfo = await getStorageInfo();
        if (storageInfo) {
          setStorageUsage(parseFloat(storageInfo.usedGB.toFixed(2)));
          setTotalStorageGB(parseFloat(storageInfo.totalGB.toFixed(2)));
        }

        if (isRecording) {
          const videoSize = await getRecordingVideoSize();
          setRecordingVideoSizeGB(videoSize);
        } else {
          setRecordingVideoSizeGB(0);
        }

        if (isRecording) {
          cpuStatsRef.current.push(smoothedCpu);
          memoryStatsRef.current.push(memoryMB >= 0 ? memoryMB / 1000 : 0);
        }
      } catch (error) {
        console.error('Error getting system stats:', error);
        const fallbackCpu = lastCpuRef.current || 0;
        setCpuUsage(fallbackCpu);
      }
    };

    updateSystemStats();
    // Update every 5 seconds to show recording video size
    const intervalId = setInterval(updateSystemStats, 5000);

    return () => clearInterval(intervalId);
  }, [isRecording, getRecordingVideoSize]);

  return {
    cpuUsage,
    memoryUsage,
    storageUsage,
    totalStorageGB,
    recordingVideoSizeGB,
    cpuStatsRef,
    memoryStatsRef,
    resetStats,
    setRecordingVideoPath,
  };
};
