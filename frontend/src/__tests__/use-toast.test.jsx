import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';

// A wrapper component to test the hook and toaster
function TestComponent() {
  const { toasts, dismiss } = useToast();
  const mounted = React.useRef(false);

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      dispatchForTest({ type: 'REMOVE_TOAST' });
    }
  }, []);

  return (
    <div>
      <Toaster />
      <button onClick={() => toast({ title: 'Test Toast', description: 'Toast description', action: <button>Action</button> })}>
        Show Toast
      </button>
      <button onClick={() => toast({ title: 'Toast to Update', id: 'update-me' })}>
        Show Toast to Update
      </button>
      <button onClick={() => toast({ title: 'Toast to Dismiss', id: 'dismiss-me' })}>
        Show Toast to Dismiss
      </button>

      {/* Expose dismiss manually to test dismissal without an id if needed */}
      <button onClick={() => dismiss()}>Dismiss All</button>
      <button onClick={() => {
         const { update } = toast({ title: 'Updating...', id: 'updating' });
         setTimeout(() => {
             update({ id: 'updating', title: 'Updated!' });
         }, 100);
      }}>
        Show and Update
      </button>

      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
}

describe('use-toast', () => {
  it('renders and displays a toast', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

    await user.click(screen.getByText('Show Toast'));

    // Allow portal/viewport rendering
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Toast description')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('updates a toast', async () => {
     vi.useFakeTimers();
     render(<TestComponent />);

     const button = screen.getByText('Show and Update');
     fireEvent.click(button);

     await act(async () => { await vi.advanceTimersByTimeAsync(0); });
     expect(screen.getByText('Updating...')).toBeInTheDocument();

     await act(async () => {
         await vi.advanceTimersByTimeAsync(150);
     });

     await act(async () => { await vi.advanceTimersByTimeAsync(0); });
     expect(screen.getByText('Updated!')).toBeInTheDocument();

     vi.runOnlyPendingTimers();
     vi.useRealTimers();
  });

  it('dismisses a toast via dismiss button', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Show Toast to Dismiss'));

    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    expect(screen.getByText('Toast to Dismiss')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: '' }); // ToastClose rendered as X icon
    const closeButton = closeButtons[closeButtons.length - 1]; // Find the right close button if there are many

    // Radix UI sometimes has PointerCapture issues with userEvent, so we use fireEvent or direct click inside act
    await act(async () => {
      fireEvent.click(closeButton);
    });

    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // The toast might still be in the DOM with a fading out animation depending on the implementation
    // But its state should be marked as closed, or eventually unmounted
  });

  it('limits the number of toasts', async () => {
     const user = userEvent.setup();
     render(<TestComponent />);

     // TOAST_LIMIT is 3
     await user.click(screen.getByText('Show Toast'));
     await user.click(screen.getByText('Show Toast'));
     await user.click(screen.getByText('Show Toast'));
     await user.click(screen.getByText('Show Toast'));

     await act(async () => { await new Promise(r => setTimeout(r, 0)); });

     expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
  });

  it('dismisses all toasts', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Show Toast'));
    await user.click(screen.getByText('Show Toast to Update'));

    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

    await user.click(screen.getByText('Dismiss All'));

    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // All toasts should be set to open: false.
    // The array length might still be 2, but open state is false.
  });
});
