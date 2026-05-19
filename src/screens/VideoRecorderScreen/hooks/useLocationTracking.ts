import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { RecordingSettings } from '../../../utils/settingsUtils';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export type GPSQuality = 'excellent' | 'good' | 'moderate' | 'poor' | 'unknown';

interface GPSDataPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  quality?: GPSQuality;
}

interface UseLocationTrackingReturn {
  location: Location | null;
  gpsDataRef: React.MutableRefObject<GPSDataPoint[]>;
  totalDistanceRef: React.MutableRefObject<number>;
  gpsQuality: GPSQuality;
  startGPSDataCollection: (startTimestamp?: number) => void;
  stopGPSDataCollection: () => void;
  pauseGPSDataCollection: () => void;
  resumeGPSDataCollection: () => void;
}

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

const calculateHeading = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

const calculateSpeed = (distanceKm: number, timeMs: number): number => {
  // Convert distance from kilometers to meters
  const distanceM = distanceKm * 1000;
  // Convert time from milliseconds to seconds
  const timeS = timeMs / 1000;
  // Avoid division by zero
  if (timeS <= 0) return 0;
  // Calculate speed in m/s
  return distanceM / timeS;
};

const getGPSQuality = (accuracy: number | null | undefined): GPSQuality => {
  if (accuracy === null || accuracy === undefined || accuracy < 0) {
    return 'unknown';
  }
  if (accuracy <= 5) {
    return 'excellent';
  } else if (accuracy <= 10) {
    return 'good';
  } else if (accuracy <= 50) {
    return 'moderate';
  } else {
    return 'poor';
  }
};

