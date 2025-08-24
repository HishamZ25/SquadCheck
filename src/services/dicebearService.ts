import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

export class DicebearService {
  // Test method to verify Dicebear is working
  static testDicebear(): string {
    try {
      console.log('Testing Dicebear service...');
      const avatar = createAvatar(avataaars, {
        seed: 'test',
        size: 100,
      });
      const dataUri = avatar.toDataUri();
      console.log('Dicebear test successful, URI length:', dataUri.length);
      return dataUri;
    } catch (error) {
      console.error('Dicebear test failed:', error);
      return '';
    }
  }

  // Generate a profile picture URL from a display name
  static generateAvatarUrl(displayName: string, size: number = 200): string {
    try {
      console.log('DicebearService: Generating avatar for:', displayName, 'size:', size);
      
      // Use Dicebear's PNG endpoint which React Native can handle
      // Generate at 2x the display size for crisp images
      const displaySize = size;
      const generateSize = Math.max(displaySize * 2, 400); // At least 400px for quality
      
      const seed = encodeURIComponent(displayName);
      const backgroundColor = ['b6e3f4', 'c0aede', 'ffdfbf', 'ffd5dc'];
      const bgColor = backgroundColor[displayName.charCodeAt(0) % backgroundColor.length];
      
      const dicebearUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&size=${generateSize}&backgroundColor=${bgColor}`;
      console.log('DicebearService: Generated PNG URL:', dicebearUrl, 'Display size:', displaySize, 'Generate size:', generateSize);
      return dicebearUrl;
      
    } catch (error) {
      console.error('Error generating Dicebear avatar:', error);
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
  static getAvatarStyle(displayName: string, style: 'avataaars' | 'bottts' | 'pixel-art' | 'identicon' = 'avataaars', size: number = 200): string {
    try {
      const seed = encodeURIComponent(displayName);
      const backgroundColor = ['b6e3f4', 'c0aede', 'ffdfbf', 'ffd5dc'];
      const bgColor = backgroundColor[displayName.charCodeAt(0) % backgroundColor.length];
      
      return `https://api.dicebear.com/7.x/${style}/png?seed=${seed}&size=${size}&backgroundColor=${bgColor}`;
    } catch (error) {
      console.error('Error generating styled avatar:', error);
      return this.generateFallbackAvatar(displayName, size);
    }
  }

  // Get random avatar style for variety
  static getRandomAvatarStyle(displayName: string, size: number = 200): string {
    // For React Native compatibility, use fallback approach
    return this.generateFallbackAvatar(displayName, size);
  }
} 