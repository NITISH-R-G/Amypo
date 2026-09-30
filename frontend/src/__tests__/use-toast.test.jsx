import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast, dispatch } from '../components/ui/use-toast';

describe('useToast', () => {
  beforeEach(() => {
    // Clear toast memory state before each test
    dispatch({ type: "REMOVE_TOAST" });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('adds a toast correctly', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test Toast', description: 'This is a test' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('updates an existing toast', () => {
    const { result } = renderHook(() => useToast());

    let toastInstance;
    act(() => {
      toastInstance = toast({ title: 'Original Title' });
    });

    expect(result.current.toasts[0].title).toBe('Original Title');

    act(() => {
      toastInstance.update({ title: 'Updated Title' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
  });

  it('dismisses a specific toast', () => {
    const { result } = renderHook(() => useToast());

    let toastInstance;
    act(() => {
      toastInstance = toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[1].open).toBe(true);

    act(() => {
      toastInstance.dismiss();
    });

    // The dismissed toast should still exist in state but have open: false
    const dismissedToast = result.current.toasts.find(t => t.id === toastInstance.id);
    expect(dismissedToast.open).toBe(false);
  });

  it('dismisses all toasts when no ID is provided', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Toast 1' });
        toast({ title: 'Toast 2' });
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0].open).toBe(true);
      expect(result.current.toasts[1].open).toBe(true);

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.toasts[0].open).toBe(false);
      expect(result.current.toasts[1].open).toBe(false);
  });

  it('respects the toast limit of 3', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' }); // This should push out Toast 1
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].title).toBe('Toast 4');
    expect(result.current.toasts[2].title).toBe('Toast 2');
  });

  it('removes toast via REMOVE_TOAST action with ID', () => {
      const { result } = renderHook(() => useToast());

      let t;
      act(() => {
        t = toast({ title: 'Toast 1' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        dispatch({ type: 'REMOVE_TOAST', toastId: t.id });
      });

      expect(result.current.toasts).toHaveLength(0);
  });
});
