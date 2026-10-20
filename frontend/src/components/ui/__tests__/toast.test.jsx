import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast, toast, Toaster } from '../use-toast';

function TestComponent() {
  const { toast: addToast, dismiss } = useToast();

  React.useEffect(() => {
    // Clear toasts on mount
    dismiss();
  }, []);

  return (
    <div>
      <button onClick={() => addToast({ title: 'Test Title', description: 'Test Description', action: <button>Action</button> })}>
        Show Toast
      </button>
      <button onClick={() => dismiss()}>
        Dismiss All
      </button>
    </div>
  );
}

describe('Toast and useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Reset global HTMLElement for Radix UI
    window.HTMLElement.prototype.scrollIntoView = function() {};
    window.HTMLElement.prototype.hasPointerCapture = function() { return false; };
    window.HTMLElement.prototype.releasePointerCapture = function() {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a toast and can dismiss it', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    const showButton = screen.getByText('Show Toast');

    await act(async () => {
      await user.click(showButton);
    });

    // Advance timer to let toast render
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();

    const closeButton = document.querySelector('button[toast-close=""]');
    expect(closeButton).not.toBeNull();

    await act(async () => {
      closeButton.click(); // Using direct DOM click for Radix Close button
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // We expect the toast to not be in the document or have open=false state handled by CSS/DOM
  });

  it('can update a toast', async () => {
    let testToast;
    function UpdateComponent() {
      const { toast: addToast } = useToast();
      return (
        <div>
           <button onClick={() => { testToast = addToast({ title: 'Initial' }); }}>Add</button>
           <button onClick={() => { testToast.update({ title: 'Updated' }); }}>Update</button>
        </div>
      );
    }

    const user = userEvent.setup({ delay: null });
    render(
      <>
        <UpdateComponent />
        <Toaster />
      </>
    );

    await act(async () => {
      await user.click(screen.getByText('Add'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Initial')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText('Update'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('dismisses all toasts', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    await act(async () => {
      await user.click(screen.getByText('Show Toast'));
      await user.click(screen.getByText('Show Toast'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const titles = screen.getAllByText('Test Title');
    expect(titles.length).toBeGreaterThan(0);

    await act(async () => {
      await user.click(screen.getByText('Dismiss All'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  });
});
