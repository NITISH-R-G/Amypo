import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import React, { useEffect, useRef } from 'react';

// Wrapper component to test useToast hook
function TestComponent() {
  const { toast, dismiss, toasts } = useToast();
  const cleared = useRef(false);

  useEffect(() => {
    if (!cleared.current) {
        if (dispatchForTest) {
          dispatchForTest({ type: 'REMOVE_TOAST' });
        }
        cleared.current = true;
    }
  }, []);

  return (
    <div>
      <button onClick={() => toast({ id: 'test-1', title: 'Test Toast', description: 'Test Description' })}>Add Toast</button>
      <button onClick={() => toast({ id: 'test-2', title: 'Test Toast 2', action: <button>Action</button> })}>Add Toast 2</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <button onClick={() => dismiss('test-1')}>Dismiss One</button>
      <button onClick={() => {
        const { update } = toast({ id: 'test-update', title: 'Initial' });
        setTimeout(() => update({ id: 'test-update', title: 'Updated' }), 10);
      }}>Update Toast</button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should render a toaster and allow adding and dismissing toasts', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    // Add toast
    act(() => {
      screen.getByText('Add Toast').click();
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();

    // Add another toast
    act(() => {
      screen.getByText('Add Toast 2').click();
    });

    expect(screen.getByText('Test Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();

    // Dismiss one
    act(() => {
      screen.getByText('Dismiss One').click();
    });

    // Advance timers for animation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Dismiss all
    act(() => {
      screen.getByText('Dismiss All').click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByText('Test Toast 2')).not.toBeInTheDocument();
  });

  it('should handle toast updates', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    act(() => {
      screen.getByText('Update Toast').click();
    });

    expect(screen.getByText('Initial')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });

    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
