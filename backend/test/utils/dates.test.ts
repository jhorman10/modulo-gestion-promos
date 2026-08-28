/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect } from 'vitest';
import { 
  parseISODate, 
  formatISODate, 
  isValidToday, 
  isValidISODate,
  startOfDayUTC,
  endOfDayUTC 
} from '../../src/utils/dates';

describe('date utilities', () => {
  describe('parseISODate', () => {
    it('should parse ISO 8601 date with milliseconds', () => {
      const result = parseISODate('2026-09-15T10:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(new Date('2026-09-15T10:30:00.000Z').getTime());
    });

    it('should parse ISO 8601 date without milliseconds', () => {
      const result = parseISODate('2026-09-15T10:30:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(new Date('2026-09-15T10:30:00Z').getTime());
    });

    it('should parse ISO 8601 date with timezone offset', () => {
      const result = parseISODate('2026-09-15T10:30:00+00:00');
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(new Date('2026-09-15T10:30:00+00:00').getTime());
    });

    it('should throw on invalid date string', () => {
      expect(() => parseISODate('invalid-date')).toThrow();
      expect(() => parseISODate('2026-13-45')).toThrow();
    });

    it('should throw on empty string', () => {
      expect(() => parseISODate('')).toThrow();
    });
  });

  describe('formatISODate', () => {
    it('should format Date to ISO 8601 with milliseconds', () => {
      const date = new Date('2026-09-15T10:30:00.000Z');
      const result = formatISODate(date);
      expect(result).toBe('2026-09-15T10:30:00.000Z');
    });

    it('should format Date to ISO 8601 with milliseconds precision', () => {
      const date = new Date('2026-09-15T10:30:00.123Z');
      const result = formatISODate(date);
      expect(result).toBe('2026-09-15T10:30:00.123Z');
    });

    it('should handle dates with zero milliseconds', () => {
      const date = new Date('2026-09-15T10:30:00.000Z');
      const result = formatISODate(date);
      expect(result).toBe('2026-09-15T10:30:00.000Z');
    });
  });

  describe('isValidISODate', () => {
    it('should return true for valid ISO 8601 date', () => {
      expect(isValidISODate('2026-09-15T10:30:00.000Z')).toBe(true);
      expect(isValidISODate('2026-09-15T10:30:00Z')).toBe(true);
      expect(isValidISODate('2026-09-15T10:30:00+00:00')).toBe(true);
    });

    it('should return false for invalid date', () => {
      expect(isValidISODate('invalid')).toBe(false);
      expect(isValidISODate('2026-13-45')).toBe(false);
      expect(isValidISODate('')).toBe(false);
    });
  });

  describe('startOfDayUTC', () => {
    it('should return start of day in UTC', () => {
      const date = new Date('2026-09-15T15:30:00.000Z');
      const result = startOfDayUTC(date);
      expect(result.toISOString()).toBe('2026-09-15T00:00:00.000Z');
    });
  });

  describe('endOfDayUTC', () => {
    it('should return end of day in UTC', () => {
      const date = new Date('2026-09-15T15:30:00.000Z');
      const result = endOfDayUTC(date);
      expect(result.toISOString()).toBe('2026-09-15T23:59:59.999Z');
    });
  });

  describe('isValidToday', () => {
    it('should return true when server date is within range', () => {
      const startDate = new Date('2026-09-15T00:00:00.000Z');
      const endDate = new Date('2026-09-15T23:59:59.999Z');
      const serverDate = new Date('2026-09-15T12:00:00.000Z');
      
      expect(isValidToday(startDate, endDate, serverDate)).toBe(true);
    });

    it('should return true when server date equals start date', () => {
      const startDate = new Date('2026-09-15T00:00:00.000Z');
      const endDate = new Date('2026-09-15T23:59:59.999Z');
      const serverDate = new Date('2026-09-15T00:00:00.000Z');
      
      expect(isValidToday(startDate, endDate, serverDate)).toBe(true);
    });

    it('should return true when server date equals end date', () => {
      const startDate = new Date('2026-09-15T00:00:00.000Z');
      const endDate = new Date('2026-09-15T23:59:59.999Z');
      const serverDate = new Date('2026-09-15T23:59:59.999Z');
      
      expect(isValidToday(startDate, endDate, serverDate)).toBe(true);
    });

    it('should return false when server date is before start date', () => {
      const startDate = new Date('2026-09-15T00:00:00.000Z');
      const endDate = new Date('2026-09-15T23:59:59.999Z');
      const serverDate = new Date('2026-09-14T23:59:59.999Z');
      
      expect(isValidToday(startDate, endDate, serverDate)).toBe(false);
    });

    it('should return false when server date is after end date', () => {
      const startDate = new Date('2026-09-15T00:00:00.000Z');
      const endDate = new Date('2026-09-15T23:59:59.999Z');
      const serverDate = new Date('2026-09-16T00:00:00.000Z');
      
      expect(isValidToday(startDate, endDate, serverDate)).toBe(false);
    });

    it('should handle multi-day ranges', () => {
      const startDate = new Date('2026-09-10T00:00:00.000Z');
      const endDate = new Date('2026-09-20T23:59:59.999Z');
      const serverDate = new Date('2026-09-15T12:00:00.000Z');
      
      expect(isValidToday(startDate, endDate, serverDate)).toBe(true);
    });

    it('should return false for multi-day range when server date outside', () => {
      const startDate = new Date('2026-09-10T00:00:00.000Z');
      const endDate = new Date('2026-09-20T23:59:59.999Z');
      const serverDate = new Date('2026-09-09T12:00:00.000Z');
      
      expect(isValidToday(startDate, endDate, serverDate)).toBe(false);
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain consistency when parsing and formatting', () => {
      const original = '2026-09-15T10:30:00.000Z';
      const parsed = parseISODate(original);
      const formatted = formatISODate(parsed);
      expect(formatted).toBe(original);
    });

    it('should maintain consistency for various dates', () => {
      const dates = [
        '2026-01-01T00:00:00.000Z',
        '2026-12-31T23:59:59.999Z',
        '2026-06-15T12:30:45.123Z',
      ];
      
      for (const dateStr of dates) {
        const parsed = parseISODate(dateStr);
        const formatted = formatISODate(parsed);
        expect(formatted).toBe(dateStr);
      }
    });
  });
});