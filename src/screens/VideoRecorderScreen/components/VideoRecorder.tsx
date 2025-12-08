import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Animated,
  Pressable,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, useCameraFormat } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import Orientation from 'react-native-orientation-locker';
import { getResolutionDimensions, RecordingSettings } from '../../../utils/settingsUtils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSystemMonitoring, useGyroscope, useLocationTracking, useRecordingTimer } from '../hooks';

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

  const camera = useRef<Camera>(null);
  const focusFadeAnim = useRef(new Animated.Value(0)).current;
  const recordingStartTime = useRef<number>(0);
  const recordingEndTime = useRef<number>(0);
  const startTimeRef = useRef<string>('');
  const endTimeRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);
  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRecordingPathRef = useRef<string | null>(null);
  const findFileIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { 
    cpuUsage, 
    memoryUsage, 
    storageUsage, 
    totalStorageGB,
    recordingVideoSizeGB,
    cpuStatsRef, 
    memoryStatsRef, 
    resetStats,
    setRecordingVideoPath
  } = useSystemMonitoring(isRecording);
  const { gyroDataRef, startGyroscopeDataCollection, stopGyroscopeDataCollection } = useGyroscope(settings);
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

    return () => {
      isMountedRef.current = false;
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
        layoutTimeoutRef.current = null;
      }
      Orientation.unlockAllOrientations();
    };
  }, []);

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

  const saveGyroscopeData = async (videoFileName: string) => {
    try {
      const gyroFileName = videoFileName.replace('.mp4', '_gyroscope.json');
      const gyroscopeData = {
        recordingStartTime: recordingStartTime.current,
        recordingEndTime: recordingEndTime.current,
        totalFrames: gyroDataRef.current.length,
        frameRate: settings.frameRate.fps,
        videoResolution: settings.video.resolution,
        timestampFormat: settings.metadata.timestampFormat,
        gyroscopePoints: gyroDataRef.current,
      };
      const gyroFilePath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${gyroFileName}`
        : `${RNFS.DownloadDirectoryPath}/${gyroFileName}`;
      await RNFS.writeFile(gyroFilePath, JSON.stringify(gyroscopeData, null, 2), 'utf8');
      return gyroFileName;
    } catch (error) {
      console.error('Error saving gyroscope data:', error);
      return null;
    }
  };

  const saveGPSData = async (videoFileName: string) => {
    try {
      const gpsFileName = videoFileName.replace('.mp4', '_gps.json');
      const gpsData = {
        recordingStartTime: recordingStartTime.current,
        recordingEndTime: recordingEndTime.current,
        totalFrames: gpsDataRef.current.length,
        frameRate: settings.frameRate.fps,
        videoResolution: settings.video.resolution,
        timestampFormat: settings.metadata.timestampFormat,
        gpsPoints: gpsDataRef.current,
      };
      const gpsFilePath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${gpsFileName}`
        : `${RNFS.DownloadDirectoryPath}/${gpsFileName}`;
      await RNFS.writeFile(gpsFilePath, JSON.stringify(gpsData, null, 2), 'utf8');
      return gpsFileName;
    } catch (error) {
      console.error('Error saving GPS data:', error);
      return null;
    }
  };

  const saveCameraSettings = async (videoFileName: string) => {
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
      const settingsFilePath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${settingsFileName}`
        : `${RNFS.DownloadDirectoryPath}/${settingsFileName}`;
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
      const timestamp = new Date().getTime();
      const fileName = `video_${timestamp}.mp4`;
      const destPath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${fileName}`
        : `${RNFS.DownloadDirectoryPath}/${fileName}`;
      await RNFS.moveFile(videoPath, destPath);
      const gpsFileName = await saveGPSData(fileName);
      const gyroscopeFileName = await saveGyroscopeData(fileName);
      const cameraSettingsFileName = await saveCameraSettings(fileName);

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

      const gpsFilePath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${gpsFileName}`
        : `${RNFS.DownloadDirectoryPath}/${gpsFileName}`;

      const gyroscopeFilePath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${gyroscopeFileName}`
        : `${RNFS.DownloadDirectoryPath}/${gyroscopeFileName}`;

      const cameraSettingsFilePath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${cameraSettingsFileName}`
        : `${RNFS.DownloadDirectoryPath}/${cameraSettingsFileName}`;

      const videoSaved = await verifyFileSaved(destPath, 'Video');
      const gpsSaved = await verifyFileSaved(gpsFilePath, 'GPS');
      const gyroSaved = await verifyFileSaved(gyroscopeFilePath, 'Gyroscope');
      const cameraSettingsSaved = await verifyFileSaved(cameraSettingsFilePath, 'Camera Settings');

      if (isMountedRef.current) {
        setIsProcessing(false);
        resetTimer();

        const saveLocation = Platform.OS === 'ios' ? 'Files app' : 'Downloads folder';
        const allSaved = videoSaved && gpsSaved && gyroSaved && cameraSettingsSaved;

        if (allSaved) {
          Alert.alert(
            'Recording Saved',
            `All files have been saved to ${saveLocation}!\n\n` +
            `📹 Video\n` +
            `📍 ${gpsDataRef.current.length} GPS points\n` +
            `🔄 ${gyroDataRef.current.length} Gyroscope points\n` +
            `⚙️ Camera settings`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Partial Save',
            'Some files may not have been saved correctly. Please check your storage.',
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
                   name.endsWith('.m4v');
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
      console.warn('Error finding recording file:', error);
      return null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isMountedRef.current || !camera.current) {
      Alert.alert('Error', 'Camera not ready');
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

      const now = new Date();
      startTimeRef.current = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      findFileIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current || !isRecording) {
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
                  console.log('📹 Found recording file:', recordingPath, 'Size:', fileSize, 'bytes');
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
          if (isMountedRef.current) {
            setRecordingVideoPath(null);
            currentRecordingPathRef.current = null;
            Alert.alert('Error', 'Failed to record video');
          }
          if (isMountedRef.current) {
            setIsRecording(false);
            stopTimer();
            stopGPSDataCollection();
            stopGyroscopeDataCollection();
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
      }
    }
  }, [startTimer, startGPSDataCollection, startGyroscopeDataCollection, resetStats, stopTimer, stopGPSDataCollection, stopGyroscopeDataCollection, handleVideoSave, findRecordingFile, setRecordingVideoPath]);

  const pauseRecording = useCallback(async () => {
    if (!isMountedRef.current || !camera.current) return;
    try {
      if (!isMountedRef.current) return;
      setIsProcessing(true);
      stopGPSDataCollection();
      stopGyroscopeDataCollection();
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
      }
    }
  }, [stopTimer, stopGPSDataCollection, stopGyroscopeDataCollection, setRecordingVideoPath]);

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
  }, [isRecording, navigation, stopTimer, stopGPSDataCollection, stopGyroscopeDataCollection, resetTimer, setRecordingVideoPath]);

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
          key={`${settings.video.resolution}-${settings.frameRate.fps}-${settings.camera.hdr}`}
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={true}
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
          storageUsage={storageUsage}
          totalStorageGB={totalStorageGB}
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

