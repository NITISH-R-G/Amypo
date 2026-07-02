import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../../../components/ui/use-toast';
import { ToastProvider, ToastViewport } from '../../../components/ui/toast';
import { useEffect, useRef } from 'react';

// Wrapper to test useToast hook
const ToastTestComponent = () => {
  const { toasts, dismiss, update } = useToast();

  useEffect(() => {
    // Clear toast state between tests if dispatchForTest is exposed
    if (typeof dispatchForTest === 'function') {
      dispatchForTest({ type: "REMOVE_TOAST" });
    }
  }, []);

  return (
    <ToastProvider>
      <button onClick={() => toast({ title: 'Test Toast', description: 'This is a test toast' })}>
        Add Toast
      </button>
      <button onClick={() => {
        const { id, update } = toast({ title: 'To Update' });
        setTimeout(() => update({ title: 'Updated Title' }), 100);
      }}>
        Add And Update
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
      {toasts.map(t => (
        <div key={t.id} data-testid={`toast-${t.id}`}>
          <div data-testid={`toast-title-${t.id}`}>{t.title}</div>
          <button onClick={() => dismiss(t.id)}>Dismiss {t.id}</button>
          <button onClick={() => dispatchForTest({ type: "REMOVE_TOAST", toastId: t.id })}>Remove {t.id}</button>
        </div>
      ))}
      <Toaster />
    </ToastProvider>
  );
};

describe('use-toast', () => {
  it('adds, updates, dismisses, and removes toasts', async () => {
    const user = userEvent.setup();
    render(<ToastTestComponent />);

    // Initial state
    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

    // Add toast
    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    expect(screen.getAllByText('Test Toast')[0]).toBeInTheDocument();

    // Add and Update toast
    await user.click(screen.getByText('Add And Update'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

    await waitFor(() => {
      expect(screen.getAllByText('Updated Title')[0]).toBeInTheDocument();
    });

    // Dismiss a toast
    const dismissButtons = screen.getAllByText(/Dismiss/);
    await user.click(dismissButtons[0]);

    // Testing dispatching DISMISS_TOAST without id
    dispatchForTest({ type: "DISMISS_TOAST" });

    // Test remove toast
    const removeButtons = screen.getAllByText(/Remove/);
    await user.click(removeButtons[1]);
  });
});
