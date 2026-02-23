import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

export type DicebearStyle = 'avataaars' | 'bottts' | 'pixel-art';

export const DICEBEAR_STYLES: { id: DicebearStyle; label: string }[] = [
  { id: 'avataaars', label: 'Avatar' },
  { id: 'bottts', label: 'Robot' },
  { id: 'pixel-art', label: 'Pixel' },
];

export const DICEBEAR_BACKGROUNDS = [
  'b6e3f4', 'c0aede', 'ffdfbf', 'ffd5dc',
  'd1d4f9', 'a8edea', 'ffecd2', 'e0bbe4',
  'ffd6a5', 'caffbf', '9bf6ff', 'bdb2ff',
  'fdffb6', 'e4c1f9',
] as const;

/** Build Dicebear avatar URL. Seed (e.g. displayName), size, style, background hex (no #). */
export function generateCustomAvatarUrl(
  seed: string,
  size: number = 400,
  style: DicebearStyle = 'avataaars',
  backgroundColor?: string
): string {
  try {
    const encodedSeed = encodeURIComponent(seed);
    const bg = backgroundColor || DICEBEAR_BACKGROUNDS[seed.charCodeAt(0) % DICEBEAR_BACKGROUNDS.length];
    const genSize = Math.max(size * 2, 400);
    return `https://api.dicebear.com/7.x/${style}/png?seed=${encodedSeed}&size=${genSize}&backgroundColor=${bg}`;
  } catch (error) {
    if (__DEV__) console.error('Error generating custom avatar:', error);
    return '';
  }
}

export class DicebearService {
  // Test method to verify Dicebear is working
  static testDicebear(): string {
    try {
      const avatar = createAvatar(avataaars, {
        seed: 'test',
        size: 100,
      });
      const dataUri = avatar.toDataUri();
      return dataUri;
    } catch (error) {
      if (__DEV__) console.error('Dicebear test failed:', error);
      return '';
    }
  }

  // Generate a profile picture URL from a display name
  static generateAvatarUrl(displayName: string, size: number = 200): string {
    try {
      // Use Dicebear's PNG endpoint which React Native can handle
      // Generate at 2x the display size for crisp images
      const generateSize = Math.max(size * 2, 400); // At least 400px for quality

      const seed = encodeURIComponent(displayName);
      const backgroundColor = ['b6e3f4', 'c0aede', 'ffdfbf', 'ffd5dc'];
      const bgColor = backgroundColor[displayName.charCodeAt(0) % backgroundColor.length];

      const dicebearUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&size=${generateSize}&backgroundColor=${bgColor}`;
      return dicebearUrl;

    } catch (error) {
      if (__DEV__) console.error('Error generating Dicebear avatar:', error);
      // Fallback to a simple identicon-style avatar
      return this.generateFallbackAvatar(displayName, size);
    }
  }

  // Generate a fallback avatar if Dicebear fails
  private static generateFallbackAvatar(displayName: string, size: number): string {
    // For React Native compatibility, return empty string to trigger Avatar component's fallback UI
    // The Avatar component will show a colored circle with initials
    return '';
  }

  // Get avatar with different styles
  static getAvatarStyle(displayName: string, style: DicebearStyle = 'avataaars', size: number = 200): string {
    try {
      const seed = encodeURIComponent(displayName);
      const bgColor = DICEBEAR_BACKGROUNDS[displayName.charCodeAt(0) % DICEBEAR_BACKGROUNDS.length];
      return this.generateCustomAvatar(displayName, size, style, bgColor);
    } catch (error) {
      if (__DEV__) console.error('Error generating styled avatar:', error);
      return this.generateFallbackAvatar(displayName, size);
    }
  }

  /** Customize avatar: seed (e.g. displayName), size, style, and background hex (no #). */
  static generateCustomAvatar(
    seed: string,
    size: number = 400,
    style: DicebearStyle = 'avataaars',
    backgroundColor?: string
  ): string {
    return generateCustomAvatarUrl(seed, size, style, backgroundColor);
  }

  // Get random avatar style for variety
  static getRandomAvatarStyle(displayName: string, size: number = 200): string {
    // For React Native compatibility, use fallback approach
    return this.generateFallbackAvatar(displayName, size);
  }
}
