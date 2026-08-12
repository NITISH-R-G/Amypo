import { describe, it, expect } from 'vitest';
import { cn } from '../utils/utils';

describe('utils cn function', () => {
  it('merges class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional class names with clsx', () => {
    expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');
  });

  it('merges tailwind classes overriding correctly with twMerge', () => {
    expect(cn('px-2 py-1 bg-red-500', 'p-3 bg-blue-500')).toBe('p-3 bg-blue-500');
  });
});
