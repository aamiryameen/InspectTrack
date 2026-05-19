import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_PROFILE_KEY = '@user_profile';

export interface UserProfile {
  firstName: string;
  lastName: string;
}

export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const profileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (profileJson) {
      return JSON.parse(profileJson);
    }
    return null;
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    return false;
  }
};

export const hasUserProfile = async (): Promise<boolean> => {
  try {
    const profile = await getUserProfile();
    return profile !== null && profile.firstName.trim() !== '' && profile.lastName.trim() !== '';
  } catch (error) {
    console.error('Error checking user profile:', error);
    return false;
  }
};

export const formatUserNameForFolder = (profile: UserProfile): string => {
  const firstName = profile.firstName.trim().replace(/\s+/g, '');
  const lastName = profile.lastName.trim().replace(/\s+/g, '');
  return `${firstName}_${lastName}`;
};
