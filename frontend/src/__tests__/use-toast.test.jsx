import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';

describe('use-toast', () => {
  beforeEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const TestComponent = () => {
    const { toasts, dismiss } = useToast();
    return (
      <div>
        {toasts.map((t) => (
          <div key={t.id} data-testid="toast-item">
            <span>{t.title}</span>
            <button onClick={() => dismiss(t.id)}>Dismiss</button>
          </div>
        ))}
      </div>
    );
  };

  it('adds and displays a toast', () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    act(() => {
      toast({ title: 'New Toast' });
    });

    expect(screen.getAllByText('New Toast').length).toBeGreaterThan(0);
    const toastItems = screen.getAllByTestId('toast-item');
    expect(toastItems).toHaveLength(1);
  });

  it('updates an existing toast', () => {
    render(<TestComponent />);

    let toastId;
    act(() => {
      const { id } = toast({ title: 'Original Toast' });
      toastId = id;
    });

    expect(screen.getByText('Original Toast')).toBeInTheDocument();

    act(() => {
      const t = toast({ title: 'Updated Toast' });
      t.update({ id: toastId, title: 'Updated Toast' });
    });

    expect(screen.getByText('Updated Toast')).toBeInTheDocument();
  });

  it('dismisses a specific toast', () => {
    render(<TestComponent />);

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();

    const dismissBtns = screen.getAllByText('Dismiss');
    act(() => {
      dismissBtns[0].click();
    });

    act(() => {
      dispatchForTest({ type: 'REMOVE_TOAST', toastId: dismissBtns[0].closest('div').id });
    });
  });

  it('dismisses all toasts', () => {
    render(<TestComponent />);

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    act(() => {
      const { dismiss } = toast({ title: 'Toast 3' });
      dismiss();
    });

    act(() => {
      dispatchForTest({ type: 'DISMISS_TOAST' });
    });
  });

  it('enforces toast limit', () => {
    render(<TestComponent />);

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' });
    });

    const items = screen.getAllByTestId('toast-item');
    expect(items.length).toBe(3);
    expect(screen.getByText('Toast 4')).toBeInTheDocument();
  });
});
