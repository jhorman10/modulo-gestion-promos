/**
 * Parses an ISO 8601 date string to a Date object
 * @param dateString - ISO 8601 date string (e.g., "2026-09-15T10:30:00.000Z")
 * @returns Date object
 * @throws Error if the date string is invalid
 */
export function parseISODate(dateString: string): Date {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error('Invalid date string: empty or not a string');
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }

  return date;
}

/**
 * Formats a Date object to ISO 8601 string with milliseconds precision in UTC
 * @param date - Date object
 * @returns ISO 8601 string (e.g., "2026-09-15T10:30:00.000Z")
 */
export function formatISODate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object');
  }

  return date.toISOString();
}

/**
 * Checks if a string is a valid ISO 8601 date
 * @param dateString - String to validate
 * @returns true if valid ISO 8601 date, false otherwise
 */
export function isValidISODate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Returns the start of the day (00:00:00.000) in UTC for a given date
 * @param date - Date object
 * @returns Date object at start of day in UTC
 */
export function startOfDayUTC(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Returns the end of the day (23:59:59.999) in UTC for a given date
 * @param date - Date object
 * @returns Date object at end of day in UTC
 */
export function endOfDayUTC(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/**
 * Checks if a promotion is valid for today based on its start and end dates
 * @param startDate - Promotion start date (inclusive)
 * @param endDate - Promotion end date (inclusive)
 * @param serverDate - Current server date (defaults to now)
 * @returns true if serverDate is within [startDate, endDate] range (inclusive), false otherwise
 */
export function isValidToday(
  startDate: Date,
  endDate: Date,
  serverDate: Date = new Date()
): boolean {
  const startOfDay = startOfDayUTC(startDate);
  const endOfDay = endOfDayUTC(endDate);
  const serverDay = startOfDayUTC(serverDate);

  return serverDay >= startOfDay && serverDay <= endOfDay;
}
