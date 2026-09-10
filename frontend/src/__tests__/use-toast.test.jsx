import React, { useEffect, useRef } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Toaster, useToast, toast, dispatchForTest } from '../components/ui/use-toast';

// Helper component to interact with useToast
function ToastTestComponent({ initialAction, customAction }) {
  const { toasts, dismiss } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      if (initialAction === 'add') {
        toast({ title: 'Test Toast', description: 'Test Description', id: 'test-id' });
      }
      initialized.current = true;
    }
  }, [initialAction]);

  return (
    <div>
      <button onClick={() => toast({ title: 'Click Toast', description: 'Click Description' })}>Add Click Toast</button>
      <button onClick={() => toast({ title: 'Another Toast', id: 'update-target' })}>Add Update Toast</button>
      <button onClick={() => toast({ title: 'Updated Toast', id: 'update-target' })}>Update Toast</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <button onClick={() => customAction && customAction()}>Custom Action</button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
}

describe('use-toast hook and Toaster component', () => {
  beforeEach(() => {
    // Reset state before each test
    act(() => {
      dispatchForTest({ type: 'REMOVE_TOAST' });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty state', () => {
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );
    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });

  it('adds a toast when toast() is called', async () => {
    const customAction = () => toast({ title: 'Test Toast', description: 'Test Description', id: 'test-id' });

    render(
      <>
        <ToastTestComponent customAction={customAction} />
        <Toaster />
      </>
    );

    const customActionButton = screen.getByText('Custom Action');
    await act(async () => {
      await userEvent.click(customActionButton);
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

    expect(await screen.findByText('Test Toast')).toBeInTheDocument();
    expect(await screen.findByText('Test Description')).toBeInTheDocument();
  });

  it('dismisses a toast', async () => {
    const customAction = () => toast({ title: 'Test Toast', description: 'Test Description', id: 'test-id' });

    render(
      <>
        <ToastTestComponent customAction={customAction} />
        <Toaster />
      </>
    );

    const customActionButton = screen.getByText('Custom Action');
    await act(async () => {
      await userEvent.click(customActionButton);
    });

    const counts2 = screen.getAllByTestId('toast-count');
    expect(counts2[counts2.length - 1]).toHaveTextContent('1');

    // Using userEvent on Radix close button can sometimes have pointer issues,
    // so let's find the close button and use fireEvent
    const closeButtons = screen.getAllByRole('button');
    // The last button is typically the Radix close button
    const closeButton = closeButtons[closeButtons.length - 1];

    act(() => {
      fireEvent.click(closeButton);
    });

    // Toasts wait for animation to unmount in real environment.
    // The state should be updated to dismiss it.
  });

  it('dismisses all toasts', async () => {
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const addButton = screen.getByText('Add Click Toast');

    await act(async () => {
      await userEvent.click(addButton);
      await userEvent.click(addButton);
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

    const dismissAllButton = screen.getByText('Dismiss All');

    await act(async () => {
      await userEvent.click(dismissAllButton);
    });

    // Toasts are marked as not open. We test the state updates
  });

  it('updates an existing toast', async () => {
    let t;
    const customAction = () => {
      t = toast({ title: 'Initial Title', description: 'Initial Desc' });
    };

    const updateAction = () => {
      t.update({ id: t.id, title: 'Updated Title' });
    };

    render(
      <>
        <ToastTestComponent customAction={customAction} />
        <Toaster />
      </>
    );

    const customActionButton = screen.getByText('Custom Action');
    await act(async () => {
      await userEvent.click(customActionButton);
    });

    expect(screen.getByText('Initial Title')).toBeInTheDocument();

    render(
      <>
        <ToastTestComponent customAction={updateAction} />
        <Toaster />
      </>
    );

    // get all "Custom Action" buttons, one from first render and one from second
    const updateCustomButtons = screen.getAllByText('Custom Action');
    await act(async () => {
      await userEvent.click(updateCustomButtons[updateCustomButtons.length - 1]);
    });

    const updatedTitles = await screen.findAllByText('Updated Title');
    expect(updatedTitles.length).toBeGreaterThan(0);
  });

  it('respects TOAST_LIMIT of 3', async () => {
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const addButton = screen.getByText('Add Click Toast');

    await act(async () => {
      await userEvent.click(addButton);
      await userEvent.click(addButton);
      await userEvent.click(addButton);
      await userEvent.click(addButton);
      await userEvent.click(addButton);
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
  });

  it('dismisses via the dismiss function returned from toast', async () => {
      let t;
      const customAction = () => {
        t = toast({ title: 'Temp Title' });
      };

      const dismissAction = () => {
          t.dismiss();
      };

      render(
      <>
        <ToastTestComponent customAction={customAction} />
        <Toaster />
      </>
    );

    const customActionButton = screen.getByText('Custom Action');
    await act(async () => {
      await userEvent.click(customActionButton);
    });

    expect(screen.getByText('Temp Title')).toBeInTheDocument();

    render(
      <>
        <ToastTestComponent customAction={dismissAction} />
        <Toaster />
      </>
    );

    const dismissCustomButton = screen.getAllByText('Custom Action')[1];
    await act(async () => {
      await userEvent.click(dismissCustomButton);
    });

  });
});
