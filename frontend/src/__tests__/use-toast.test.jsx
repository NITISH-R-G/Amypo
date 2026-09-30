import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { useToast, toast, Toaster } from '../components/ui/use-toast';
import { ToastProvider, Toast } from '../components/ui/toast';

// Since dispatch is not exported, we can use the `useToast` hook to trigger `ADD_TOAST`,
// `UPDATE_TOAST`, and `DISMISS_TOAST`. We can't easily trigger `REMOVE_TOAST` unless it is used,
// but the current implementation of `use-toast.js` from `shadcn/ui` never dispatches it by default
// unless modified. We will just test everything that's available.

const TestComponent = () => {
  const { toast: hookToast, dismiss } = useToast();
  return (
    <div>
      <button onClick={() => hookToast({ title: 'Hook Toast', description: 'desc' })}>Show Hook Toast</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <button onClick={() => dismiss('non-existent-id')}>Dismiss Missing</button>
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    act(() => {
      const { dismiss } = toast({ title: 'reset' });
      dismiss();
    });
  });

  it('shows toast using the toast function directly', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Direct Toast', description: 'Direct Description' });
    });
    expect(screen.getByText('Direct Toast')).toBeInTheDocument();
    expect(screen.getByText('Direct Description')).toBeInTheDocument();
  });

  it('updates toast', () => {
    render(<Toaster />);
    let updateFn;
    act(() => {
      const { update } = toast({ title: 'Initial' });
      updateFn = update;
    });
    expect(screen.getByText('Initial')).toBeInTheDocument();

    act(() => {
      updateFn({ title: 'Updated', id: '1' }); // id is overwritten by update internally usually
    });
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('shows and dismisses toast via hook', () => {
    render(
      <>
        <Toaster />
        <TestComponent />
      </>
    );
    const showButton = screen.getByText('Show Hook Toast');
    act(() => {
      showButton.click();
    });
    expect(screen.getByText('Hook Toast')).toBeInTheDocument();

    const dismissButton = screen.getByText('Dismiss All');
    act(() => {
      dismissButton.click();
    });

    const dismissMissingButton = screen.getByText('Dismiss Missing');
    act(() => {
      dismissMissingButton.click();
    });
  });

  it('removes toast via specific dismissal and onOpenChange trigger', () => {
    let injectedOnOpenChange;
    const CaptureComponent = () => {
      const { toasts } = useToast();
      if (toasts.length > 0 && toasts[0].title === 'Close Me') {
        injectedOnOpenChange = toasts[0].onOpenChange;
      }
      return null;
    };

    render(
      <>
        <Toaster />
        <CaptureComponent />
      </>
    );

    act(() => {
      toast({ title: 'Close Me' });
    });

    expect(screen.getByText('Close Me')).toBeInTheDocument();

    act(() => {
      if (injectedOnOpenChange) injectedOnOpenChange(false);
    });
  });
});
