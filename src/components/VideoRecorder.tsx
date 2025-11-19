import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, useCameraFormat } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import { gyroscope } from 'react-native-sensors';
import Geolocation from '@react-native-community/geolocation';
import Orientation from 'react-native-orientation-locker';
import DeviceInfo from 'react-native-device-info';
import { getResolutionDimensions, RecordingSettings } from '../utils/settingsUtils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  responsiveFontSize,
  responsiveSpacing,
  scale as responsiveScale,
  verticalScale,
} from '../utils/responsive';

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
  const camera = useRef<Camera>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [cpuUsage, setCpuUsage] = useState(77);
  const [memoryUsage, setMemoryUsage] = useState(23);
  const [storageUsage, setStorageUsage] = useState(3.76);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gyroSubscription = useRef<any>(null);
  const locationWatchId = useRef<number | null>(null);
  const gpsDataRef = useRef<Array<{ timestamp: string; /* elapsedMs: string; */ latitude: number; longitude: number; accuracy?: number }>>([]);
  const gpsCollectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const systemMonitoringInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTime = useRef<number>(0);
  const previousGyroData = useRef({ x: 0, y: 0, z: 0 });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Stats tracking
  const cpuStatsRef = useRef<number[]>([]);
  const memoryStatsRef = useRef<number[]>([]);
  const startTimeRef = useRef<string>('');
  const endTimeRef = useRef<string>('');
  const totalDistanceRef = useRef<number>(0);

  const device = useCameraDevice('back');
  const resolution = getResolutionDimensions(settings.video.resolution);

  const format = useCameraFormat(device, [
    { videoResolution: resolution },
    { fps: settings.frameRate.fps }
  ]);

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();

  useEffect(() => {
    Orientation.lockToLandscape();
    checkPermissions();
    startGyroscope();
    startLocationTracking();
    systemMonitoringInterval.current = startSystemMonitoring();

    return () => {
      Orientation.unlockAllOrientations();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (gyroSubscription.current) {
        gyroSubscription.current.unsubscribe();
      }
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
      }
      if (gpsCollectionInterval.current) {
        clearInterval(gpsCollectionInterval.current);
      }
      if (systemMonitoringInterval.current) {
        clearInterval(systemMonitoringInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startSystemMonitoring = () => {
    const updateSystemStats = async () => {
      try {
        const totalRAM = await DeviceInfo.getTotalMemory();
        const usedMemory = await DeviceInfo.getUsedMemory();
        const usedMemoryMB = Math.round(usedMemory / (1024 * 1024));
        
        const freeDiskStorage = await DeviceInfo.getFreeDiskStorage();
        const totalDiskCapacity = await DeviceInfo.getTotalDiskCapacity();
        const usedStorage = (totalDiskCapacity - freeDiskStorage) / (1024 * 1024 * 1024);
        
        const memoryUsagePercent = (usedMemory / totalRAM) * 100;
        const estimatedCpu = Math.min(95, Math.max(30, memoryUsagePercent * 0.8 + (Math.random() * 20)));
        
        setCpuUsage(Math.round(estimatedCpu));
        setMemoryUsage(usedMemoryMB);
        setStorageUsage(parseFloat(usedStorage.toFixed(2)));
        
        if (isRecording) {
          cpuStatsRef.current.push(estimatedCpu);
          memoryStatsRef.current.push(usedMemoryMB / 1000);
        }
      } catch (error) {
        console.error('Error getting system stats:', error);
        const fallbackCpu = Math.min(95, Math.max(45, cpuUsage + (Math.random() - 0.5) * 10));
        const fallbackMemory = Math.min(500, Math.max(100, memoryUsage + (Math.random() - 0.5) * 50));
        setCpuUsage(Math.round(fallbackCpu));
        setMemoryUsage(Math.round(fallbackMemory));
      }
    };
    
    updateSystemStats();
    const intervalId = setInterval(updateSystemStats, 2000);
    return intervalId;
  };

  const startGyroscope = () => {
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
  };

  const startLocationTracking = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return;
      }
    }

    const enableHighAccuracy = settings.gps.accuracy === 'high';
    const distanceFilter = settings.gps.distanceFilter;
    const interval = settings.gps.updateInterval * 1000;

    locationWatchId.current = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setLocation({ latitude, longitude, address });
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy, distanceFilter, interval }
    );
  };

  const startGPSDataCollection = () => {
    if (!settings.metadata.gpsSync) return;

    gpsDataRef.current = [];
    recordingStartTime.current = Date.now();
    totalDistanceRef.current = 0;

    const samplingInterval = settings.gps.updateInterval * 1000;
    const enableHighAccuracy = settings.gps.accuracy === 'high';

    gpsCollectionInterval.current = setInterval(() => {
      Geolocation.getCurrentPosition(
        (position) => {
          const elapsedMilliseconds = Date.now() - recordingStartTime.current;
          
          // Convert to Eastern Time (America/New_York timezone) in date and time format
          const currentTime = new Date();
          const etcTimestamp = currentTime.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });

          // Convert elapsedMs to time format (HH:MM:SS.mmm)
          // const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
          // const hours = Math.floor(totalSeconds / 3600);
          // const minutes = Math.floor((totalSeconds % 3600) / 60);
          // const seconds = totalSeconds % 60;
          // const milliseconds = elapsedMilliseconds % 1000;
          // const elapsedMsFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;

          const { latitude, longitude, accuracy } = position.coords;

          if (gpsDataRef.current.length > 0) {
            const prevPoint = gpsDataRef.current[gpsDataRef.current.length - 1];
            const distance = calculateDistance(
              prevPoint.latitude,
              prevPoint.longitude,
              latitude,
              longitude
            );
            totalDistanceRef.current += distance;
          }

          gpsDataRef.current.push({
            timestamp: etcTimestamp, // Eastern Time in MM/DD/YYYY, HH:MM:SS format
            // elapsedMs: elapsedMsFormatted, // Elapsed time since recording started in HH:MM:SS.mmm format
            latitude,
            longitude,
            accuracy,
          });
        },
        (error) => console.error('GPS collection error:', error),
        { enableHighAccuracy, timeout: 20000, maximumAge: 0 }
      );
    }, samplingInterval);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const stopGPSDataCollection = () => {
    if (gpsCollectionInterval.current) {
      clearInterval(gpsCollectionInterval.current);
      gpsCollectionInterval.current = null;
    }
  };

  const saveGPSData = async (videoFileName: string) => {
    try {
      const gpsFileName = videoFileName.replace('.mp4', '_gps.json');

      const startTimeDate = new Date(recordingStartTime.current);
      const recordingStartTimeFormatted = startTimeDate.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const gpsData = {
        recordingStartTime: recordingStartTimeFormatted,
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
      console.log(`GPS data saved: ${gpsFileName} with ${gpsDataRef.current.length} points`);

      return gpsFileName;
    } catch (error) {
      console.error('Error saving GPS data:', error);
      return null;
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'InspectTrack/1.0',
          },
        }
      );
      const data = await response.json();
      return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

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

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!camera.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setIsRecording(true);
      startTimer();
      startGPSDataCollection();
      
      cpuStatsRef.current = [];
      memoryStatsRef.current = [];
      
      const now = new Date();
      startTimeRef.current = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });

      await camera.current.startRecording({
        onRecordingFinished: async (video) => {
          await handleVideoSave(video.path);
        },
        onRecordingError: (error) => {
          console.error('Recording error:', error);
          Alert.alert('Error', 'Failed to record video');
          setIsRecording(false);
          stopTimer();
          stopGPSDataCollection();
        },
      });
    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
      stopTimer();
      stopGPSDataCollection();
    }
  };

  const pauseRecording = async () => {
    if (!camera.current) return;

    try {
      setIsProcessing(true);
      stopGPSDataCollection();
      
      const now = new Date();
      endTimeRef.current = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      
      await camera.current.stopRecording();
      setIsRecording(false);
      stopTimer();
    } catch (error) {
      console.error('Pause recording error:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsProcessing(false);
      stopGPSDataCollection();
    }
  };

  const handleVideoSave = async (videoPath: string) => {
    try {
      const timestamp = new Date().getTime();
      const fileName = `video_${timestamp}.mp4`;

      const destPath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${fileName}`
        : `${RNFS.DownloadDirectoryPath}/${fileName}`;

      await RNFS.moveFile(videoPath, destPath);

      const gpsFileName = await saveGPSData(fileName);

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

      const savedDuration = recordingTime;

      setIsProcessing(false);
      setRecordingTime(0);

      navigation.navigate('Summary', {
        startTime: startTimeRef.current,
        endTime: endTimeRef.current,
        distance: totalDistanceRef.current,
        duration: savedDuration,
        avgCPU,
        highestCPU,
        avgMemory,
        highestMemory,
        videoPath: destPath,
      });

      console.log('Video and GPS data saved successfully');
      console.log(`GPS data: ${gpsFileName} (${gpsDataRef.current.length} points)`);
    } catch (error) {
      console.error('Save video error:', error);
      Alert.alert('Error', 'Failed to download video. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!device || !hasCameraPermission || !hasMicrophonePermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            {!device ? 'No camera device found' : 'Camera permissions required'}
          </Text>
          {!hasCameraPermission || !hasMicrophonePermission ? (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={checkPermissions}
            >
              <Text style={styles.permissionButtonText}>Grant Permissions</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={true}
        video={true}
        audio={true}
        format={format}
        zoom={zoom}
      />

      <View style={styles.overlay}>
        {isRecording && (
          <View style={styles.recordingBadge}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>
        )}

        <View style={styles.leftSidebar}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CPU</Text>
            <Text style={styles.statValue}>{Math.round(cpuUsage)}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${cpuUsage}%`, backgroundColor: '#10B981' }]} />
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>MEMORY</Text>
            <Text style={styles.statValue}>{Math.round(memoryUsage)} Mb</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(memoryUsage / 50) * 100}%`, backgroundColor: '#10B981' }]} />
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>STORAGE</Text>
            <Text style={styles.statValue}>{storageUsage.toFixed(2)}</Text>
            <Text style={styles.statUnit}>GB</Text>
          </View>
        </View>

        <View style={styles.rightSidebar}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>RESOLUTION</Text>
            <Text style={styles.infoValue}>{settings.video.resolution}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>FPS</Text>
            <Text style={styles.infoValue}>{settings.frameRate.fps}</Text>
          </View>

          <View style={styles.hdrBadge}>
            <Text style={styles.hdrIcon}>☀</Text>
            <Text style={styles.hdrText}>HDR ON</Text>
          </View>
        </View>

        <View style={styles.bottomControls}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#FF3B30" />
                <Text style={styles.processingText}>Saving...</Text>
              </View>
            ) : (
            <>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  if (isRecording) {
                    Alert.alert('Cancel Recording', 'Do you want to stop and discard the current recording?', [
                      { text: 'No', style: 'cancel' },
                      { 
                        text: 'Yes', 
                        onPress: async () => {
                          try {
                            if (camera.current) {
                              await camera.current.stopRecording();
                            }
                            stopTimer();
                            stopGPSDataCollection();
                            setIsRecording(false);
                            setRecordingTime(0);
                            navigation.goBack();
                          } catch (error) {
                            console.error('Error stopping recording:', error);
                            navigation.goBack();
                          }
                        }
                      }
                    ]);
                  } else {
                    navigation.goBack();
                  }
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

                <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                  onPress={isRecording ? pauseRecording : startRecording}
                  disabled={isProcessing}
                >
                <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]} />
                </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.hiddenDataCollection} />
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
  recordingBadge: {
    position: 'absolute',
    top: responsiveSpacing(15),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: responsiveSpacing(12),
    paddingVertical: responsiveSpacing(6),
    borderRadius: responsiveSpacing(6),
    gap: responsiveSpacing(6),
  },
  recordingDot: {
    width: responsiveScale(8),
    height: responsiveScale(8),
    borderRadius: responsiveScale(4),
    backgroundColor: '#FFF',
  },
  recordingText: {
    color: '#FFF',
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
  },
  leftSidebar: {
    position: 'absolute',
    left: responsiveSpacing(15),
    top: responsiveSpacing(15),
    gap: responsiveSpacing(10),
  },
  statCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: responsiveSpacing(10),
    padding: responsiveSpacing(10),
    minWidth: responsiveScale(120),
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: responsiveFontSize(8),
    fontWeight: '600',
    marginBottom: responsiveSpacing(4),
    letterSpacing: 0.6,
  },
  statValue: {
    color: '#FFF',
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    marginBottom: responsiveSpacing(6),
  },
  statUnit: {
    color: '#94A3B8',
    fontSize: responsiveFontSize(10),
    fontWeight: '500',
    marginTop: responsiveSpacing(-4),
  },
  progressBar: {
    height: responsiveSpacing(4),
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: responsiveSpacing(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: responsiveSpacing(2),
  },
  rightSidebar: {
    position: 'absolute',
    right: responsiveSpacing(15),
    top: responsiveSpacing(15),
    gap: responsiveSpacing(10),
    alignItems: 'flex-end',
  },
  infoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: responsiveSpacing(8),
    padding: responsiveSpacing(10),
    minWidth: responsiveScale(85),
    alignItems: 'center',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: responsiveFontSize(7.5),
    fontWeight: '600',
    marginBottom: responsiveSpacing(3),
    letterSpacing: 0.6,
  },
  infoValue: {
    color: '#FFF',
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
  },
  hdrBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    borderRadius: responsiveSpacing(8),
    paddingHorizontal: responsiveSpacing(10),
    paddingVertical: responsiveSpacing(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpacing(5),
  },
  hdrIcon: {
    fontSize: responsiveFontSize(11),
  },
  hdrText: {
    color: '#FFF',
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
  },
  bottomControls: {
    position: 'absolute',
    bottom: responsiveSpacing(20),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpacing(5),
  },
  closeButton: {
    width:30,
    height: 30,
    borderRadius: responsiveScale(17.5),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: responsiveSpacing(1.5),
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: responsiveFontSize(16),
    fontWeight: '300',
  },
  recordButton: {
    width: responsiveScale(50),
    height: responsiveScale(50),
    borderRadius: responsiveScale(25),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: responsiveSpacing(3),
    borderColor: '#FFF',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#EF4444',
  },
  recordButtonInner: {
    width: responsiveScale(36),
    height: responsiveScale(36),
    borderRadius: responsiveScale(18),
    backgroundColor: '#EF4444',
  },
  recordButtonInnerActive: {
    borderRadius: responsiveSpacing(4),
    width: responsiveScale(20),
    height: responsiveScale(20),
  },
  processingContainer: {
    alignItems: 'center',
    gap: responsiveSpacing(8),
  },
  processingText: {
    color: '#FFF',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: responsiveSpacing(20),
  },
  permissionText: {
    color: '#FFF',
    fontSize: responsiveFontSize(13),
    textAlign: 'center',
    marginBottom: responsiveSpacing(14),
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: responsiveSpacing(20),
    paddingVertical: responsiveSpacing(10),
    borderRadius: responsiveSpacing(8),
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
  },
  hiddenDataCollection: {
    display: 'none',
  },
});

export default VideoRecorder;
