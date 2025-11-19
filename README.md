# InspectTrack


## Features

### Image Sharing
- **Select images from gallery** - Choose photos from your device's photo library
- **Take photos with camera** - Capture new photos directly in the app
- **Share images** - Share selected images to other apps and platforms
- Modern, responsive UI with landscape and portrait support

### Video Recording
- Video recording with camera preview
- Interactive record/pause controls
- Automatic video save on pause
- Real-time recording timer
- Permission handling for camera, microphone, and storage
- Cross-platform support (iOS & Android)

## Tech Stack

- React Native version 0.81
- react-native-image-picker for image selection and camera
- react-native-share for sharing functionality
- react-native-vision-camera for video recording
- react-native-fs for video downloads
- Redux Toolkit for state management
- React Navigation for screen navigation

## Installation

```bash
# Install dependencies
yarn install

# Install iOS pods
yarn pod:install

# Run on iOS
yarn ios

# Run on Android
yarn android
```

## Permissions

The app requires the following permissions to function properly:

### iOS (Info.plist)
- **NSCameraUsageDescription** - Camera access for taking photos and recording videos
- **NSPhotoLibraryUsageDescription** - Photo library access for selecting images
- **NSPhotoLibraryAddUsageDescription** - Saving photos to the library
- **NSMicrophoneUsageDescription** - Microphone access for video recording
- **NSLocationWhenInUseUsageDescription** - Location tracking during recording
- **NSMotionUsageDescription** - Motion sensor data for gyroscope tracking

### Android (AndroidManifest.xml)
- **CAMERA** - Camera access for photos and videos
- **READ_MEDIA_IMAGES** - Read images from storage (Android 13+)
- **READ_EXTERNAL_STORAGE** - Read files from storage (Android 12 and below)
- **WRITE_EXTERNAL_STORAGE** - Write files to storage (Android 12 and below)
- **ACCESS_FINE_LOCATION** - GPS location tracking
- **ACCESS_COARSE_LOCATION** - Network-based location
- **RECORD_AUDIO** - Audio recording

## Usage

1. **Home Screen (Image Share)**: 
   - Tap "Choose from Gallery" to select an image from your photo library
   - Tap "Take Photo" to capture a new image with the camera
   - Once an image is selected, tap "Share Image" to share it to other apps
   - Navigate to Recording or Settings using the links at the bottom

2. **Recording Screen**: 
   - Record videos with the camera
   - Control recording with pause/resume functionality

3. **Settings Screen**: 
   - Configure recording settings
   - Adjust camera parameters


