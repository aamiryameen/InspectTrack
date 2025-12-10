import { useState, useEffect, useRef, useCallback } from 'react';
import { NativeModules, Platform } from 'react-native';
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

  const findRecordingFileInDirs = useCallback(async (): Promise<string | null> => {
    try {
      const tempDirs = Platform.OS === 'ios' 
        ? [
            `${RNFS.DocumentDirectoryPath}/Files/InspectTrack`,
            `${RNFS.CachesDirectoryPath}/Files/InspectTrack`,
            `${RNFS.DocumentDirectoryPath}/Files`,
            RNFS.CachesDirectoryPath,
            RNFS.TemporaryDirectoryPath,
            RNFS.DocumentDirectoryPath,
          ]
        : [
            RNFS.CachesDirectoryPath,
            RNFS.ExternalCachesDirectoryPath,
            RNFS.ExternalDirectoryPath,
            RNFS.DocumentDirectoryPath,
          ];

      let mostRecentFile: { path: string; mtime: number; size: number; ctime: number } | null = null;
      const currentTime = Date.now();
      const recordingStartTime = currentTime - 300000;

      for (const dir of tempDirs) {
        try {
          const dirExists = await RNFS.exists(dir);
          if (!dirExists) {
            continue;
          }

          let files;
          try {
            files = await RNFS.readDir(dir);
          } catch (readError) {
            continue;
          }
          
          const videoFiles = files.filter(file => {
            if (file.isDirectory) {
              return false;
            }
            const name = file.name.toLowerCase();
            return name.endsWith('.mp4') || 
                   name.endsWith('.mov') ||
                   name.endsWith('.m4v') ||
                   name.endsWith('.mpv');
          });
          
          for (const file of videoFiles) {
            try {
              const fileInfo = await RNFS.stat(file.path);
              const fileSize = fileInfo.size || 0;
              
              const minSize = Platform.OS === 'ios' ? 100 : 1000;
              if (fileSize < minSize) {
                continue;
              }
              
              const mtime = fileInfo.mtime || 0;
              const ctime = fileInfo.ctime || mtime;
              const timeSinceModified = currentTime - mtime;
              const timeSinceCreated = currentTime - ctime;
              
              const timeWindow = Platform.OS === 'ios' ? 300000 : 120000;
              const isRecent = (mtime > 0 && timeSinceModified < timeWindow) || 
                              (ctime > 0 && timeSinceCreated < timeWindow);
              
              if (isRecent && fileSize >= 0) {
                const timeScore = Math.max(mtime, ctime);
                const sizeScore = fileSize / 1000000;
                const score = timeScore + sizeScore;
                
                const currentScore = mostRecentFile 
                  ? Math.max(mostRecentFile.mtime, mostRecentFile.ctime) + (mostRecentFile.size / 1000000)
                  : 0;
                
                if (!mostRecentFile || score > currentScore) {
                  mostRecentFile = {
                    path: file.path,
                    mtime: mtime,
                    size: fileSize,
                    ctime: ctime,
                  };
                }
              }
            } catch (statError) {
              continue;
            }
          }
        } catch (error) {
          continue;
        }
      }

      return mostRecentFile?.path || null;
    } catch (error) {
      console.warn('Error in findRecordingFileInDirs:', error);
      return null;
    }
  }, []);

  const getRecordingVideoSize = useCallback(async (): Promise<number> => {
    try {
      let filePath = recordingVideoPathRef.current;
      
      if (!filePath) {
        filePath = await findRecordingFileInDirs();
        if (filePath) {
          recordingVideoPathRef.current = filePath;
        }
      } else {
        const fileExists = await RNFS.exists(filePath);
        if (!fileExists) {
          filePath = await findRecordingFileInDirs();
          if (filePath) {
            recordingVideoPathRef.current = filePath;
          } else {
            return 0;
          }
        }
      }

      if (!filePath) {
        filePath = await findRecordingFileInDirs();
        if (filePath) {
          recordingVideoPathRef.current = filePath;
        } else {
          return 0;
        }
      }

      try {
        const fileInfo = await RNFS.stat(filePath);
        const sizeBytes = fileInfo.size || 0;
        
        if (sizeBytes === 0) {
          const ctime = fileInfo.ctime || 0;
          const timeSinceCreated = Date.now() - ctime;
          if (timeSinceCreated > 5000) {
            return 0;
          }
        }
        
        const sizeGB = sizeBytes / (1024 * 1024 * 1024);
        return parseFloat(sizeGB.toFixed(4));
      } catch (statError) {
        const newPath = await findRecordingFileInDirs();
        if (newPath && newPath !== filePath) {
          recordingVideoPathRef.current = newPath;
          try {
            const fileInfo = await RNFS.stat(newPath);
            const sizeBytes = fileInfo.size || 0;
            const sizeGB = sizeBytes / (1024 * 1024 * 1024);
            return parseFloat(sizeGB.toFixed(4));
          } catch (e) {
            return 0;
          }
        }
        return 0;
      }
    } catch (error) {
      try {
        const newPath = await findRecordingFileInDirs();
        if (newPath) {
          recordingVideoPathRef.current = newPath;
          const fileInfo = await RNFS.stat(newPath);
          const sizeBytes = fileInfo.size || 0;
          if (sizeBytes >= 0) {
            const sizeGB = sizeBytes / (1024 * 1024 * 1024);
            return parseFloat(sizeGB.toFixed(4));
          }
        }
      } catch (findError) {
      }
      return 0;
    }
  }, [findRecordingFileInDirs]);

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
