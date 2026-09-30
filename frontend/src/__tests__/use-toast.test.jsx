import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, Toaster, toast } from '../components/ui/use-toast';

function ToastHelper() {
  const { dismiss } = useToast();
  useEffect(() => {
    dismiss();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'Test Description' })}>
        Add Toast
      </button>
      <button onClick={() => {
        const { id, update } = toast({ title: 'Initial', description: 'Before update' });
        setTimeout(() => update({ id, title: 'Updated', description: 'After update' }), 50);
      }}>
        Add and Update
      </button>
      <Toaster />
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    window.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useRealTimers();
  });

  it('adds a toast', async () => {
    const user = userEvent.setup();
    render(<ToastHelper />);
    const button = screen.getByText('Add Toast');

    await act(async () => {
      await user.click(button);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('updates a toast', async () => {
    const user = userEvent.setup();
    render(<ToastHelper />);
    const button = screen.getByText('Add and Update');

    await act(async () => {
      await user.click(button);
    });

    expect(screen.getByText('Initial')).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('dismisses a toast when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ToastHelper />);
    const button = screen.getByText('Add Toast');

    await act(async () => {
      await user.click(button);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    const closeButton = document.querySelector('button[toast-close=""]');
    expect(closeButton).toBeInTheDocument();

    await act(async () => {
      closeButton.click();
    });

    // The toast might still be in the document with data-state="closed" for animation,
    // so we can check that it's closed, or we can check its presence if the implementation removes it.
    // The reducer marks open: false. But in Radix UI, when open becomes false, the content unmounts or changes state.
    // Since memory state says: "When testing Radix UI Toaster dismissal in Vitest, prefer real timers and synchronous DOM assertions (e.g., expect(element).not.toBeInTheDocument()) rather than fake timers, as the underlying use-toast hook synchronously updates state and removes the component."
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });
});
