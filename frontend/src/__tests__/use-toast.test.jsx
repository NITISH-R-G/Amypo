import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, screen, fireEvent } from '@testing-library/react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import * as React from 'react';

// Wrapper to help test the useToast hook
function ToastTestWrapper() {
  const { toasts, dismiss } = useToast();
  const initRef = React.useRef(false);

  React.useEffect(() => {
    if (!initRef.current) {
      dispatchForTest({ type: "REMOVE_TOAST" });
      initRef.current = true;
    }
  }, []);

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'This is a test' })}>Add Toast</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <Toaster />
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    dispatchForTest({ type: "REMOVE_TOAST" });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('can add and display a toast', async () => {
    render(<ToastTestWrapper />);

    act(() => {
      screen.getByText('Add Toast').click();
    });

    // allow react state update
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });

  it('can dismiss all toasts', async () => {
    render(<ToastTestWrapper />);

    act(() => {
      screen.getByText('Add Toast').click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    act(() => {
      screen.getByText('Dismiss All').click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

  });

  it('updates a toast correctly', async () => {
     render(<ToastTestWrapper />);
     let toastId;
     act(() => {
       const res = toast({ title: 'Update Me' });
       toastId = res.id;
     });

     await act(async () => { await vi.advanceTimersByTimeAsync(0); });
     expect(screen.getByText('Update Me')).toBeInTheDocument();

     act(() => {
       toast({ id: toastId, title: 'Updated' });
     });

     await act(async () => { await vi.advanceTimersByTimeAsync(0); });
     expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('removes a specific toast by id', async () => {
     render(<ToastTestWrapper />);
     let toastId;
     act(() => {
       const res = toast({ title: 'Remove Me' });
       toastId = res.id;
     });

     await act(async () => { await vi.advanceTimersByTimeAsync(0); });
     expect(screen.getByText('Remove Me')).toBeInTheDocument();

     act(() => {
       dispatchForTest({ type: 'REMOVE_TOAST', toastId });
     });

     await act(async () => { await vi.advanceTimersByTimeAsync(0); });
     expect(screen.queryByText('Remove Me')).not.toBeInTheDocument();
  });
});
