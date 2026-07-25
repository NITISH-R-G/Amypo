import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect } from 'react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';

function TestComponent() {
  const { toasts, dismiss } = useToast();

  useEffect(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  }, []);

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'Test Description' })}>
        Add Toast
      </button>
      <button onClick={() => dismiss()}>Dismiss All</button>
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  afterEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  it('adds and displays a toast', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    const addButton = screen.getByText('Add Toast');
    await act(async () => {
      await user.click(addButton);
    });

    expect(await screen.findByText('Test Toast')).toBeInTheDocument();
    expect(await screen.findByText('Test Description')).toBeInTheDocument();
  });

  it('dismisses a toast when close button is clicked', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    // Add toast programmatically, use findByText to wait for it to appear
    act(() => {
      toast({ title: 'Test Toast 2' });
    });
    const toastElement = await screen.findByText('Test Toast 2');
    expect(toastElement).toBeInTheDocument();

    const closeButton = toastElement.closest('li').querySelector('button');
    act(() => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
        expect(screen.queryByText('Test Toast 2')).not.toBeInTheDocument();
    });
  });

  it('limits the number of toasts to 3', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    const addButton = screen.getByText('Add Toast');
    await act(async () => {
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);
    });

    // Give it a moment to render all
    await new Promise(r => setTimeout(r, 100));

    const toastTitles = screen.queryAllByText('Test Toast');
    expect(toastTitles.length).toBe(3);
  });

  it('updates a toast', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    let id, update;
    act(() => {
      const res = toast({ title: 'Initial Title' });
      id = res.id;
      update = res.update;
    });

    expect(await screen.findByText('Initial Title')).toBeInTheDocument();

    act(() => {
      update({ title: 'Updated Title' });
    });

    expect(await screen.findByText('Updated Title')).toBeInTheDocument();
    expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
  });

  it('dismisses all toasts when id is omitted', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    const addButton = screen.getByText('Add Toast');
    await act(async () => {
      await user.click(addButton);
      await user.click(addButton);
    });

    expect(await screen.findAllByText('Test Toast')).toHaveLength(2);

    const dismissAllButton = screen.getByText('Dismiss All');
    await act(async () => {
      await user.click(dismissAllButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    });
  });

});
