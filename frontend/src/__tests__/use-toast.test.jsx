import React, { useRef, useEffect } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';

function ToastTestWrapper() {
  const { toasts, dismiss } = useToast();
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!clearedRef.current && dispatchForTest) {
      dispatchForTest({ type: 'REMOVE_TOAST' });
      clearedRef.current = true;
    }
  }, []);

  return (
    <div>
      <Toaster />
      <button onClick={() => toast({ title: 'Test Title', description: 'Test Description' })}>
        Add Toast
      </button>
      <button onClick={() => toast({ title: 'Another Title', description: 'Another Description' })}>
        Add Another
      </button>
      <button
        onClick={() => {
          const { id, update } = toast({ title: 'Initial Title' });
          setTimeout(() => update({ id, title: 'Updated Title' }), 50);
        }}
      >
        Add And Update
      </button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <button
        onClick={() => {
          const t = toast({ title: 'To Remove' });
          setTimeout(() => {
            if (dispatchForTest) {
              dispatchForTest({ type: 'REMOVE_TOAST', toastId: t.id });
            }
          }, 50);
        }}
      >
        Add And Remove
      </button>
      <button
        onClick={() => {
          for (let i = 0; i < 5; i++) {
            toast({ title: `Toast ${i}` });
          }
        }}
      >
        Add 5 Toasts
      </button>
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders a toast when added', () => {
    render(<ToastTestWrapper />);

    act(() => {
      screen.getByText('Add Toast').click();
    });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('updates a toast', () => {
    render(<ToastTestWrapper />);

    act(() => {
      screen.getByText('Add And Update').click();
    });
    expect(screen.getByText('Initial Title')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText('Updated Title')).toBeInTheDocument();
  });

  it('dismisses all toasts', () => {
    render(<ToastTestWrapper />);

    act(() => {
      screen.getByText('Add Toast').click();
    });
    act(() => {
      screen.getByText('Add Another').click();
    });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Another Title')).toBeInTheDocument();

    act(() => {
      screen.getByText('Dismiss All').click();
    });
  });

  it('removes a toast directly from memory state', () => {
    render(<ToastTestWrapper />);

    act(() => {
      screen.getByText('Add And Remove').click();
    });
    expect(screen.getByText('To Remove')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.queryByText('To Remove')).not.toBeInTheDocument();
  });

  it('respects TOAST_LIMIT', () => {
    render(<ToastTestWrapper />);

    act(() => {
      screen.getByText('Add 5 Toasts').click();
    });

    expect(screen.getByText('Toast 4')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.queryByText('Toast 0')).not.toBeInTheDocument();
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
  });

  it('closes toast when X button is clicked', () => {
      render(<ToastTestWrapper />);

      act(() => {
        screen.getByText('Add Toast').click();
      });
      expect(screen.getByText('Test Title')).toBeInTheDocument();

      const closeButton = document.querySelector('[toast-close]');
      expect(closeButton).not.toBeNull();

      act(() => {
          closeButton.click();
      });
  });
});
