import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '../components/ui/use-toast';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useToast', () => {
  // We need to clean up the module-level state between tests
  afterEach(() => {
    const { result } = renderHook(() => useToast());
    act(() => {
      // Dismiss all toasts
      if (result && result.current && result.current.toasts) {
        result.current.toasts.forEach(t => result.current.dismiss(t.id));
      }
    });
  });

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test Toast', description: 'Test Description' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].description).toBe('Test Description');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('should update a toast', () => {
    const { result } = renderHook(() => useToast());
    let updateFn;

    act(() => {
      const t = toast({ title: 'Initial Title' });
      updateFn = t.update;
    });

    expect(result.current.toasts[0].title).toBe('Initial Title');

    act(() => {
      updateFn({ title: 'Updated Title' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
  });

  it('should dismiss a toast', () => {
    const { result } = renderHook(() => useToast());
    let dismissFn;
    let toastId;

    act(() => {
      const t = toast({ title: 'To Be Dismissed' });
      dismissFn = t.dismiss;
      toastId = t.id;
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      dismissFn();
    });

    const targetToast = result.current.toasts.find((t) => t.id === toastId);
    expect(targetToast.open).toBe(false);
  });

  it('should limit the number of toasts to TOAST_LIMIT (3)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' });
    });

    expect(result.current.toasts).toHaveLength(3);
    // Because it slices from the start, Toast 4, 3, 2 should remain
    expect(result.current.toasts[0].title).toBe('Toast 4');
    expect(result.current.toasts[1].title).toBe('Toast 3');
    expect(result.current.toasts[2].title).toBe('Toast 2');
  });
});
