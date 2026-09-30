import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast, dispatchForTest } from '../components/ui/use-toast';

describe('useToast Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear global toast state before each test
    act(() => {
      dispatchForTest({ type: 'REMOVE_TOAST' });
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('initializes with an empty toast list', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast when toast() is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test Toast', description: 'This is a test.' });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0]).toEqual(expect.objectContaining({
      title: 'Test Toast',
      description: 'This is a test.',
      open: true,
      id: expect.any(String)
    }));
  });

  it('limits toasts to a maximum of 3', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' });
    });

    expect(result.current.toasts.length).toBe(3);
    expect(result.current.toasts[0].title).toBe('Toast 4');
    expect(result.current.toasts[1].title).toBe('Toast 3');
    expect(result.current.toasts[2].title).toBe('Toast 2');
  });

  it('updates an existing toast', () => {
    const { result } = renderHook(() => useToast());

    let toastObj;
    act(() => {
      toastObj = toast({ title: 'Initial Title' });
    });

    expect(result.current.toasts[0].title).toBe('Initial Title');

    act(() => {
      toastObj.update({ title: 'Updated Title' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
  });

  it('dismisses a toast via returned dismiss method', () => {
    const { result } = renderHook(() => useToast());

    let toastObj;
    act(() => {
      toastObj = toast({ title: 'To Be Dismissed' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      toastObj.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('dismisses a toast via useToast dismiss method', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'To Be Dismissed' });
    });

    const toastId = result.current.toasts[0].id;
    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('dismisses all toasts when dismiss is called without an id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    expect(result.current.toasts[0].open).toBe(true);
    expect(result.current.toasts[1].open).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
    expect(result.current.toasts[1].open).toBe(false);
  });

  it('dismisses a toast onOpenChange to false', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test Toast' });
    });

    const toastObj = result.current.toasts[0];
    expect(toastObj.open).toBe(true);

    act(() => {
      toastObj.onOpenChange(false);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('removes a specific toast via REMOVE_TOAST action', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
          toast({ title: 'Toast to Remove' });
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
          dispatchForTest({ type: 'REMOVE_TOAST', toastId });
      });

      expect(result.current.toasts.length).toBe(0);
  });
});
