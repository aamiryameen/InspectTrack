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
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, useCameraFormat } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import { gyroscope } from 'react-native-sensors';
import Geolocation from '@react-native-community/geolocation';

const { width, height } = Dimensions.get('window');

const VideoRecorder = () => {
  const camera = useRef<Camera>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gyroSubscription = useRef<any>(null);
  const locationWatchId = useRef<number | null>(null);

  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1920, height: 1080 } },
    { fps: 30 }
  ]);

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();

  useEffect(() => {
    checkPermissions();
    startGyroscope();
    startLocationTracking();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (gyroSubscription.current) {
        gyroSubscription.current.unsubscribe();
      }
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, []);

  const startGyroscope = () => {
    gyroSubscription.current = gyroscope.subscribe(({ x, y, z }) => {
      setGyroData({ x, y, z });
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

    locationWatchId.current = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setLocation({ latitude, longitude, address });
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, distanceFilter: 10, interval: 1000 }
    );
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
      await camera.current.startRecording({
        onRecordingFinished: async (video) => {
          await handleVideoSave(video.path);
        },
        onRecordingError: (error) => {
          console.error('Recording error:', error);
          Alert.alert('Error', 'Failed to record video');
          setIsRecording(false);
          stopTimer();
        },
      });
    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
      stopTimer();
    }
  };

  const pauseRecording = async () => {
    if (!camera.current) return;

    try {
      setIsProcessing(true);
      await camera.current.stopRecording();
      setIsRecording(false);
      stopTimer();
      setRecordingTime(0);
    } catch (error) {
      console.error('Pause recording error:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsProcessing(false);
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

      setIsProcessing(false);

      const folderName = Platform.OS === 'ios' ? 'Documents' : 'Downloads';
      Alert.alert(
        'Video Downloaded',
        `Your video has been successfully downloaded and saved to ${folderName} folder.\n\nFile: ${fileName}`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Video saved successfully');
            },
          },
        ]
      );
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
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <View style={styles.recordingIndicator}>
            {isRecording && <View style={styles.recordingDot} />}
            <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
          </View>
        </View>

        <View style={styles.dataOverlay}>
          <View style={styles.dataContainer}>
            <Text style={styles.dataLabel}>GYROSCOPE</Text>
            <Text style={styles.dataText}>X: {gyroData.x.toFixed(2)}</Text>
            <Text style={styles.dataText}>Y: {gyroData.y.toFixed(2)}</Text>
            <Text style={styles.dataText}>Z: {gyroData.z.toFixed(2)}</Text>
          </View>

          {location && (
            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>LOCATION</Text>
              <Text style={styles.dataText}>Lat: {location.latitude.toFixed(6)}</Text>
              <Text style={styles.dataText}>Lon: {location.longitude.toFixed(6)}</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {location.address}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomBar}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#FF3B30" />
              <Text style={styles.processingText}>Saving video...</Text>
            </View>
          ) : (
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                ]}
                onPress={isRecording ? pauseRecording : startRecording}
                disabled={isProcessing}
              >
                <View
                  style={[
                    styles.recordButtonInner,
                    isRecording && styles.recordButtonInnerActive,
                  ]}
                />
              </TouchableOpacity>

              <View style={styles.buttonLabelsContainer}>
                <Text style={styles.buttonLabel}>
                  {isRecording ? 'TAP TO PAUSE & SAVE' : 'TAP TO RECORD'}
                </Text>
              </View>
            </View>
          )}
        </View>
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
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  timerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bottomBar: {
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  controlsContainer: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    borderColor: '#FF3B30',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
  },
  recordButtonInnerActive: {
    borderRadius: 8,
    width: 30,
    height: 30,
  },
  buttonLabelsContainer: {
    marginTop: 20,
  },
  buttonLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dataOverlay: {
    position: 'absolute',
    left: 20,
    top: 120,
    gap: 15,
  },
  dataContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 180,
  },
  dataLabel: {
    color: '#00FF00',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 1,
  },
  dataText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  addressText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 16,
  },
});

export default VideoRecorder;
