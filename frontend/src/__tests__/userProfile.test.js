import { describe, it, expect } from 'vitest';
import { normalizeUserProfile, getInitials, DEFAULT_USER_PROFILE } from '../utils/userProfile';

describe('userProfile utility', () => {
  describe('getInitials', () => {
    it('returns "AM" for empty or undefined names', () => {
      expect(getInitials('')).toBe('AM');
      expect(getInitials(undefined)).toBe('AM');
      expect(getInitials(null)).toBe('AM');
    });

    it('returns first two letters uppercase if one word', () => {
      expect(getInitials('John')).toBe('JO');
      expect(getInitials('j')).toBe('J');
    });

    it('returns initials of first two words', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('john doe smith')).toBe('JD');
    });
  });

  describe('normalizeUserProfile', () => {
    it('returns DEFAULT_USER_PROFILE when given an empty object or null', () => {
      expect(normalizeUserProfile()).toEqual(DEFAULT_USER_PROFILE);
      expect(normalizeUserProfile(null)).toEqual(DEFAULT_USER_PROFILE);
      expect(normalizeUserProfile({})).toEqual(DEFAULT_USER_PROFILE);
    });

    it('preserves existing valid values', () => {
      const customProfile = {
        name: 'Alice',
        email: 'alice@example.com',
        tier: 'Pro Tier',
        avatarUrl: 'https://example.com/avatar.png',
        loggedIn: true
      };
      expect(normalizeUserProfile(customProfile)).toEqual(customProfile);
    });

    it('falls back to default values for invalid string inputs', () => {
      const invalidProfile = {
        name: '   ',
        email: '',
        tier: null
      };
      const result = normalizeUserProfile(invalidProfile);
      expect(result.name).toBe(DEFAULT_USER_PROFILE.name);
      expect(result.email).toBe(DEFAULT_USER_PROFILE.email);
      expect(result.tier).toBe(DEFAULT_USER_PROFILE.tier);
    });
  });
});
