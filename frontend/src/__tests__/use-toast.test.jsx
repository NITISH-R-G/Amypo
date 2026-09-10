import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';

function TestComponent() {
  const { toast, dismiss } = useToast();

  return (
    <div>
      <button onClick={() => {
        const { update, id } = toast({ title: 'Test Toast', description: 'Test Description', action: <button>Action</button> });
        setTimeout(() => update({ id: id, title: 'Updated Toast', description: 'Updated Description' }), 200);
      }}>Show Toast</button>
      <button onClick={() => {
        toast({ title: 'Test Toast 2', description: 'Test Description 2' });
      }}>Show Toast 2</button>
      <button onClick={() => {
        dismiss();
      }}>Dismiss All</button>
      <Toaster />
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  it('renders multiple toasts and dismisses all', async () => {
    render(<TestComponent />);

    await act(async () => {
      screen.getByText('Show Toast').click();
    });

    expect(await screen.findByText('Test Toast')).toBeInTheDocument();

    await act(async () => {
      screen.getByText('Show Toast 2').click();
    });

    expect(await screen.findByText('Test Toast 2')).toBeInTheDocument();

    await act(async () => {
      screen.getByText('Dismiss All').click();
    });

    await waitFor(() => {
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Toast 2')).not.toBeInTheDocument();
    });
  });

  it('updates a toast and handles individual dismiss', async () => {
    render(<TestComponent />);

    await act(async () => {
      screen.getByText('Show Toast').click();
    });

    expect(await screen.findByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Updated Toast')).toBeInTheDocument();
    });

    // click close button
    const closeBtn = document.querySelector('button[toast-close]');
    await act(async () => {
      if (closeBtn) closeBtn.click();
    });

    await waitFor(() => {
      expect(screen.queryByText('Updated Toast')).not.toBeInTheDocument();
    });
  });
});