export const useLocationTracking = (settings: RecordingSettings): UseLocationTrackingReturn => {
  const [location, setLocation] = useState<Location | null>(null);
  const [gpsQuality, setGpsQuality] = useState<GPSQuality>('unknown');
  const locationWatchId = useRef<number | null>(null);
  const gpsDataRef = useRef<GPSDataPoint[]>([]);
  const gpsCollectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalDistanceRef = useRef<number>(0);
  const permissionDeniedRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const lastGPSPointBeforePauseRef = useRef<GPSDataPoint | null>(null);
  const lastValidHeadingRef = useRef<number | undefined>(undefined);

  const getUTCTimestamp = (): number => {
    try {
      return Date.now();
    } catch (error) {
      console.error('Error getting UTC timestamp:', error);
      return Date.now();
    }
  };

  const startLocationTracking = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        permissionDeniedRef.current = true;
        return;
      }
    }

    const enableHighAccuracy = settings.gps.accuracy === 'high';
    const distanceFilter = settings.gps.distanceFilter;
    const interval = settings.gps.updateInterval * 1000;

    locationWatchId.current = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setLocation({ latitude, longitude, address });
        const quality = getGPSQuality(accuracy);
        setGpsQuality(quality);
      },
      (error) => {
        if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
          permissionDeniedRef.current = true;
          if (locationWatchId.current !== null) {
            Geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = null;
          }
        } else {
          console.error('Location error:', error);
        }
      },
      { enableHighAccuracy, distanceFilter, interval }
    );
  }, [settings.gps.accuracy, settings.gps.distanceFilter, settings.gps.updateInterval]);

  const startGPSDataCollection = useCallback((startTimestamp?: number) => {
    gpsDataRef.current = [];
    totalDistanceRef.current = 0;
    lastValidHeadingRef.current = undefined;
    const recordingStartTime = startTimestamp || Date.now();
    recordingStartTimeRef.current = recordingStartTime;
    
    if (!settings.metadata.gpsSync) return;
    
    if (permissionDeniedRef.current) {
      return;
    }

    const samplingInterval = 500;
    const enableHighAccuracy = settings.gps.accuracy === 'high';

    Geolocation.getCurrentPosition(
      (position) => {
        const initialTimestamp = recordingStartTime;
        const { latitude, longitude, altitude, accuracy, speed, heading } = position.coords;
        const quality = getGPSQuality(accuracy);
        setGpsQuality(quality);

        // Store initial heading if valid
        let initialHeading: number | undefined = undefined;
        if (heading !== null && heading !== undefined && heading > 0) {
          lastValidHeadingRef.current = heading;
          initialHeading = heading;
        }

        gpsDataRef.current.push({
          timestamp: initialTimestamp,
          latitude,
          longitude,
          altitude: (altitude !== null && altitude !== undefined) ? altitude : undefined,
          accuracy,
          speed: (speed !== null && speed !== undefined && speed >= 0) ? speed : undefined,
          heading: initialHeading,
          quality,
        });

        gpsCollectionInterval.current = setInterval(() => {
          if (permissionDeniedRef.current || isPausedRef.current) {
            if (permissionDeniedRef.current && gpsCollectionInterval.current) {
              clearInterval(gpsCollectionInterval.current);
              gpsCollectionInterval.current = null;
            }
            return;
          }

          Geolocation.getCurrentPosition(
            (position) => {
              const utcTimestamp = getUTCTimestamp();
              const { latitude, longitude, altitude, accuracy, speed, heading } = position.coords;
              const quality = getGPSQuality(accuracy);
              setGpsQuality(quality);

              let calculatedHeading: number | undefined = undefined;
              let calculatedSpeed: number | undefined = undefined;
              const movementThreshold = 0.000001; // ~0.11 meters - very small threshold to calculate heading
              if (gpsDataRef.current.length > 0) {
                const prevPoint = gpsDataRef.current[gpsDataRef.current.length - 1];
                const distance = calculateDistance(
                  prevPoint.latitude,
                  prevPoint.longitude,
                  latitude,
                  longitude
                );
                totalDistanceRef.current += distance;
                const timeDiff = utcTimestamp - prevPoint.timestamp;
                
                // Always try to calculate heading from previous point if there's any movement at all
                if (distance > movementThreshold) {
                  // Calculate heading from coordinates when there's any movement
                  calculatedHeading = calculateHeading(
                    prevPoint.latitude,
                    prevPoint.longitude,
                    latitude,
                    longitude
                  );
                  // Use GPS heading if it's valid (GPS is more accurate when available)
                  if (heading !== null && heading !== undefined && heading > 0) {
                    calculatedHeading = heading;
                  }
                  // Update last valid heading when there's movement
                  if (calculatedHeading !== undefined) {
                    lastValidHeadingRef.current = calculatedHeading;
                  }
                } else {
                  // No movement - use last valid heading if available
                  if (lastValidHeadingRef.current !== undefined) {
                    calculatedHeading = lastValidHeadingRef.current;
                  } else if (heading !== null && heading !== undefined && heading > 0) {
                    // Use GPS heading if available, even if stationary
                    calculatedHeading = heading;
                    lastValidHeadingRef.current = heading;
                  } else if (prevPoint.heading !== undefined && prevPoint.heading !== null) {
                    // Use previous point's heading as fallback
                    calculatedHeading = prevPoint.heading;
                    lastValidHeadingRef.current = prevPoint.heading;
                  }
                }
                if (speed === null || speed === undefined || speed < 0) {
                  calculatedSpeed = calculateSpeed(distance, timeDiff);
                }
              } else {
                // First point - store heading if valid
                if (heading !== null && heading !== undefined && heading > 0) {
                  lastValidHeadingRef.current = heading;
                  calculatedHeading = heading;
                }
              }

              // Determine final heading: prefer GPS heading if valid, otherwise use calculated, otherwise use last valid
              const finalHeading = (heading !== null && heading !== undefined && heading > 0) 
                ? heading 
                : (calculatedHeading !== undefined ? calculatedHeading : lastValidHeadingRef.current);

              gpsDataRef.current.push({
                timestamp: utcTimestamp,
                latitude,
                longitude,
                altitude: (altitude !== null && altitude !== undefined) ? altitude : undefined,
                accuracy,
                speed: (speed !== null && speed !== undefined && speed >= 0) ? speed : calculatedSpeed,
                heading: finalHeading,
                quality,
              });
            },
            (error) => {
              if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
                permissionDeniedRef.current = true;
                if (gpsCollectionInterval.current) {
                  clearInterval(gpsCollectionInterval.current);
                  gpsCollectionInterval.current = null;
                }
              } else {
                console.error('GPS collection error:', error);
              }
            },
            { enableHighAccuracy, timeout: 20000, maximumAge: 0 }
          );
        }, samplingInterval);
      },
      (error) => {
        gpsCollectionInterval.current = setInterval(() => {
          if (permissionDeniedRef.current || isPausedRef.current) {
            if (permissionDeniedRef.current && gpsCollectionInterval.current) {
              clearInterval(gpsCollectionInterval.current);
              gpsCollectionInterval.current = null;
            }
            return;
          }

          Geolocation.getCurrentPosition(
            (position) => {
              const utcTimestamp = getUTCTimestamp();
              const { latitude, longitude, altitude, accuracy, speed, heading } = position.coords;
              const quality = getGPSQuality(accuracy);
              setGpsQuality(quality);

              let calculatedHeading: number | undefined = undefined;
              let calculatedSpeed: number | undefined = undefined;
              const movementThreshold = 0.000001; // ~0.11 meters - very small threshold to calculate heading
              if (gpsDataRef.current.length > 0) {
                const prevPoint = gpsDataRef.current[gpsDataRef.current.length - 1];
                const distance = calculateDistance(
                  prevPoint.latitude,
                  prevPoint.longitude,
                  latitude,
                  longitude
                );
                totalDistanceRef.current += distance;
                const timeDiff = utcTimestamp - prevPoint.timestamp;
                
                // Always try to calculate heading from previous point if there's any movement at all
                if (distance > movementThreshold) {
                  // Calculate heading from coordinates when there's any movement
                  calculatedHeading = calculateHeading(
                    prevPoint.latitude,
                    prevPoint.longitude,
                    latitude,
                    longitude
                  );
                  // Use GPS heading if it's valid (GPS is more accurate when available)
                  if (heading !== null && heading !== undefined && heading > 0) {
                    calculatedHeading = heading;
                  }
                  // Update last valid heading when there's movement
                  if (calculatedHeading !== undefined) {
                    lastValidHeadingRef.current = calculatedHeading;
                  }
                } else {
                  // No movement - use last valid heading if available
                  if (lastValidHeadingRef.current !== undefined) {
                    calculatedHeading = lastValidHeadingRef.current;
                  } else if (heading !== null && heading !== undefined && heading > 0) {
                    // Use GPS heading if available, even if stationary
                    calculatedHeading = heading;
                    lastValidHeadingRef.current = heading;
                  } else if (prevPoint.heading !== undefined && prevPoint.heading !== null) {
                    // Use previous point's heading as fallback
                    calculatedHeading = prevPoint.heading;
                    lastValidHeadingRef.current = prevPoint.heading;
                  }
                }
                if (speed === null || speed === undefined || speed < 0) {
                  calculatedSpeed = calculateSpeed(distance, timeDiff);
                }
              } else {
                // First point - store heading if valid
                if (heading !== null && heading !== undefined && heading > 0) {
                  lastValidHeadingRef.current = heading;
                  calculatedHeading = heading;
                }
              }

              // Determine final heading: prefer GPS heading if valid, otherwise use calculated, otherwise use last valid
              const finalHeading = (heading !== null && heading !== undefined && heading > 0) 
                ? heading 
                : (calculatedHeading !== undefined ? calculatedHeading : lastValidHeadingRef.current);

              gpsDataRef.current.push({
                timestamp: utcTimestamp,
                latitude,
                longitude,
                altitude: (altitude !== null && altitude !== undefined) ? altitude : undefined,
                accuracy,
                speed: (speed !== null && speed !== undefined && speed >= 0) ? speed : calculatedSpeed,
                heading: finalHeading,
                quality,
              });
            },
            (error) => {
              if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
                permissionDeniedRef.current = true;
                if (gpsCollectionInterval.current) {
                  clearInterval(gpsCollectionInterval.current);
                  gpsCollectionInterval.current = null;
                }
              } else {
                console.error('GPS collection error:', error);
              }
            },
            { enableHighAccuracy, timeout: 20000, maximumAge: 0 }
          );
        }, samplingInterval);
      },
      { enableHighAccuracy, timeout: 20000, maximumAge: 0 }
    );
  }, [settings.gps.accuracy, settings.metadata.gpsSync]);

  const pauseGPSDataCollection = useCallback(() => {
    isPausedRef.current = true;
    if (gpsDataRef.current.length > 0) {
      lastGPSPointBeforePauseRef.current = gpsDataRef.current[gpsDataRef.current.length - 1];
    }
  }, []);

  const resumeGPSDataCollection = useCallback(() => {
    isPausedRef.current = false;
    // When resuming, we don't want to calculate distance from the last point before pause
    // So we'll set the last point to null to avoid incorrect distance calculation
    if (lastGPSPointBeforePauseRef.current && gpsDataRef.current.length > 0) {
      // Update the last point reference to the current last point
      lastGPSPointBeforePauseRef.current = gpsDataRef.current[gpsDataRef.current.length - 1];
    }
  }, []);

  const stopGPSDataCollection = useCallback(() => {
    if (gpsCollectionInterval.current) {
      clearInterval(gpsCollectionInterval.current);
      gpsCollectionInterval.current = null;
    }
    isPausedRef.current = false;
    lastGPSPointBeforePauseRef.current = null;
  }, []);

  useEffect(() => {
    startLocationTracking();

    return () => {
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
      }
      stopGPSDataCollection();
    };
  }, [startLocationTracking, stopGPSDataCollection]);

  return {
    location,
    gpsDataRef,
    totalDistanceRef,
    gpsQuality,
    startGPSDataCollection,
    stopGPSDataCollection,
    pauseGPSDataCollection,
    resumeGPSDataCollection,
  };
};
