// Centralized time calculation utilities
export class TimeUtils {
  /**
   * Calculate age in hours from a creation date
   */
  static getAgeInHours(createdAt: Date): number {
    const now = new Date();
    const diffInMs = now.getTime() - createdAt.getTime();
    return diffInMs / (1000 * 60 * 60);
  }

  static minutesToHours(minutes: number): number {
    return minutes / 60;
  }

  static hoursToMs(hours: number): number {
    return hours * 60 * 60 * 1000;
  }

  /**
   * Calculate time difference in milliseconds
   */
  static getTimeSinceMs(pastDate: Date): number {
    const now = new Date();
    return now.getTime() - pastDate.getTime();
  }

  /**
   * Format age in human-readable format
   */
  static formatAge(createdAt: Date): string {
    const diffInHours = this.getAgeInHours(createdAt);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} old`;
    } else if (diffInHours >= 1) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours === 1 ? '' : 's'} old`;
    } else {
      const minutes = Math.floor(diffInHours * 60);
      return minutes > 0 ? `${minutes} minute${minutes === 1 ? '' : 's'} old` : 'Less than a minute old';
    }
  }

  /**
   * Format time remaining in human-readable format
   */
  static formatTimeRemaining(hoursRemaining: number): string {
    if (hoursRemaining <= 0) {
      return 'Ready';
    }

    if (hoursRemaining >= 1) {
      const hours = Math.floor(hoursRemaining);
      const minutes = Math.floor((hoursRemaining - hours) * 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      const minutes = Math.floor(hoursRemaining * 60);
      return `${minutes}m`;
    }
  }


}