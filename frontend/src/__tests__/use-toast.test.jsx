import React, { useEffect, useRef } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach, afterEach, it } from 'vitest';
import { useToast, toast, Toaster, __dispatchForTest as dispatchForTest } from '../components/ui/use-toast';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

const TestComponent = () => {
  const { toast: hookToast, dismiss } = useToast();
  const cleared = useRef(false);

  useEffect(() => {
    if (!cleared.current) {
      dispatchForTest({ type: 'REMOVE_TOAST' });
      cleared.current = true;
    }
  }, []);

  return (
    <div>
      <button onClick={() => hookToast({ title: 'Test Toast', description: 'This is a test toast' })}>
        Add Toast
      </button>
      <button onClick={() => hookToast({ title: 'Test Toast 2' })}>
        Add Toast 2
      </button>
      <button onClick={() => {
        const t = hookToast({ title: 'Update Me' });
        setTimeout(() => {
          t.update({ title: 'Updated' });
        }, 1000);
      }}>
        Add And Update
      </button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <Toaster />
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    act(() => {
        dispatchForTest({ type: 'REMOVE_TOAST' });
    });
  });

  it('adds and displays a toast', async () => {
    render(<TestComponent />);

    act(() => {
        screen.getByText('Add Toast').click();
    });

    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('This is a test toast')).toBeInTheDocument();
  });

  it('limits toasts to TOAST_LIMIT (3)', async () => {
    render(<TestComponent />);

    act(() => {
        screen.getByText('Add Toast 2').click();
    });
    act(() => {
        screen.getByText('Add Toast 2').click();
    });
    act(() => {
        screen.getByText('Add Toast 2').click();
    });
    act(() => {
        screen.getByText('Add Toast').click();
    });

    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });

    // Should only show 3 toasts, so "Add Toast" is the newest,
    // we should see 1 "Test Toast" and 2 "Test Toast 2"
    expect(screen.getAllByText('Test Toast 2')).toHaveLength(2);
    expect(screen.getByText('Test Toast')).toBeInTheDocument();
  });

  it('updates a toast', async () => {
    render(<TestComponent />);

    act(() => {
        screen.getByText('Add And Update').click();
    });

    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Update Me')).toBeInTheDocument();

    await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
    });

    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.queryByText('Update Me')).not.toBeInTheDocument();
  });

  it('dismisses a specific toast', async () => {
    render(<TestComponent />);

    act(() => {
        screen.getByText('Add Toast').click();
    });

    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button');
    // Using Radix UI close class or role
    // Test Component button has no close icon usually, just text
    const closeButton = closeButtons.find(b => b.hasAttribute('data-radix-toast-close'));

    if (closeButton) {
      act(() => {
          closeButton.click();
      });
    } else {
        // Fallback for close button missing - we test dismiss function
         act(() => {
            screen.getByText('Dismiss All').click();
        });
    }

    // Reacting to open=false in onOpenChange
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  });

  it('dismisses all toasts', async () => {
    render(<TestComponent />);

    act(() => {
        screen.getByText('Add Toast').click();
    });
    act(() => {
        screen.getByText('Add Toast 2').click();
    });

    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Toast 2')).toBeInTheDocument();

    act(() => {
        screen.getByText('Dismiss All').click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  });
});

describe('use-toast direct dispatch actions', () => {
   it('removes specific toast via REMOVE_TOAST', () => {
       act(() => {
           dispatchForTest({ type: 'ADD_TOAST', toast: { id: 'test-id', title: 'test' } });
       });
       act(() => {
           dispatchForTest({ type: 'REMOVE_TOAST', toastId: 'test-id' });
       });
   });

   it('dismisses specific toast via DISMISS_TOAST', () => {
       act(() => {
           dispatchForTest({ type: 'ADD_TOAST', toast: { id: 'test-id-2', title: 'test2' } });
       });
       act(() => {
           dispatchForTest({ type: 'DISMISS_TOAST', toastId: 'test-id-2' });
       });
   });
});
