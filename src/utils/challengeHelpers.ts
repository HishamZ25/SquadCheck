/**
 * Shared challenge utility functions.
 */

/**
 * Build the list of check-in requirements from a challenge object.
 * Used by ChallengeDetailScreen and CheckInScreen.
 */
export function buildCheckInRequirements(c: any): string[] {
  const list: string[] = [];
  const legacy = c?.requirements;
  if (Array.isArray(legacy) && legacy.length > 0) {
    list.push(...legacy.filter((r: any) => typeof r === 'string' && r.trim()));
  }
  if (c?.submission?.requireAttachment) list.push('Photo proof required');
  if (c?.submission?.requireText) list.push('Note or caption required');
  if (c?.submission?.minTextLength) list.push(`Minimum ${c.submission.minTextLength} characters for text`);
  if (c?.submission?.minValue != null && c?.submission?.inputType === 'number') {
    list.push(`Minimum value: ${c.submission.minValue}${c.submission.unitLabel ? ` ${c.submission.unitLabel}` : ''}`);
  }
  if (c?.submission?.minValue != null && c?.submission?.inputType === 'timer') {
    list.push(`Minimum time: ${Math.floor(c.submission.minValue / 60)} minutes`);
  }
  return list;
}
