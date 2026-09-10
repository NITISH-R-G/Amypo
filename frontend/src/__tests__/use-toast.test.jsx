import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster } from '../components/ui/use-toast';

const ToastTestComponent = () => {
  const { toast, dismiss, toasts } = useToast();

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'Toast description', id: 'test-1' })}>Add Toast</button>
      <button onClick={() => toast({ title: 'Another Toast', description: 'Another desc', id: 'test-another' })}>Add Another Toast</button>
      <button onClick={() => {
        const { update } = toast({ title: 'Updating Toast', id: 'test-update' });
        setTimeout(() => update({ title: 'Updated Toast', id: 'test-update' }), 100);
      }}>Add and Update Toast</button>

      <button onClick={() => dismiss('test-1')}>Dismiss Specific Toast</button>
      <button onClick={() => dismiss()}>Dismiss All Toasts</button>

      <div data-testid="toast-count">{toasts.length}</div>
      <div data-testid="open-count">{toasts.filter(t => t.open).length}</div>

      <Toaster />
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    // Attempt to completely reset the module state by dispatching REMOVE_TOAST indirectly or dismissing everything
    const { dismiss } = toast({ title: 'Clear' });
    dismiss();
  });

  it('adds and renders toasts', async () => {
    const user = userEvent.setup();
    render(<ToastTestComponent />);

    await user.click(screen.getByText('Add Toast'));
    expect(await screen.findByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Toast description')).toBeInTheDocument();
  });

  it('updates toasts', async () => {
    const user = userEvent.setup();
    render(<ToastTestComponent />);

    await user.click(screen.getByText('Add and Update Toast'));
    expect(await screen.findByText('Updating Toast')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Updated Toast')).toBeInTheDocument();
    });
  });

  it('dismisses a specific toast', async () => {
    const user = userEvent.setup();
    render(<ToastTestComponent />);

    // Use the toast function directly so we get the exact ID to dismiss
    let firstToastId;
    let dismissFn;

    await waitFor(() => {
       const res = toast({ title: 'Test Toast', description: 'Toast description' });
       firstToastId = res.id;
       dismissFn = res.dismiss;
    });

    await waitFor(() => {
        toast({ title: 'Another Toast', description: 'Another desc' });
    });

    await waitFor(() => {
      // Sometimes state bleeds from previous test if REMOVE_TOAST hasn't happened.
      // So we wait for the latest two.
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('Another Toast')).toBeInTheDocument();
    });

    const openBefore = parseInt(screen.getByTestId('open-count').textContent, 10);

    // Call the specific dismiss for the first toast
    await waitFor(() => {
      dismissFn();
    });

    await waitFor(() => {
        const openAfter = parseInt(screen.getByTestId('open-count').textContent, 10);
        expect(openAfter).toBe(openBefore - 1);
    });
  });

  it('dismisses all toasts', async () => {
    const user = userEvent.setup();
    render(<ToastTestComponent />);

    await user.click(screen.getByText('Add Toast'));
    await user.click(screen.getByText('Add Another Toast'));

    await waitFor(() => {
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('Another Toast')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Dismiss All Toasts'));

    await waitFor(() => {
        expect(screen.getByTestId('open-count')).toHaveTextContent('0');
    });
  });

  it('respects TOAST_LIMIT', async () => {
      const user = userEvent.setup();
      render(<ToastTestComponent />);

      await user.click(screen.getByText('Add Another Toast'));
      await user.click(screen.getByText('Add Another Toast'));
      await user.click(screen.getByText('Add Another Toast'));
      await user.click(screen.getByText('Add Another Toast'));
      await user.click(screen.getByText('Add Another Toast'));

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
      });
  });
});
