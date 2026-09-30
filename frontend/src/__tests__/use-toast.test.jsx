import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '../components/ui/use-toast';

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('adds and dismisses a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test Toast', description: 'This is a test' });
    });

    expect(result.current.toasts.length).toBeGreaterThan(0);
    expect(result.current.toasts[0].title).toBe('Test Toast');

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('updates a toast', () => {
    const { result } = renderHook(() => useToast());

    let newToast;
    act(() => {
      newToast = toast({ title: 'Initial Title' });
    });

    expect(result.current.toasts[0].title).toBe('Initial Title');

    act(() => {
      newToast.update({ title: 'Updated Title' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
  });

  it('removes all toasts when dismiss is called without id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    expect(result.current.toasts.length).toBeGreaterThanOrEqual(2);

    act(() => {
      result.current.dismiss();
    });

    result.current.toasts.forEach(t => {
      expect(t.open).toBe(false);
    });
  });
});
