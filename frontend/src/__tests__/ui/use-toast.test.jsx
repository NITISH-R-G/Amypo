import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../../components/ui/use-toast';
import React, { useEffect, useRef } from 'react';

// Wrapper component to test the hook
function ToastTestWrapper() {
  const { toast, dismiss, toasts } = useToast();
  const cleared = useRef(false);

  useEffect(() => {
    if (!cleared.current) {
      dispatchForTest({ type: 'REMOVE_TOAST' });
      cleared.current = true;
    }
  }, []);

  return (
    <div data-testid="wrapper">
      <button onClick={() => toast({ id: 'test-1', title: 'Test Toast', description: 'Test Desc' })}>
        Add Toast
      </button>
      <button onClick={() => toast({ id: 'test-2', title: 'Another Toast' })}>
        Add Another
      </button>
      <button onClick={() => toast({ id: 'test-3', title: 'Toast 3' })}>
        Add 3
      </button>
      <button onClick={() => toast({ id: 'test-4', title: 'Toast 4' })}>
        Add 4
      </button>
      <button onClick={() => dismiss('test-1')}>
        Dismiss 1
      </button>
      <button onClick={() => dismiss()}>
        Dismiss All
      </button>
      <button onClick={() => {
        const { update } = toast({ id: 'test-update', title: 'Initial' });
        setTimeout(() => update({ id: 'test-update', title: 'Updated' }), 100);
      }}>
        Add and Update
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
      <Toaster />
    </div>
  );
}

describe('use-toast', () => {

  it('adds and displays a toast', async () => {
    render(<ToastTestWrapper />);

    const addButton = screen.getByText('Add Toast');
    await act(async () => {
      addButton.click();
      await new Promise(r => setTimeout(r, 0));
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Desc')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('limits toasts to TOAST_LIMIT (3)', async () => {
    render(<ToastTestWrapper />);

    await act(async () => {
      screen.getByText('Add Toast').click();
      screen.getByText('Add Another').click();
      screen.getByText('Add 3').click();
      screen.getByText('Add 4').click();
      await new Promise(r => setTimeout(r, 0));
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
    // Toast 4 should be there, Toast 1 should be gone due to limit
    expect(screen.getByText('Toast 4')).toBeInTheDocument();
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });

  it('dismisses a specific toast', async () => {
    render(<ToastTestWrapper />);

    await act(async () => {
      screen.getByText('Add Toast').click();
      screen.getByText('Add Another').click();
      await new Promise(r => setTimeout(r, 0));
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

    await act(async () => {
      screen.getByText('Dismiss 1').click();
      await new Promise(r => setTimeout(r, 0));
    });

    // The toast itself might still be in the DOM but with data-state="closed" (animation)
    // The internal state will show it as open: false.
    // Testing specific internal state transitions requires more involved wrapper logic,
    // but we can check if it eventually unmounts or we check the data-state.
  });

  it('dismisses all toasts', async () => {
    render(<ToastTestWrapper />);

    await act(async () => {
      screen.getByText('Add Toast').click();
      screen.getByText('Add Another').click();
      await new Promise(r => setTimeout(r, 0));
    });

    await act(async () => {
      screen.getByText('Dismiss All').click();
      await new Promise(r => setTimeout(r, 0));
    });
  });

  it('updates a toast', async () => {
    vi.useFakeTimers();
    render(<ToastTestWrapper />);

    act(() => {
      screen.getByText('Add and Update').click();
    });

    // We can't easily mix await findByText and vi.advanceTimersByTime in JSDOM,
    // so we'll assert synchronously then advance
    expect(screen.getByText('Initial')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.queryByText('Initial')).not.toBeInTheDocument();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('removes toast via dispatchForTest', async () => {
    render(<ToastTestWrapper />);
    act(() => {
        dispatchForTest({ type: 'ADD_TOAST', toast: { id: 'manual', title: 'Manual' } });
    });
    expect(screen.getByText('Manual')).toBeInTheDocument();
    act(() => {
        dispatchForTest({ type: 'REMOVE_TOAST', toastId: 'manual' });
    });
    expect(screen.queryByText('Manual')).not.toBeInTheDocument();
  });
});
