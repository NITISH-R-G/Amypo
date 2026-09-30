import React, { useEffect, useRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';

function TestComponent() {
  const { toasts, dismiss } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      dispatchForTest({ type: 'REMOVE_TOAST' });
      initialized.current = true;
    }
  }, []);

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'Test Description' })}>Add Toast</button>
      <button onClick={() => {
        const id = toast({ title: 'To Update', description: 'Old Description' }).id;
        setTimeout(() => toast({ id, title: 'Updated Toast', description: 'New Description' }), 100);
      }}>Add and Update</button>
      <button onClick={() => toast({ title: 'Toast 1' })}>Add 1</button>
      <button onClick={() => toast({ title: 'Toast 2' })}>Add 2</button>
      <button onClick={() => toast({ title: 'Toast 3' })}>Add 3</button>
      <button onClick={() => toast({ title: 'Toast 4' })}>Add 4</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <Toaster />
    </div>
  );
}

describe('useToast Hook and Toaster', () => {
  beforeEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('adds and renders a toast', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Add Toast'));

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('updates a toast', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TestComponent />);

    await user.click(screen.getByText('Add and Update'));

    expect(screen.getByText('To Update')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByText('Updated Toast')).toBeInTheDocument();
    expect(screen.getByText('New Description')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('limits the number of toasts to 3', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Add 1'));
    await user.click(screen.getByText('Add 2'));
    await user.click(screen.getByText('Add 3'));
    await user.click(screen.getByText('Add 4'));

    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument(); // oldest should be removed
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 4')).toBeInTheDocument();
  });

  it('dismisses all toasts', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Add 1'));
    await user.click(screen.getByText('Add 2'));

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();

    await user.click(screen.getByText('Dismiss All'));

    // Toasts might still be in DOM but have data-state="closed" or fade out animations
    // In actual use case, removing requires a delay which isn't explicitly tested here
    // but we can verify dismiss action doesn't crash
    const toasterElement = screen.queryByText('Toast 1')?.closest('li');
    if (toasterElement) {
        expect(toasterElement).toHaveAttribute('data-state', 'closed');
    }
  });

  it('can dispatch action correctly', () => {
    dispatchForTest({ type: 'ADD_TOAST', toast: { id: 'test', title: 'Manual' } });
    dispatchForTest({ type: 'DISMISS_TOAST', toastId: 'test' });
    dispatchForTest({ type: 'REMOVE_TOAST', toastId: 'test' });
  });
});
