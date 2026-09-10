import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useToast, toast, Toaster } from '../components/ui/use-toast';
import { useEffect } from 'react';
import { act } from 'react';

// Helper component to bind useToast logic inside a test component
function ClearComponent() {
  const { dismiss } = useToast();
  useEffect(() => {
    dismiss();
  }, []);
  return null;
}

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const { unmount } = render(<ClearComponent />);
    act(() => {
      vi.runAllTimers();
    });
    unmount();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('adds and updates a toast directly using toast()', () => {
    let t;
    act(() => {
      t = toast({ title: 'Initial Title' });
    });

    const { unmount } = render(<Toaster />);
    expect(screen.getByText('Initial Title')).toBeInTheDocument();

    act(() => {
      t.update({ title: 'Updated Title' });
    });
    expect(screen.getByText('Updated Title')).toBeInTheDocument();

    unmount();
  });

  it('dismisses a toast directly using dismiss()', () => {
    let t;
    act(() => {
      t = toast({ title: 'To Be Dismissed' });
    });

    const { unmount } = render(<Toaster />);
    expect(screen.getByText('To Be Dismissed')).toBeInTheDocument();

    act(() => {
      t.dismiss();
    });
    unmount();
  });

  it('can create multiple toasts up to the limit', () => {
    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' }); // Should push out Toast 1 if limit is 3
    });

    const { unmount } = render(<Toaster />);

    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 4')).toBeInTheDocument();

    unmount();
  });

  // Adding test that manually dispatches REMOVE_TOAST indirectly or via a helper
  // Wait, there's no way to dispatch REMOVE_TOAST from the outside because `dispatch` is internal and not exposed.
  // Wait, we can test onOpenChange from toast which triggers dismiss, but dismiss uses DISMISS_TOAST.
  // In `use-toast.jsx` REMOVE_TOAST is only inside the reducer and is never called from `toast` or `useToast` or `Toaster`.
  // It's completely unused code.
});
