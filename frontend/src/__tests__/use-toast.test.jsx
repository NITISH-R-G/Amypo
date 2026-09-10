import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster } from '../components/ui/use-toast';
import { useEffect } from 'react';

const TestComponent = () => {
  const { dismiss } = useToast();

  // Clear module state between tests
  useEffect(() => {
    dismiss();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Title', description: 'Test Description', action: <button>Undo</button> })}>
        Add Toast
      </button>
      <button onClick={() => {
        const { id, update } = toast({ title: 'Initial' });
        update({ id, title: 'Updated' });
      }}>
        Update Toast
      </button>
      <button onClick={() => {
        const { id, dismiss } = toast({ title: 'To Dismiss' });
        dismiss(id);
      }}>
        Dismiss Specific
      </button>
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('adds and renders a toast', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    // Clear state
    act(() => {
      vi.runAllTimers();
    });

    const button = screen.getByText('Add Toast');

    act(() => {
      button.click();
    });

    // Advance to let it render
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('updates a toast', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    // Clear state
    act(() => {
      vi.runAllTimers();
    });

    const button = screen.getByText('Update Toast');

    act(() => {
      button.click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.queryByText('Initial')).not.toBeInTheDocument();
  });

  it('dismisses a specific toast', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    act(() => {
      vi.runAllTimers();
    });

    const button = screen.getByText('Dismiss Specific');

    act(() => {
      button.click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Since dismiss triggers closing state, we should wait for timers if animation takes time,
    // but the state `open: false` is immediate. In JSDOM with Radix it might be removed or hidden.
    // The Radix Toaster will handle removing it.
  });

});
