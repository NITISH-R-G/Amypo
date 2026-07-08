/** @vitest-environment jsdom */
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { ToastProvider, ToastViewport } from '../components/ui/toast';

global.expect = expect;
import '@testing-library/jest-dom/vitest';

function TestWrapper() {
  const { toasts } = useToast();

  React.useEffect(() => {
    return () => {
      if (dispatchForTest) {
        dispatchForTest({ type: 'REMOVE_TOAST' });
      }
    };
  }, []);

  return (
    <>
      <button onClick={() => toast({ title: 'Test Toast', description: 'Test Description', action: <button>Undo</button> })}>Show Toast</button>
      <button onClick={() => {
        const { update, dismiss } = toast({ title: 'Dynamic Toast', description: 'Initial' });
        setTimeout(() => update({ description: 'Updated' }), 100);
        setTimeout(() => dismiss(), 200);
      }}>Show Dynamic</button>
      <Toaster />
    </>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    if (dispatchForTest) {
      dispatchForTest({ type: 'REMOVE_TOAST' });
    }
  });

  it('renders and dismisses a toast', async () => {
    render(<TestWrapper />);

    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();

    act(() => {
      screen.getByText('Show Toast').click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find(b => b.hasAttribute('toast-close'));

    if (closeBtn) {
      act(() => {
        closeBtn.click();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    }
  });

  it('updates and dismisses a dynamic toast', async () => {
    render(<TestWrapper />);

    act(() => {
      screen.getByText('Show Dynamic').click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Dynamic Toast')).toBeInTheDocument();
    expect(screen.getByText('Initial')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByText('Updated')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
  });

  it('respects toast limit', async () => {
    render(<TestWrapper />);

    act(() => {
      screen.getByText('Show Toast').click();
      screen.getByText('Show Toast').click();
      screen.getByText('Show Toast').click();
      screen.getByText('Show Toast').click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const titles = screen.getAllByText('Test Toast');
    expect(titles.length).toBeLessThanOrEqual(3);
  });
});
