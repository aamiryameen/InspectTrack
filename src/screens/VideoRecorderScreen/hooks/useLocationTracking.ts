import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { RecordingSettings } from '../../../utils/settingsUtils';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface GPSDataPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface UseLocationTrackingReturn {
  location: Location | null;
  gpsDataRef: React.MutableRefObject<GPSDataPoint[]>;
  totalDistanceRef: React.MutableRefObject<number>;
  startGPSDataCollection: () => void;
  stopGPSDataCollection: () => void;
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

export const useLocationTracking = (settings: RecordingSettings): UseLocationTrackingReturn => {
  const [location, setLocation] = useState<Location | null>(null);
  const locationWatchId = useRef<number | null>(null);
  const gpsDataRef = useRef<GPSDataPoint[]>([]);
  const gpsCollectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalDistanceRef = useRef<number>(0);

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
  }, [settings.gps.accuracy, settings.gps.distanceFilter, settings.gps.updateInterval]);

  const startGPSDataCollection = useCallback(() => {
    gpsDataRef.current = [];
    totalDistanceRef.current = 0;
    
    if (!settings.metadata.gpsSync) return;

    const samplingInterval = settings.gps.updateInterval * 1000;
    const enableHighAccuracy = settings.gps.accuracy === 'high';

    gpsCollectionInterval.current = setInterval(() => {
      Geolocation.getCurrentPosition(
        (position) => {
          const utcTimestamp = getUTCTimestamp();
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
            timestamp: utcTimestamp,
            latitude,
            longitude,
            accuracy,
          });
        },
        (error) => console.error('GPS collection error:', error),
        { enableHighAccuracy, timeout: 20000, maximumAge: 0 }
      );
    }, samplingInterval);
  }, [settings.gps.updateInterval, settings.gps.accuracy, settings.metadata.gpsSync]);

  const stopGPSDataCollection = useCallback(() => {
    if (gpsCollectionInterval.current) {
      clearInterval(gpsCollectionInterval.current);
      gpsCollectionInterval.current = null;
    }
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
    startGPSDataCollection,
    stopGPSDataCollection,
  };
};

