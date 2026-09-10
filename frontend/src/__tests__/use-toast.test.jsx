import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { useEffect, useRef } from 'react';

// Wrapper component to use the hook and Toaster
function ToastTestWrapper() {
  const { toast: hookToast, dismiss } = useToast();
  const initialized = useRef(false);

  // Clear toasts on mount to avoid state bleed
  useEffect(() => {
    if (!initialized.current) {
      dispatchForTest({ type: 'REMOVE_TOAST' });
      initialized.current = true;
    }
  }, []);

  return (
    <div>
      <Toaster />
      <button onClick={() => hookToast({ title: 'Test Toast', description: 'Test Description' })}>Add Toast</button>
      <button onClick={() => {
        const { id, update } = hookToast({ title: 'Old Title', description: 'Old Description' });
        setTimeout(() => update({ title: 'New Title', description: 'New Description', id }), 100);
      }}>Update Toast</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    // Reset global timers to avoid bleed
    vi.useRealTimers();
  });

  it('adds and renders a toast', async () => {
    const user = userEvent.setup();
    render(<ToastTestWrapper />);

    const addButton = screen.getByText('Add Toast');
    await act(async () => {
      await user.click(addButton);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('updates a toast', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ToastTestWrapper />);

    const updateButton = screen.getByText('Update Toast');
    await act(async () => {
      updateButton.click();
    });

    expect(screen.getByText('Old Title')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByText('New Title')).toBeInTheDocument();
    expect(screen.getByText('New Description')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('dismisses all toasts', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ToastTestWrapper />);

    const addButton = screen.getByText('Add Toast');
    await act(async () => {
      addButton.click();
      addButton.click();
    });

    const toasts = screen.getAllByText('Test Toast');
    expect(toasts).toHaveLength(2);

    const dismissButton = screen.getByText('Dismiss All');

    await act(async () => {
       dismissButton.click();
    });

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    // Toasts are hidden or removed
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
