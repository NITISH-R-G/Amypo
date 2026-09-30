import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { useToast, toast, Toaster, dispatch } from '../../components/ui/use-toast';
import React from 'react';

// Reset memoryState by dismissing all toasts
describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // clear any existing state completely
    act(() => {
        dispatch({ type: "REMOVE_TOAST" });
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('can create a toast and display it', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
        toast({ title: 'Test Toast', description: 'Test Description' });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].description).toBe('Test Description');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('can update a toast', () => {
    const { result } = renderHook(() => useToast());

    let toastRef;
    act(() => {
        toastRef = toast({ title: 'Initial Title', description: 'Initial Description' });
    });

    expect(result.current.toasts[0].title).toBe('Initial Title');

    act(() => {
        toastRef.update({ title: 'Updated Title', description: 'Updated Description' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
    expect(result.current.toasts[0].description).toBe('Updated Description');
  });

  it('can dismiss a toast and removes it after delay', () => {
    const { result } = renderHook(() => useToast());

    let toastRef;
    act(() => {
        toastRef = toast({ title: 'To Dismiss' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
        result.current.dismiss(toastRef.id);
    });

    // Check open state immediately after dismiss
    const dismissedToast = result.current.toasts.find(t => t.id === toastRef.id);
    expect(dismissedToast.open).toBe(false);
    expect(result.current.toasts.length).toBe(1); // Still there, but open is false

    act(() => {
        vi.advanceTimersByTime(10000);
    });

    expect(result.current.toasts.length).toBe(0); // Removed after timeout
  });

  it('can dismiss all toasts and removes them after delay', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
        toast({ title: 'To Dismiss 1' });
        toast({ title: 'To Dismiss 2' });
    });

    act(() => {
        result.current.dismiss();
    });

    result.current.toasts.forEach(t => expect(t.open).toBe(false));

    act(() => {
        vi.advanceTimersByTime(10000);
    });

    expect(result.current.toasts.length).toBe(0); // Removed after timeout
  });

  it('respects TOAST_LIMIT', () => {
     const { result } = renderHook(() => useToast());

     act(() => {
        toast({ title: 'Toast 1' });
        toast({ title: 'Toast 2' });
        toast({ title: 'Toast 3' });
        toast({ title: 'Toast 4' }); // Should push out Toast 1 since limit is 3
     });

     // limit is 3
     expect(result.current.toasts.length).toBe(3);
     expect(result.current.toasts[0].title).toBe('Toast 4');
  });

  it('renders Toaster component properly', () => {
    act(() => {
        toast({ title: 'Rendered Toast', description: 'Rendered Description' });
    });

    render(<Toaster />);

    expect(screen.getByText('Rendered Toast')).toBeInTheDocument();
    expect(screen.getByText('Rendered Description')).toBeInTheDocument();
  });

  it('triggers onOpenChange correctly', () => {
    const { result } = renderHook(() => useToast());
    let t;
    act(() => {
       t = toast({ title: 'Test Open Change' });
    });

    const theToast = result.current.toasts.find(toast => toast.id === t.id);
    act(() => {
       theToast.onOpenChange(false);
    });

    const closedToast = result.current.toasts.find(toast => toast.id === t.id);
    expect(closedToast.open).toBe(false);
  });

  it('does not re-queue removal if already queued', () => {
    const { result } = renderHook(() => useToast());

    let toastRef;
    act(() => {
        toastRef = toast({ title: 'To Dismiss Again' });
    });

    act(() => {
        result.current.dismiss(toastRef.id);
        result.current.dismiss(toastRef.id); // Should hit `toastTimeouts.has`
    });

    act(() => {
        vi.advanceTimersByTime(10000);
    });

    expect(result.current.toasts.length).toBe(0);
  });
});
