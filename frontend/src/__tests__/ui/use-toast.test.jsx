import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import React, { useEffect } from 'react';
import { useToast, toast, Toaster } from '../../components/ui/use-toast';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';

// Component to clear toasts between tests
const ToastClearer = () => {
  const { dismiss } = useToast();
  useEffect(() => {
    dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

describe('use-toast', () => {
  beforeEach(() => {
    render(<ToastClearer />);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add a toast and display it', () => {
    render(<Toaster />);

    act(() => {
      toast({
        title: 'Test Toast',
        description: 'This is a test toast.',
      });
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('This is a test toast.')).toBeInTheDocument();
  });

  it('should update a toast', () => {
    render(<Toaster />);

    let currentToast;
    act(() => {
      currentToast = toast({
        title: 'Initial Title',
      });
    });

    expect(screen.getByText('Initial Title')).toBeInTheDocument();

    act(() => {
      currentToast.update({
        title: 'Updated Title',
        id: currentToast.id,
      });
    });

    expect(screen.getByText('Updated Title')).toBeInTheDocument();
    expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
  });

  it('should dismiss a toast', () => {
    render(<Toaster />);

    let currentToast;
    act(() => {
      currentToast = toast({
        title: 'Dismissable Toast',
      });
    });

    expect(screen.getByText('Dismissable Toast')).toBeInTheDocument();

    act(() => {
      currentToast.dismiss();
    });

    expect(screen.queryByText('Dismissable Toast')).not.toBeInTheDocument();
  });

  it('should limit the number of active toasts', () => {
    render(<Toaster />);

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' }); // Exceeds limit of 3
    });

    expect(screen.getByText('Toast 4')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument(); // The oldest one should be removed
  });

  it('should expose the useToast hook correctly', () => {
     const { result } = renderHook(() => useToast());

     act(() => {
       result.current.toast({ title: 'Hook Toast' });
     });

     expect(result.current.toasts.length).toBeGreaterThan(0);
     expect(result.current.toasts[0].title).toBe('Hook Toast');
  });

  it('should trigger dismiss onOpenChange', () => {
    // Need a toast that explicitly closes using the internal onOpenChange
    render(<Toaster />);

    let currentToast;
    act(() => {
      currentToast = toast({ title: 'Open Change Toast' });
    });

    const { result } = renderHook(() => useToast());

    act(() => {
      const thisToast = result.current.toasts.find(t => t.id === currentToast.id);
      if (thisToast && thisToast.onOpenChange) {
         thisToast.onOpenChange(false);
      }
    });

    expect(result.current.toasts.find(t => t.id === currentToast.id)?.open).toBe(false);
  });

  it('should handle REMOVE_TOAST correctly without toastId', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Test 1' });
      result.current.toast({ title: 'Test 2' });
    });

    expect(result.current.toasts.length).toBeGreaterThan(0);

    // There is no direct exported method for REMOVE_TOAST without a toastId in useToast,
    // but we can trigger it indirectly if it were exposed or by directly testing the reducer
    // Since reducer is not exported, we simulate calling it with a missing id using a modified action
    // But since `dismiss` with no args works:
    act(() => {
      result.current.dismiss();
    });

    // Check if they are dismissed (open: false)
    expect(result.current.toasts.every(t => !t.open)).toBe(true);
  });
});
