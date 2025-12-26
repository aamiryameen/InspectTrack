import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Animated,
  Pressable,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, useCameraFormat } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import Orientation from 'react-native-orientation-locker';
import { getResolutionDimensions, RecordingSettings } from '../../../utils/settingsUtils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSystemMonitoring, useGyroscope, useAccelerometer, useMagnetometer, useLocationTracking, useRecordingTimer } from '../hooks';

import {
  RecordingBadge,
  StatsOverlay,
  InfoOverlay,
  BottomControls,
  FocusIndicator,
  PermissionPrompt,
} from './index';

type RootStackParamList = {
  Home: undefined;
  Recording: {
    settings: RecordingSettings;
    zoom: number;
  };
  Summary: {
    startTime: string;
    endTime: string;
    distance: number;
    duration: number;
    avgCPU: number;
    highestCPU: number;
    avgMemory: number;
    highestMemory: number;
    videoPath: string;
    gpsFilePath: string;
    gyroscopeFilePath: string;
    accelerometerFilePath: string;
    magnetometerFilePath: string;
    cameraSettingsFilePath: string;
    settings: RecordingSettings;
  };
};

interface VideoRecorderProps {
  settings: RecordingSettings;
  zoom: number;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ settings: initialSettings, zoom: initialZoom }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [settings, setSettings] = useState<RecordingSettings>(initialSettings);
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const cameraConfigTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const camera = useRef<Camera>(null);
  const focusFadeAnim = useRef(new Animated.Value(0)).current;
  const recordingStartTime = useRef<number>(0);
  const recordingEndTime = useRef<number>(0);
  const startTimeRef = useRef<string>('');
  const endTimeRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);
  const isRecordingRef = useRef<boolean>(false);
  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRecordingPathRef = useRef<string | null>(null);
  const findFileIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasRecordingBeforeBackgroundRef = useRef<boolean>(false);

  const {
    cpuUsage,
    memoryUsage,
    recordingVideoSizeGB,
    cpuStatsRef,
    memoryStatsRef,
    resetStats,
    setRecordingVideoPath
  } = useSystemMonitoring(isRecording);
  const { gyroDataRef, startGyroscopeDataCollection, stopGyroscopeDataCollection } = useGyroscope(settings);
  const { accelDataRef, startAccelerometerDataCollection, stopAccelerometerDataCollection } = useAccelerometer(settings);
  const { magnetometerDataRef, startMagnetometerDataCollection, stopMagnetometerDataCollection } = useMagnetometer(settings);
  const { gpsDataRef, totalDistanceRef, startGPSDataCollection, stopGPSDataCollection } = useLocationTracking(settings);
  const { recordingTime, pulseAnim, startTimer, stopTimer, resetTimer, formatTime } = useRecordingTimer(isRecording);

  const device = useCameraDevice('back');
  const resolution = getResolutionDimensions(settings.video.resolution);
  const format = useCameraFormat(device, [
    { videoResolution: resolution },
    { fps: settings.frameRate.fps }
  ]);
  const fps = format ? Math.min(format.maxFps, settings.frameRate.fps) : settings.frameRate.fps;
  const hdrEnabled = settings.camera.hdr && format?.supportsVideoHdr;
  const photoHdrEnabled = settings.camera.hdr && format?.supportsPhotoHdr;
  const manualExposureValue = (() => {
    if (settings.camera.exposureMode !== 'manual') return undefined;
    if (typeof settings.camera.exposure !== 'number') return undefined;
    const { exposure, exposureMin, exposureMax } = settings.camera;
    return Math.max(exposureMin, Math.min(exposure, exposureMax));
  })();

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();

  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom]);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  // Handle camera configuration changes - temporarily disable camera when props change
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // Don't disable camera if we're currently recording
    if (isRecordingRef.current) {
      return;
    }
    
    // Temporarily disable camera during configuration changes
    setIsCameraActive(false);
    
    // Clear any existing timeout
    if (cameraConfigTimeoutRef.current) {
      clearTimeout(cameraConfigTimeoutRef.current);
    }
    
    // Re-enable camera after a delay to allow configuration to complete
    cameraConfigTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && !isRecordingRef.current) {
        setIsCameraActive(true);
      }
    }, 300);
    
    return () => {
      if (cameraConfigTimeoutRef.current) {
        clearTimeout(cameraConfigTimeoutRef.current);
        cameraConfigTimeoutRef.current = null;
      }
    };
  }, [device, format, settings.video.resolution, settings.frameRate.fps, settings.camera.hdr, zoom]);

  useEffect(() => {
    isMountedRef.current = true;

    if (Platform.OS === 'ios') {
      requestAnimationFrame(() => {
        Orientation.lockToLandscape();
      });
    } else {
      Orientation.lockToLandscape();
    }

    checkPermissions();

    // Delay camera activation to ensure configuration is complete
    if (cameraConfigTimeoutRef.current) {
      clearTimeout(cameraConfigTimeoutRef.current);
    }
    cameraConfigTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsCameraActive(true);
      }
    }, 300);

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isMountedRef.current = false;
      subscription.remove();
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
        layoutTimeoutRef.current = null;
      }
      if (cameraConfigTimeoutRef.current) {
        clearTimeout(cameraConfigTimeoutRef.current);
        cameraConfigTimeoutRef.current = null;
      }
      Orientation.unlockAllOrientations();
    };
  }, []);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    const previousAppState = appStateRef.current;
    appStateRef.current = nextAppState;
    setAppState(nextAppState);

    if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
      // Delay camera activation to ensure configuration is complete
      if (cameraConfigTimeoutRef.current) {
        clearTimeout(cameraConfigTimeoutRef.current);
      }
      cameraConfigTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsCameraActive(true);
        }
      }, 300);

      if (wasRecordingBeforeBackgroundRef.current) {
      }

      wasRecordingBeforeBackgroundRef.current = false;
    }

    if (previousAppState === 'active' && nextAppState.match(/inactive|background/)) {
      if (isRecording) {
        wasRecordingBeforeBackgroundRef.current = true;
      } else {
        setIsCameraActive(false);
      }
    }
  }, [isRecording]);

  const checkPermissions = async () => {
    if (!hasCameraPermission) {
      await requestCameraPermission();
    }
    if (!hasMicrophonePermission) {
      await requestMicrophonePermission();
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);

        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          Alert.alert('Permissions Required', 'Please grant all permissions to use this feature');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const handleCameraLayout = useCallback((event: any) => {
    if (!event || !event.nativeEvent || !event.nativeEvent.layout) {
      return;
    }
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current);
      layoutTimeoutRef.current = null;
    }
    layoutTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }
      try {
        if (width > 0 && height > 0 && isMountedRef.current) {
          setCameraLayout({ width, height });
        }
      } catch (error) {
        console.error('Error handling camera layout:', error);
      }
    }, 100);
  }, []);

  const handleTapToFocus = useCallback(async (event: any) => {
    if (!isMountedRef.current || !settings.camera.tapToFocusEnabled || !device?.supportsFocus) {
      return;
    }
    const { locationX, locationY } = event.nativeEvent;
    if (locationX === undefined || locationY === undefined) {
      return;
    }
    if (!cameraLayout.width || !cameraLayout.height) {
      return;
    }
    if (!isMountedRef.current) {
      return;
    }
    setFocusPoint({ x: locationX, y: locationY });
    focusFadeAnim.setValue(1);
    Animated.timing(focusFadeAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }).start((finished) => {
      if (finished && isMountedRef.current) {
        setFocusPoint(null);
      }
    });
    if (camera.current && isMountedRef.current) {
      try {
        const normalizedX = locationX / cameraLayout.width;
        const normalizedY = locationY / cameraLayout.height;
        await camera.current.focus({
          x: normalizedX,
          y: normalizedY,
        });
      } catch (error) {
        console.error('Focus error:', error);
      }
    }
  }, [settings.camera.tapToFocusEnabled, device?.supportsFocus, cameraLayout, focusFadeAnim]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  };

  const ensureDirectory = async (dirPath: string) => {
    const exists = await RNFS.exists(dirPath);
    if (!exists) {
      await RNFS.mkdir(dirPath);
    }
  };

  const getLensState = (currentZoom: number) => {
    if (currentZoom >= 2.5) {
      return { lens_1x: 'Off', lens_2x: 'Off', lens_3x: 'On' };
    }
    if (currentZoom >= 1.5) {
      return { lens_1x: 'Off', lens_2x: 'On', lens_3x: 'Off' };
    }
    return { lens_1x: 'On', lens_2x: 'Off', lens_3x: 'Off' };
  };

  const saveSystemConfig = async (configFolderPath: string) => {
    const { lens_1x, lens_2x, lens_3x } = getLensState(zoom);
    const systemConfig = {
      recordingStartTime: recordingStartTime.current,
      recordingEndTime: recordingEndTime.current,
      lens_1x,
      lens_2x,
      lens_3x,
      GPS: 'On',
      Gyroscope: 'On',
      Accelerometer: 'On',
      Magnometer: 'On',
    };
    const systemConfigPath = `${configFolderPath}/System_config.json`;
    await RNFS.writeFile(systemConfigPath, JSON.stringify(systemConfig, null, 2), 'utf8');
    return systemConfigPath;
  };

  const saveSensorConfig = async (configFolderPath: string) => {
    const gpsHz = settings.gps.updateInterval > 0 ? (1 / settings.gps.updateInterval) : 0;
    const sensorConfig = {
      fps: settings.frameRate.fps,
      resolution: settings.video.resolution,
      exposure: settings.camera.exposure,
      exposureMin: settings.camera.exposureMin,
      exposureMax: settings.camera.exposureMax,
      iso: settings.camera.iso,
      hdr: settings.camera.hdr,
      tapToFocusEnabled: settings.camera.tapToFocusEnabled,
      Zoom: zoom,
      Gps: `${gpsHz || 0}Hz`,
      Accelerometer: '100Hz',
      Gyroscope: '100Hz',
      Magnometer: '100Hz',
    };
    const sensorConfigPath = `${configFolderPath}/Sensor_config.json`;
    await RNFS.writeFile(sensorConfigPath, JSON.stringify(sensorConfig, null, 2), 'utf8');
    return sensorConfigPath;
  };

  const saveSessionInfo = async (configFolderPath: string) => {
    const sessionInfo = {
      StartingTime: formatTimestamp(recordingStartTime.current || Date.now()),
      EndingTime: formatTimestamp(recordingEndTime.current || Date.now()),
      Status: 'Valid',
    };
    const sessionInfoPath = `${configFolderPath}/Session_info.json`;
    await RNFS.writeFile(sessionInfoPath, JSON.stringify(sessionInfo, null, 2), 'utf8');
    return sessionInfoPath;
  };

  const saveGyroscopeData = async (_videoFileName: string, folderPath: string) => {
    try {
      const gyroFileName = 'gyroscope.csv';
      const gyroFilePath = `${folderPath}/${gyroFileName}`;
      const header = 'timestamp,x,y,z\n';
      const rows = gyroDataRef.current
        .map(p => `${p.timestamp},${p.x},${p.y},${p.z}`)
        .join('\n');
      await RNFS.writeFile(gyroFilePath, header + rows, 'utf8');
      return gyroFileName;
    } catch (error) {
      console.error('Error saving gyroscope data:', error);
      return null;
    }
  };

  const saveAccelerometerData = async (_videoFileName: string, folderPath: string) => {
    try {
      const accelFileName = 'accelerometer.csv';
      const accelFilePath = `${folderPath}/${accelFileName}`;
      const header = 'timestamp,x,y,z\n';
      const rows = accelDataRef.current
        .map(p => `${p.timestamp},${p.x},${p.y},${p.z}`)
        .join('\n');
      await RNFS.writeFile(accelFilePath, header + rows, 'utf8');
      return accelFileName;
    } catch (error) {
      console.error('Error saving accelerometer data:', error);
      return null;
    }
  };

  const saveMagnetometerData = async (_videoFileName: string, folderPath: string) => {
    try {
      const magnetometerFileName = 'magnometer.csv';
      const magnetometerFilePath = `${folderPath}/${magnetometerFileName}`;
      const header = 'timestamp,x,y,z\n';
      const rows = magnetometerDataRef.current
        .map(p => `${p.timestamp},${p.x},${p.y},${p.z}`)
        .join('\n');
      await RNFS.writeFile(magnetometerFilePath, header + rows, 'utf8');
      return magnetometerFileName;
    } catch (error) {
      console.error('Error saving magnetometer data:', error);
      return null;
    }
  };

  const saveGPSData = async (_videoFileName: string, folderPath: string) => {
    try {
      const gpsFileName = 'gps.csv';
      const gpsFilePath = `${folderPath}/${gpsFileName}`;
      const header = 'timestamp,latitude,longitude,speed,heading\n';
      const gpsCsvRows = gpsDataRef.current
        // @ts-ignore: gpsDataRef points include latitude/longitude/speed/heading
        .map(p => `${p.timestamp},${p.latitude},${p.longitude},${p.speed ?? ''},${p.heading ?? ''}`)
        .join('\n');
      await RNFS.writeFile(gpsFilePath, header + gpsCsvRows, 'utf8');
      return gpsFileName;
    } catch (error) {
      console.error('Error saving GPS data:', error);
      return null;
    }
  };

  const saveCameraSettings = async (videoFileName: string, folderPath: string) => {
    try {
      const settingsFileName = videoFileName.replace('.mp4', '_camera_settings.json');
      const cameraSettingsData = {
        recordingStartTime: recordingStartTime.current,
        recordingEndTime: recordingEndTime.current,
        fps: settings.frameRate.fps,
        resolution: settings.video.resolution,
        exposure: settings.camera.exposure,
        exposureMin: settings.camera.exposureMin,
        exposureMax: settings.camera.exposureMax,
        iso: settings.camera.iso,
        hdr: settings.camera.hdr,
        tapToFocusEnabled: settings.camera.tapToFocusEnabled,
        zoom: zoom,
        lens: `${zoom}x`,
      };
      const settingsFilePath = `${folderPath}/${settingsFileName}`;
      await RNFS.writeFile(settingsFilePath, JSON.stringify(cameraSettingsData, null, 2), 'utf8');
      return settingsFileName;
    } catch (error) {
      console.error('Error saving camera settings:', error);
      return null;
    }
  };

  const verifyFileSaved = async (filePath: string, fileType: string): Promise<boolean> => {
    try {
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        console.error(`${fileType} file not found:`, filePath);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`Error verifying ${fileType}:`, error);
      return false;
    }
  };

  const handleVideoSave = useCallback(async (videoPath: string) => {
    try {
      const sessionStartTime = recordingStartTime.current || Date.now();

      const baseDir = Platform.OS === 'ios'
        ? RNFS.DocumentDirectoryPath
        : RNFS.DownloadDirectoryPath;

      // Use app container (InspectTrack) as the single parent folder
      const sessionFolderName = `Session_${formatTimestamp(sessionStartTime)}`;
      const sessionFolderPath = `${baseDir}/${sessionFolderName}`;
      const configFolderPath = `${sessionFolderPath}/Config`;
      const insFolderPath = `${sessionFolderPath}/ins`;

      await ensureDirectory(sessionFolderPath);
      await ensureDirectory(configFolderPath);
      await ensureDirectory(insFolderPath);

      const fileName = `video_${sessionStartTime}.mp4`;
      const destPath = `${sessionFolderPath}/${fileName}`;
      await RNFS.moveFile(videoPath, destPath);
      console.log(`✅ Video saved to: ${destPath}`);

      const gpsFileName = await saveGPSData(fileName, insFolderPath);
      const gyroscopeFileName = await saveGyroscopeData(fileName, insFolderPath);
      const accelerometerFileName = await saveAccelerometerData(fileName, insFolderPath);
      const magnetometerFileName = await saveMagnetometerData(fileName, insFolderPath);
      const systemConfigPath = await saveSystemConfig(configFolderPath);
      const sensorConfigPath = await saveSensorConfig(configFolderPath);
      const sessionInfoPath = await saveSessionInfo(configFolderPath);
      const folderName = sessionFolderName;

      const avgCPU = cpuStatsRef.current.length > 0
        ? Math.round(cpuStatsRef.current.reduce((a, b) => a + b, 0) / cpuStatsRef.current.length)
        : 0;

      const highestCPU = cpuStatsRef.current.length > 0
        ? Math.round(Math.max(...cpuStatsRef.current))
        : 0;

      const avgMemory = memoryStatsRef.current.length > 0
        ? memoryStatsRef.current.reduce((a, b) => a + b, 0) / memoryStatsRef.current.length
        : 0;

      const highestMemory = memoryStatsRef.current.length > 0
        ? Math.max(...memoryStatsRef.current)
        : 0;

      const actualDuration = recordingEndTime.current > 0 && recordingStartTime.current > 0
        ? Math.round((recordingEndTime.current - recordingStartTime.current) / 1000)
        : recordingTime;

      const savedDuration = actualDuration;
      const savedDistance = totalDistanceRef.current;

      const gpsFilePath = gpsFileName ? `${insFolderPath}/${gpsFileName}` : '';
      const gyroscopeFilePath = gyroscopeFileName ? `${insFolderPath}/${gyroscopeFileName}` : '';
      const accelerometerFilePath = accelerometerFileName ? `${insFolderPath}/${accelerometerFileName}` : '';
      const magnetometerFilePath = magnetometerFileName ? `${insFolderPath}/${magnetometerFileName}` : '';
      const cameraSettingsFilePath = sensorConfigPath;

      const videoSaved = await verifyFileSaved(destPath, 'Video');
      const gpsSaved = gpsFilePath ? await verifyFileSaved(gpsFilePath, 'GPS') : false;
      const gyroSaved = gyroscopeFilePath ? await verifyFileSaved(gyroscopeFilePath, 'Gyroscope') : false;
      const accelSaved = accelerometerFilePath ? await verifyFileSaved(accelerometerFilePath, 'Accelerometer') : false;
      const magnetometerSaved = magnetometerFilePath ? await verifyFileSaved(magnetometerFilePath, 'Magnetometer') : false;
      const systemConfigSaved = await verifyFileSaved(systemConfigPath, 'System Config');
      const sensorConfigSaved = await verifyFileSaved(sensorConfigPath, 'Sensor Config');
      const sessionInfoSaved = await verifyFileSaved(sessionInfoPath, 'Session Info');

      if (isMountedRef.current) {
        setIsProcessing(false);
        resetTimer();

        const saveLocation = Platform.OS === 'ios' ? 'Files app' : 'Downloads folder';
        const allSaved = videoSaved && gpsSaved && gyroSaved && accelSaved && magnetometerSaved && systemConfigSaved && sensorConfigSaved && sessionInfoSaved;

        if (allSaved) {
          Alert.alert(
            'Recording Saved',
            `All files have been saved to:\n${folderName}\n\n` +
            `📁 Location: ${saveLocation}/${folderName}\n\n` +
            `📹 Video\n` +
            `📍 ${gpsDataRef.current.length} GPS points\n` +
            `🔄 ${gyroDataRef.current.length} Gyroscope points\n` +
            `📊 ${accelDataRef.current.length} Accelerometer points\n` +
            `🧲 ${magnetometerDataRef.current.length} Magnetometer points\n` +
            `⚙️ Camera settings`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Partial Save',
            `Some files may not have been saved correctly.\nFolder: ${folderName}\nPlease check your storage.`,
            [{ text: 'OK' }]
          );
        }

        setTimeout(() => {
          if (isMountedRef.current) {
            navigation.navigate('Summary', {
              startTime: startTimeRef.current,
              endTime: endTimeRef.current,
              distance: savedDistance,
              duration: savedDuration,
              avgCPU,
              highestCPU,
              avgMemory,
              highestMemory,
              videoPath: destPath,
              gpsFilePath: gpsFilePath,
              gyroscopeFilePath: gyroscopeFilePath,
              accelerometerFilePath: accelerometerFilePath,
              magnetometerFilePath: magnetometerFilePath,
              cameraSettingsFilePath: cameraSettingsFilePath,
              settings: settings,
            });
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Save video error:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to save files. Please try again.');
        setIsProcessing(false);
      }
    }
  }, [settings, recordingTime, navigation, resetTimer]);

  const findRecordingFile = useCallback(async (): Promise<string | null> => {
    try {
      const tempDirs = Platform.OS === 'ios'
        ? [
            RNFS.DocumentDirectoryPath,
            RNFS.CachesDirectoryPath,
            RNFS.TemporaryDirectoryPath,
          ]
        : [
            RNFS.CachesDirectoryPath,
            RNFS.ExternalCachesDirectoryPath,
            RNFS.ExternalDirectoryPath,
            RNFS.DocumentDirectoryPath,
          ];

      let mostRecentFile: { path: string; mtime: number; size: number; ctime: number } | null = null;
      const currentTime = Date.now();

      for (const dir of tempDirs) {
        try {
          const dirExists = await RNFS.exists(dir);
          if (!dirExists) continue;

          let files;
          try {
            files = await RNFS.readDir(dir);
          } catch (readError) {
            continue;
          }

          const videoFiles = files.filter(file => {
            if (file.isDirectory()) return false;
            const name = file.name.toLowerCase();
            return name.endsWith('.mp4') ||
                   name.endsWith('.mov') ||
                   name.endsWith('.m4v') ||
                   (name.startsWith('video_') && !name.includes('.'));
          });

          if (videoFiles.length > 0) {
            console.log(`📂 Found ${videoFiles.length} video file(s) in:`, dir);
          }

          for (const file of videoFiles) {
            try {
              const fileInfo = await RNFS.stat(file.path);
              const fileSize = fileInfo.size || 0;
              const minSize = Platform.OS === 'ios' ? 100 : 1000;
              if (fileSize < minSize) continue;

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
      return null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isMountedRef.current || !camera.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }
    
    if (!device || !format) {
      Alert.alert('Error', 'Camera device not available. Please try again.');
      return;
    }
    
    try {
      if (!isMountedRef.current) return;
      const synchronizedStartTime = Date.now();
      recordingStartTime.current = synchronizedStartTime;
      recordingEndTime.current = 0;
      setIsRecording(true);
      resetStats();
      startTimer(synchronizedStartTime);
      startGPSDataCollection(synchronizedStartTime);
      startGyroscopeDataCollection(synchronizedStartTime);
      startAccelerometerDataCollection(synchronizedStartTime);
      startMagnetometerDataCollection(synchronizedStartTime);

      const now = new Date();
      startTimeRef.current = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      isRecordingRef.current = true;

      findFileIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current || !isRecordingRef.current) {
          if (findFileIntervalRef.current) {
            clearInterval(findFileIntervalRef.current);
            findFileIntervalRef.current = null;
          }
          return;
        }
        try {
          const recordingPath = await findRecordingFile();
          if (recordingPath && isMountedRef.current) {
            try {
              const fileInfo = await RNFS.stat(recordingPath);
              const fileSize = fileInfo.size || 0;
              const mtime = fileInfo.mtime || 0;
              const ctime = fileInfo.ctime || mtime;
              const currentTime = Date.now();
              const timeSinceModified = currentTime - mtime;
              const timeSinceCreated = currentTime - ctime;
              const timeWindow = Platform.OS === 'ios' ? 300000 : 120000;
              const isRecent = (mtime > 0 && timeSinceModified < timeWindow) || 
                              (ctime > 0 && timeSinceCreated < timeWindow);
              if (isRecent && fileSize >= 0) {
                if (currentRecordingPathRef.current !== recordingPath) {
                  currentRecordingPathRef.current = recordingPath;
                  setRecordingVideoPath(recordingPath);
                } else {
                  setRecordingVideoPath(recordingPath);
                }
              }
            } catch (statError) {
            }
          }
        } catch (error) {
        }
      }, Platform.OS === 'ios' ? 500 : 1000);

      camera.current.startRecording({
        onRecordingFinished: async (video) => {
          if (findFileIntervalRef.current) {
            clearInterval(findFileIntervalRef.current);
            findFileIntervalRef.current = null;
          }
          if (isMountedRef.current) {
            setRecordingVideoPath(null);
            currentRecordingPathRef.current = null;
            await handleVideoSave(video.path);
          }
        },
        onRecordingError: (error) => {
          if (findFileIntervalRef.current) {
            clearInterval(findFileIntervalRef.current);
            findFileIntervalRef.current = null;
          }
          console.error('Recording error:', error);

          const errorMessage = String(error?.message || '');
          const isBackgroundRelatedError = errorMessage.toLowerCase().includes('session') ||
                                          errorMessage.toLowerCase().includes('interrupted') ||
                                          errorMessage.toLowerCase().includes('background');

          if (isBackgroundRelatedError && wasRecordingBeforeBackgroundRef.current) {
            return;
          }

          const displayErrorMessage = 'Failed to record video. Please check camera permissions and try again.';

          if (isMountedRef.current) {
            setRecordingVideoPath(null);
            currentRecordingPathRef.current = null;
            Alert.alert('Recording Error', displayErrorMessage, [
              {
                text: 'OK',
                onPress: () => {
                  if (isMountedRef.current) {
                    setIsRecording(false);
                    stopTimer();
                    stopGPSDataCollection();
                    stopGyroscopeDataCollection();
                    stopAccelerometerDataCollection();
                    stopMagnetometerDataCollection();
                  }
                }
              }
            ]);
          }

          if (isMountedRef.current) {
            setIsRecording(false);
            stopTimer();
            stopGPSDataCollection();
            stopGyroscopeDataCollection();
            stopAccelerometerDataCollection();
            stopMagnetometerDataCollection();
          }
        },
      });
    } catch (error) {
      if (findFileIntervalRef.current) {
        clearInterval(findFileIntervalRef.current);
        findFileIntervalRef.current = null;
      }
      console.error('Start recording error:', error);
      if (isMountedRef.current) {
        setRecordingVideoPath(null);
        currentRecordingPathRef.current = null;
        Alert.alert('Error', 'Failed to start recording');
      }
      if (isMountedRef.current) {
        setIsRecording(false);
        stopTimer();
        stopGPSDataCollection();
        stopGyroscopeDataCollection();
        stopAccelerometerDataCollection();
        stopMagnetometerDataCollection();
      }
    }
      }, [startTimer, startGPSDataCollection, startGyroscopeDataCollection, startAccelerometerDataCollection, startMagnetometerDataCollection, resetStats, stopTimer, stopGPSDataCollection, stopGyroscopeDataCollection, stopAccelerometerDataCollection, stopMagnetometerDataCollection, handleVideoSave, findRecordingFile, setRecordingVideoPath, device, format]);

  const pauseRecording = useCallback(async () => {
    if (!isMountedRef.current || !camera.current) return;
    try {
      if (!isMountedRef.current) return;
      isRecordingRef.current = false;
      setIsProcessing(true);
      stopGPSDataCollection();
      stopGyroscopeDataCollection();
      stopAccelerometerDataCollection();
      stopMagnetometerDataCollection();
      recordingEndTime.current = Date.now();
      const now = new Date();
      endTimeRef.current = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      if (findFileIntervalRef.current) {
        clearInterval(findFileIntervalRef.current);
        findFileIntervalRef.current = null;
      }
      setRecordingVideoPath(null);
      currentRecordingPathRef.current = null;
      await camera.current.stopRecording();
      if (isMountedRef.current) {
        setIsRecording(false);
        stopTimer();
      }
    } catch (error) {
      console.error('Pause recording error:', error);
      if (findFileIntervalRef.current) {
        clearInterval(findFileIntervalRef.current);
        findFileIntervalRef.current = null;
      }
      if (isMountedRef.current) {
        setRecordingVideoPath(null);
        currentRecordingPathRef.current = null;
        Alert.alert('Error', 'Failed to stop recording');
        setIsProcessing(false);
        stopGPSDataCollection();
        stopGyroscopeDataCollection();
        stopAccelerometerDataCollection();
        stopMagnetometerDataCollection();
      }
    }
  }, [stopTimer, stopGPSDataCollection, stopGyroscopeDataCollection, stopAccelerometerDataCollection, stopMagnetometerDataCollection, setRecordingVideoPath]);

  const handleRecordPress = useCallback(() => {
    if (isRecording) {
      pauseRecording();
    } else {
      startRecording();
    }
  }, [isRecording, pauseRecording, startRecording]);

  const handleClosePress = useCallback(() => {
    if (isRecording) {
      Alert.alert('Cancel Recording', 'Do you want to stop and discard the current recording?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              if (findFileIntervalRef.current) {
                clearInterval(findFileIntervalRef.current);
                findFileIntervalRef.current = null;
              }
              if (camera.current) {
                await camera.current.stopRecording();
              }
              setRecordingVideoPath(null);
              currentRecordingPathRef.current = null;
              stopTimer();
              stopGPSDataCollection();
              stopGyroscopeDataCollection();
              stopAccelerometerDataCollection();
              stopMagnetometerDataCollection();
              setIsRecording(false);
              resetTimer();
              navigation.goBack();
            } catch (error) {
              console.error('Error stopping recording:', error);
              if (findFileIntervalRef.current) {
                clearInterval(findFileIntervalRef.current);
                findFileIntervalRef.current = null;
              }
              setRecordingVideoPath(null);
              currentRecordingPathRef.current = null;
              navigation.goBack();
            }
          }
        }
      ]);
    } else {
      navigation.goBack();
    }
  }, [isRecording, navigation, stopTimer, stopGPSDataCollection, stopGyroscopeDataCollection, stopAccelerometerDataCollection, stopMagnetometerDataCollection, resetTimer, setRecordingVideoPath]);

  if (!device || !hasCameraPermission || !hasMicrophonePermission) {
    return (
      <PermissionPrompt
        hasDevice={!!device}
        hasCameraPermission={hasCameraPermission}
        hasMicrophonePermission={hasMicrophonePermission}
        onRequestPermissions={checkPermissions}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleTapToFocus}
        onLayout={handleCameraLayout}
      >
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={isCameraActive}
          photo={true}
          video={true}
          audio={true}
          format={format}
          fps={fps}
          zoom={zoom}
          videoHdr={hdrEnabled}
          photoHdr={photoHdrEnabled}
          exposure={manualExposureValue}
        />

        <FocusIndicator
          focusPoint={focusPoint}
          opacity={focusFadeAnim}
          enabled={settings.camera.tapToFocusEnabled}
        />
      </Pressable>

      <View style={styles.overlay} pointerEvents="box-none">
        <RecordingBadge
          isRecording={isRecording}
          pulseAnim={pulseAnim}
          formattedTime={formatTime(recordingTime)}
        />

        <StatsOverlay
          cpuUsage={cpuUsage}
          memoryUsage={memoryUsage}
          recordingVideoSizeGB={recordingVideoSizeGB}
          isRecording={isRecording}
        />

        <InfoOverlay
          resolution={settings.video.resolution}
          fps={fps}
          hdrEnabled={hdrEnabled || false}
        />

        <BottomControls
          isRecording={isRecording}
          isProcessing={isProcessing}
          onRecordPress={handleRecordPress}
          onClosePress={handleClosePress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default VideoRecorder;
