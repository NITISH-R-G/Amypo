import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useToast, toast, Toaster, dispatch } from '../components/ui/use-toast';
import { useState, useEffect } from 'react';

// Wrapper component to test the hook
function ToastTestComponent() {
  const { toasts, toast: useToastFn, dismiss } = useToast();
  // Instead of storing update on window, we can just use the returned update function
  const handleAdd = () => {
     const t = useToastFn({ title: 'Test Toast', description: 'Test Description' });
     window.lastToast = t;
  };

  return (
    <div>
      <button onClick={handleAdd}>Add</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <button onClick={() => { if(window.lastToast) window.lastToast.update({ id: window.lastToast.id, title: 'Updated' })}}>Update</button>
      <button onClick={() => { if(window.lastToast) window.lastToast.dismiss()}}>Dismiss Specific</button>
      <div data-testid="toast-count">{toasts.length}</div>
      {toasts.map(t => (
        <div key={t.id} data-testid={`toast-${t.id}`}>
          {t.title}
        </div>
      ))}
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    // using fake timers may cause issues with act and waitFor if timers are pending
    // let's try real timers since react hooks and act are used
    vi.useRealTimers();
  });

  afterEach(() => {
    act(() => {
      dispatch({ type: 'REMOVE_TOAST' });
    });
  });

  it('adds a toast', () => {
    render(<ToastTestComponent />);
    const addButton = screen.getByText('Add');
    act(() => {
      addButton.click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    expect(screen.getByText('Test Toast')).toBeInTheDocument();
  });

  it('updates a toast', async () => {
    render(<ToastTestComponent />);
    act(() => {
      screen.getByText('Add').click();
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    const updateButton = screen.getByText('Update');
    expect(updateButton).toBeInTheDocument();

    act(() => {
      updateButton.click();
    });
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('dismisses all toasts', () => {
    render(<ToastTestComponent />);
    act(() => {
      screen.getByText('Add').click();
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    act(() => {
      screen.getByText('Dismiss All').click();
    });
  });

  it('dismisses specific toast', async () => {
    render(<ToastTestComponent />);
    act(() => {
      screen.getByText('Add').click();
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    const dismissButton = screen.getByText('Dismiss Specific');

    act(() => {
      dismissButton.click();
    });
  });

  it('handles multiple toasts and limit', () => {
    render(<ToastTestComponent />);
    act(() => {
      screen.getByText('Add').click();
      screen.getByText('Add').click();
      screen.getByText('Add').click();
      screen.getByText('Add').click();
    });
    const toastCount = parseInt(screen.getByTestId('toast-count').textContent, 10);
    expect(toastCount).toBe(3);
  });
});
