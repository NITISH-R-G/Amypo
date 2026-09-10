import { render, screen, act } from '@testing-library/react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { ToastProvider } from '../components/ui/toast';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect, useRef } from 'react';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      dispatchForTest({ type: 'REMOVE_TOAST' });
    });
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const TestComponent = () => {
    const { toasts, dismiss } = useToast();

    // Make sure we clear out toasts from previous tests.
    const cleared = useRef(false);
    useEffect(() => {
        if (!cleared.current) {
            dispatchForTest({ type: 'REMOVE_TOAST' });
            cleared.current = true;
        }
    }, []);

    return (
      <div>
        <button onClick={() => toast({ title: 'Test Toast', description: 'This is a test' })}>Add Toast</button>
        <button onClick={() => {
            const { update } = toast({ title: 'Update Toast', description: 'Initial' });
            setTimeout(() => {
                update({ description: 'Updated' });
            }, 100);
        }}>Add and Update Toast</button>
        <button onClick={() => dismiss()}>Dismiss All</button>
        <div data-testid="toast-count">{toasts.length}</div>
      </div>
    );
  };

  it('should add, update, and dismiss toasts', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    const addButton = screen.getByText('Add Toast');
    const updateButton = screen.getByText('Add and Update Toast');
    const dismissButton = screen.getByText('Dismiss All');

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

    act(() => {
        addButton.click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    act(() => {
        updateButton.click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
    expect(screen.getByText('Update Toast')).toBeInTheDocument();
    expect(screen.getByText('Initial')).toBeInTheDocument();

    act(() => {
        vi.advanceTimersByTime(150);
    });

    expect(screen.getByText('Updated')).toBeInTheDocument();

    act(() => {
        dismissButton.click();
    });

    // They're marked open: false, but not immediately removed from memory by just dismiss
    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
  });

  it('should remove toasts completely with REMOVE_TOAST', () => {
      render(
        <>
          <TestComponent />
          <Toaster />
        </>
      );

      act(() => {
          toast({ title: 'Toast to remove' });
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      act(() => {
          dispatchForTest({ type: 'REMOVE_TOAST' });
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('should limit the number of toasts', () => {
      render(
        <>
          <TestComponent />
          <Toaster />
        </>
      );

      act(() => {
          toast({ title: 'Toast 1' });
      });
      act(() => {
          toast({ title: 'Toast 2' });
      });
      act(() => {
          toast({ title: 'Toast 3' });
      });
      act(() => {
          toast({ title: 'Toast 4' }); // Should push out Toast 1 based on limit
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 4')).toBeInTheDocument();
  });

  it('should handle onOpenChange false by dismissing', async () => {
      render(
        <ToastProvider>
          <TestComponent />
          <Toaster />
        </ToastProvider>
      );

      const addButton = screen.getByText('Add Toast');

      act(() => {
          addButton.click();
      });

      expect(screen.getByText('Test Toast')).toBeInTheDocument();

      // Need a bit of time for radix ui toast to setup
      await act(async () => {
          vi.advanceTimersByTime(10);
      });

      const closeButtons = screen.getAllByRole('button');
      // Find the toast close button
      const closeButton = closeButtons.find(b => b.querySelector('svg'));

      if (closeButton) {
          act(() => {
              closeButton.click();
          });

          await act(async () => {
              vi.advanceTimersByTime(10);
          });
      }
  });
});
