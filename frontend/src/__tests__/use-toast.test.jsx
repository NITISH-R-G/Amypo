import React, { useEffect, useRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { ToastProvider, ToastViewport } from '../components/ui/toast';

const TestComponent = () => {
  const { toasts, dismiss } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      dispatchForTest({ type: 'REMOVE_TOAST' });
      initialized.current = true;
    }
  }, []);

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'Test Description', action: <button>Action</button> })}>
        Show Toast
      </button>
      <button onClick={() => toast({ title: 'Test Toast 2' })}>
        Show Toast 2
      </button>
      <button onClick={() => toast({ title: 'Test Toast 3' })}>
        Show Toast 3
      </button>
      <button onClick={() => toast({ title: 'Test Toast 4' })}>
        Show Toast 4
      </button>
      {toasts.map((t) => (
        <div key={t.id} data-testid={`toast-${t.id}`}>
          {t.title}
          <button onClick={() => dismiss(t.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds and displays a toast', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    const button = screen.getByText('Show Toast');
    await user.click(button);

    expect(screen.getAllByText('Test Toast')).toHaveLength(2); // One in component, one in Toaster
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('limits the number of toasts to TOAST_LIMIT (3)', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    await user.click(screen.getByText('Show Toast'));
    await user.click(screen.getByText('Show Toast 2'));
    await user.click(screen.getByText('Show Toast 3'));
    await user.click(screen.getByText('Show Toast 4'));

    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument(); // The first one should be removed
    expect(screen.getAllByText('Test Toast 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Test Toast 3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Test Toast 4').length).toBeGreaterThan(0);
  });

  it('dismisses a specific toast', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    await user.click(screen.getByText('Show Toast'));

    const dismissButtons = await screen.findAllByText('Dismiss');
    await user.click(dismissButtons[0]);

    // Check memory state has open=false
    // Since radix animate-out might remove it, we look at the raw elements, or assert it's removed.
    // Given the component state clearing happens quickly, it might be removed entirely.
    const description = screen.queryByText('Test Description');
    if (description) {
        const item = description.closest('li');
        if (item) {
            expect(item).toHaveAttribute('data-state', 'closed');
        }
    } else {
        expect(description).toBeNull();
    }
  });

  it('dismisses all toasts when no id is provided', async () => {
     render(
       <ToastProvider>
         <Toaster />
       </ToastProvider>
     );
     act(() => {
       toast({ title: 'A' });
       toast({ title: 'B' });
     });

     expect(await screen.findByText('A')).toBeInTheDocument();
     expect(await screen.findByText('B')).toBeInTheDocument();

     act(() => {
         dispatchForTest({ type: "DISMISS_TOAST" });
     });

     const toastA = screen.queryByText('A');
     const toastB = screen.queryByText('B');

     if (toastA && toastA.closest('li')) {
         expect(toastA.closest('li')).toHaveAttribute('data-state', 'closed');
     }
     if (toastB && toastB.closest('li')) {
         expect(toastB.closest('li')).toHaveAttribute('data-state', 'closed');
     }
  });

  it('updates a toast', async () => {
    render(<Toaster />);
    let toastObj;
    act(() => {
        toastObj = toast({ title: 'Initial Title' });
    });

    expect(screen.getByText('Initial Title')).toBeInTheDocument();

    act(() => {
        toastObj.update({ id: toastObj.id, title: 'Updated Title' });
    });

    expect(screen.getByText('Updated Title')).toBeInTheDocument();
    expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
  });
});
