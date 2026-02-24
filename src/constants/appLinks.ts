// ── App Store & Sharing Links ──────────────────────────────────
// Swap these in once the app is published and you have a domain.

/** Replace with your actual App Store URL after approval */
export const APP_STORE_URL = ''; // e.g. 'https://apps.apple.com/app/squadcheck/id1234567890'

/** Replace with your actual Play Store URL after approval */
export const PLAY_STORE_URL = ''; // e.g. 'https://play.google.com/store/apps/details?id=com.squadcheck.app'

/** Your website/domain landing page */
export const APP_WEBSITE_URL = 'https://squadcheck.app';

/**
 * Returns the best available download link.
 * Priority: website > App Store > Play Store > empty string
 */
export function getDownloadLink(): string {
  return APP_WEBSITE_URL || APP_STORE_URL || PLAY_STORE_URL || '';
}

/**
 * Build the friend invite share message.
 */
export function buildFriendInviteMessage(friendCode: string): string {
  const link = getDownloadLink();
  const lines = [
    `Join me on SquadCheck! Add me with my friend code: ${friendCode}`,
  ];
  if (link) {
    lines.push(`\nDownload the app: ${link}`);
  } else {
    lines.push(`\nSearch for "SquadCheck" on the App Store or Google Play.`);
  }
  return lines.join('\n');
}

/**
 * Build the group invite share message.
 */
export function buildGroupInviteMessage(groupName: string, groupId?: string): string {
  const link = getDownloadLink();
  const lines = [
    `Join my squad "${groupName}" on SquadCheck!`,
  ];
  if (link) {
    lines.push(`\nDownload the app: ${link}`);
  } else {
    lines.push(`\nSearch for "SquadCheck" on the App Store or Google Play.`);
  }
  return lines.join('\n');
}
