import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import userEvent from '@testing-library/user-event';
import React, { useEffect, useRef } from 'react';

const TestComponent = () => {
  const { toast: hookToast, dismiss } = useToast();

  useEffect(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  }, []);

  return (
    <div>
      <button onClick={() => hookToast({ title: 'Test Toast', description: 'Description', action: <button>Action</button> })}>Add Toast</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <Toaster />
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds and removes a toast', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    await user.click(screen.getByText('Dismiss All'));
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });

  it('handles UPDATE_TOAST via toast return object', async () => {
    let t;
    const UpdateComponent = () => {
      const { toast } = useToast();

      useEffect(() => {
        dispatchForTest({ type: 'REMOVE_TOAST' });
      }, []);

      return (
        <div>
          <button onClick={() => { t = toast({ title: 'Initial' }) }}>Add</button>
          <button onClick={() => { t.update({ title: 'Updated' }) }}>Update</button>
          <button onClick={() => { t.dismiss() }}>Dismiss</button>
          <Toaster />
        </div>
      );
    };

    const user = userEvent.setup();
    render(<UpdateComponent />);

    await user.click(screen.getByText('Add'));
    expect(screen.getByText('Initial')).toBeInTheDocument();

    await user.click(screen.getByText('Update'));
    expect(screen.getByText('Updated')).toBeInTheDocument();

    await user.click(screen.getByText('Dismiss'));
    expect(screen.queryByText('Updated')).not.toBeInTheDocument();
  });

  it('limits the number of toasts', async () => {
    const user = userEvent.setup();
    const LimitComponent = () => {
      const { toast } = useToast();
      useEffect(() => {
        dispatchForTest({ type: 'REMOVE_TOAST' });
      }, []);
      return (
        <div>
          <button onClick={() => toast({ title: 'T1' })}>Add 1</button>
          <button onClick={() => toast({ title: 'T2' })}>Add 2</button>
          <button onClick={() => toast({ title: 'T3' })}>Add 3</button>
          <button onClick={() => toast({ title: 'T4' })}>Add 4</button>
          <Toaster />
        </div>
      )
    };
    render(<LimitComponent />);
    await user.click(screen.getByText('Add 1'));
    await user.click(screen.getByText('Add 2'));
    await user.click(screen.getByText('Add 3'));
    await user.click(screen.getByText('Add 4'));

    // Default limit is 3, wait for rendering
    await waitFor(() => {
      expect(screen.queryByText('T1')).not.toBeInTheDocument();
      expect(screen.getByText('T2')).toBeInTheDocument();
      expect(screen.getByText('T3')).toBeInTheDocument();
      expect(screen.getByText('T4')).toBeInTheDocument();
    });
  });

  it('dismisses toast via close button', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: '' }); // Lucide X icon has no text, might have class or not
    // The close button is rendered as ToastClose
    // We can find it by looking for the close button
    const closeBtns = document.querySelectorAll('[toast-close]');
    act(() => {
      closeBtns[0].click();
    });

    await waitFor(() => {
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    });
  });

  it('dismisses toast via dispatch with undefined id removes all', async () => {
    const MultiComponent = () => {
      const { toast, dismiss } = useToast();
      useEffect(() => {
        dispatchForTest({ type: 'REMOVE_TOAST' });
      }, []);
      return (
        <div>
          <button onClick={() => toast({ title: 'T1' })}>Add 1</button>
          <button onClick={() => toast({ title: 'T2' })}>Add 2</button>
          <button onClick={() => dismiss()}>Dismiss All</button>
          <Toaster />
        </div>
      )
    };
    const user = userEvent.setup();
    render(<MultiComponent />);
    await user.click(screen.getByText('Add 1'));
    await user.click(screen.getByText('Add 2'));
    await user.click(screen.getByText('Dismiss All'));
    expect(screen.queryByText('T1')).not.toBeInTheDocument();
    expect(screen.queryByText('T2')).not.toBeInTheDocument();
  });
});
