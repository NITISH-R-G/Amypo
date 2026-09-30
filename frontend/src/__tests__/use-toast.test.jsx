import React, { useEffect, useRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { ToastProvider, ToastViewport } from '../components/ui/toast';

const TestComponent = () => {
  const { toast: hookToast, dismiss, toasts } = useToast();

  useEffect(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  }, []);

  return (
    <div>
      <button onClick={() => hookToast({ title: 'Hook Toast', description: 'from hook' })}>
        Add Hook Toast
      </button>
      <button onClick={() => toast({ title: 'Direct Toast', description: 'from direct call' })}>
        Add Direct Toast
      </button>
      <button onClick={() => {
        if (toasts.length > 0) dismiss(toasts[0].id);
      }}>
        Dismiss First Toast
      </button>
      <Toaster />
    </div>
  );
};

const DirectUpdateComponent = () => {
  const { toasts } = useToast();
  const toastRef = useRef(null);

  useEffect(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  }, []);

  return (
    <div>
      <button onClick={() => {
        const { id, update } = toast({ title: 'Initial' });
        toastRef.current = { id, update };
      }}>
        Add and Save
      </button>
      <button onClick={() => {
        if (toastRef.current) {
          toastRef.current.update({ title: 'Updated Title' });
        }
      }}>
        Update Saved
      </button>
      <button onClick={() => {
        if (toastRef.current) {
          toast({ ...toastRef.current, open: false, title: 'dismissing' });
        }
      }}>
        Dismiss Direct
      </button>
      <Toaster />
    </div>
  );
};


describe('use-toast', () => {
  beforeEach(() => {
    vi.useRealTimers();
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  it('adds and renders a toast using the hook', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await act(async () => {
      await user.click(screen.getByText('Add Hook Toast'));
    });

    expect(screen.getByText('Hook Toast')).toBeInTheDocument();
    expect(screen.getByText('from hook')).toBeInTheDocument();
  });

  it('adds and renders a toast using the direct function', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await act(async () => {
      await user.click(screen.getByText('Add Direct Toast'));
    });

    expect(screen.getByText('Direct Toast')).toBeInTheDocument();
    expect(screen.getByText('from direct call')).toBeInTheDocument();
  });

  it('dismisses a toast', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await act(async () => {
      await user.click(screen.getByText('Add Hook Toast'));
    });

    expect(screen.getByText('Hook Toast')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText('Dismiss First Toast'));
    });

    expect(screen.queryByText('Hook Toast')).not.toBeInTheDocument();
  });

  it('limits the number of toasts to 3', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await act(async () => {
      await user.click(screen.getByText('Add Hook Toast')); // 1
      await user.click(screen.getByText('Add Hook Toast')); // 2
      await user.click(screen.getByText('Add Hook Toast')); // 3
      await user.click(screen.getByText('Add Hook Toast')); // 4
    });

    const toasts = screen.getAllByText('Hook Toast');
    expect(toasts.length).toBe(3);
  });

  it('updates a toast using the update function', async () => {
    const user = userEvent.setup();
    render(<DirectUpdateComponent />);

    await act(async () => {
      await user.click(screen.getByText('Add and Save'));
    });

    expect(screen.getByText('Initial')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText('Update Saved'));
    });

    expect(screen.getByText('Updated Title')).toBeInTheDocument();
  });

  it('dismisses a toast directly by changing state using onOpenChange from close button', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await act(async () => {
      await user.click(screen.getByText('Add Hook Toast'));
    });

    expect(screen.getByText('Hook Toast')).toBeInTheDocument();

    const closeButtons = document.querySelectorAll('[toast-close=""]');
    expect(closeButtons.length).toBeGreaterThan(0);

    await act(async () => {
      closeButtons[0].click();
    });

    expect(screen.queryByText('Hook Toast')).not.toBeInTheDocument();
  });
});
