import React, { useEffect, useRef } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';

describe('use-toast', () => {
  const TestComponent = () => {
    const { toast: hookToast, dismiss } = useToast();

    // Clear state before running a test instance
    const initialClearDone = useRef(false);
    useEffect(() => {
      if (!initialClearDone.current) {
         dispatchForTest({ type: "REMOVE_TOAST" });
         initialClearDone.current = true;
      }
    }, []);

    return (
      <div>
        <button onClick={() => hookToast({ title: 'Hook Toast', description: 'desc hook', action: <button>Action</button> })}>Add Hook Toast</button>
        <button onClick={() => toast({ title: 'Direct Toast', description: 'desc direct' })}>Add Direct Toast</button>
        <button onClick={() => {
           const { update } = toast({ title: 'Initial' });
           setTimeout(() => update({ title: 'Updated' }), 100);
        }}>Update Toast</button>
        <button onClick={() => dismiss()}>Dismiss All</button>
      </div>
    );
  };

  beforeEach(() => {
    window.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useRealTimers();
    // Clear global state between tests
    dispatchForTest({ type: "REMOVE_TOAST" });
  });

  afterEach(() => {
     dispatchForTest({ type: "REMOVE_TOAST" });
  });

  it('adds and renders a toast using the hook', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Toaster />
        <TestComponent />
      </>
    );

    await user.click(screen.getByText('Add Hook Toast'));
    expect(screen.getByText('Hook Toast')).toBeInTheDocument();
    expect(screen.getByText('desc hook')).toBeInTheDocument();
  });

  it('adds and renders a toast using direct call', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Toaster />
        <TestComponent />
      </>
    );

    await user.click(screen.getByText('Add Direct Toast'));
    expect(screen.getByText('Direct Toast')).toBeInTheDocument();
  });

  it('updates an existing toast', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Toaster />
        <TestComponent />
      </>
    );

    await act(async () => {
        await user.click(screen.getByText('Update Toast'));
    });

    expect(screen.getByText('Initial')).toBeInTheDocument();

    await screen.findByText('Updated');
    expect(screen.queryByText('Initial')).not.toBeInTheDocument();
  });

  it('dismisses all toasts', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Toaster />
        <TestComponent />
      </>
    );

    await user.click(screen.getByText('Add Hook Toast'));
    await user.click(screen.getByText('Add Direct Toast'));

    expect(screen.getByText('Hook Toast')).toBeInTheDocument();
    expect(screen.getByText('Direct Toast')).toBeInTheDocument();

    await user.click(screen.getByText('Dismiss All'));

    // State is updated to set `open: false`, they are unmounted synchronously in Radix UI without animations.
    await waitFor(() => {
       expect(screen.queryByText('Hook Toast')).not.toBeInTheDocument();
       expect(screen.queryByText('Direct Toast')).not.toBeInTheDocument();
    });
  });

  it('can dismiss a specific toast via close button', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Toaster />
        <TestComponent />
      </>
    );

    await user.click(screen.getByText('Add Hook Toast'));
    expect(screen.getByText('Hook Toast')).toBeInTheDocument();

    // In Radix UI, the close button is often accessible via role button and doesn't have text.
    // It is rendered as the last button typically, or we can find it by getting all buttons that have no text (the X icon).
    const allButtons = screen.getAllByRole('button');
    const closeBtn = allButtons.find(btn => btn.textContent.trim() === '');

    expect(closeBtn).toBeDefined();

    // Radix UI relies on pointer down/up for close, standard userEvent click works or act click.
    await act(async () => {
       closeBtn.click();
    });

    await waitFor(() => {
       expect(screen.queryByText('Hook Toast')).not.toBeInTheDocument();
    });
  });
});
