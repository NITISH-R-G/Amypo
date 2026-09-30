import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatch } from '../components/ui/use-toast';
import { ToastAction } from '../components/ui/toast';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const TestComponent = () => {
  const { toast, dismiss, toasts } = useToast();
  return (
    <div>
      <button onClick={() => toast({ title: 'Title1', description: 'Desc1' })}>Add Toast</button>
      <button onClick={() => toast({ title: 'Title2', action: <button>ActionBtn</button> })}>Add Toast 2</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <div data-testid="count">{toasts.length}</div>
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    // Mock target.hasPointerCapture to prevent Radix UI error in test environment
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
      HTMLElement.prototype.releasePointerCapture = vi.fn();
    }
    render(<TestComponent />);
    act(() => {
      screen.getByText('Dismiss All').click();
    });
    // Ensure state is empty
    act(() => {
      dispatch({ type: "REMOVE_TOAST" });
    });
  });

  it('adds and dismisses a toast', async () => {
    render(<Toaster />);

    expect(screen.queryByText('Title1')).not.toBeInTheDocument();

    act(() => {
      screen.getByText('Add Toast').click();
    });

    expect(await screen.findByText('Title1')).toBeInTheDocument();
    expect(screen.getByText('Desc1')).toBeInTheDocument();

    act(() => {
      screen.getByText('Dismiss All').click();
    });
  });

  it('limits to TOAST_LIMIT (3)', async () => {
    render(<Toaster />);

    for (let i = 0; i < 5; i++) {
      act(() => {
        screen.getByText('Add Toast').click();
      });
    }

    expect(screen.getByTestId('count')).toHaveTextContent('3');
  });

  it('can update a toast', async () => {
    vi.useFakeTimers();
    let id;
    const Updater = () => {
      const { toast } = useToast();
      return (
        <button onClick={() => {
          const res = toast({ title: 'Initial' });
          id = res.id;
          setTimeout(() => res.update({ title: 'Updated' }), 100);
        }}>Add and Update</button>
      );
    }
    render(<><Updater /><Toaster /></>);

    act(() => { screen.getByText('Add and Update').click(); });
    expect(screen.getByText('Initial')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    vi.useRealTimers();
    expect(await screen.findByText('Updated')).toBeInTheDocument();
  });

  it('handles individual dismiss and onOpenChange', async () => {
    let id;
    let dismissFn;
    const DismissComponent = () => {
      const { toast, dismiss } = useToast();
      dismissFn = dismiss;
      return (
        <button onClick={() => {
          const res = toast({ title: 'ToDismiss' });
          id = res.id;
        }}>Add To Dismiss</button>
      );
    }
    render(<><DismissComponent /><Toaster /></>);

    act(() => { screen.getByText('Add To Dismiss').click(); });
    expect(await screen.findByText('ToDismiss')).toBeInTheDocument();

    act(() => {
      dismissFn(id);
    });
  });

  it('handles onOpenChange for closing toast', async () => {
    const user = userEvent.setup();
    let id;
    const ToastCloser = () => {
      const { toast } = useToast();
      return (
        <button onClick={() => {
          const res = toast({ title: 'openChange' });
          id = res.id;
        }}>Add OpenChange</button>
      );
    }
    render(<><ToastCloser /><Toaster /></>);

    await user.click(screen.getByText('Add OpenChange'));
    expect(await screen.findByText('openChange')).toBeInTheDocument();

    const closeBtn = document.querySelector('button[toast-close=""]');
    if(closeBtn) {
       await user.click(closeBtn);
    }
  });

  it('handles removing toast by id and removing all toasts via exported dispatch', async () => {
    const RemoveComponent = () => {
      const { toast } = useToast();
      return (
        <button onClick={() => {
           const t1 = toast({ title: 'removeme1' });
           toast({ title: 'removeme2' });

           // Remove one specific
           dispatch({ type: 'REMOVE_TOAST', toastId: t1.id });
        }}>Add Remove</button>
      );
    }
    render(<><RemoveComponent /><Toaster /></>);
    act(() => { screen.getByText('Add Remove').click(); });

    // removeme1 should be removed immediately
    expect(screen.queryByText('removeme1')).not.toBeInTheDocument();
    expect(await screen.findByText('removeme2')).toBeInTheDocument();

    // Remove all
    act(() => {
      dispatch({ type: 'REMOVE_TOAST' });
    });
    expect(screen.queryByText('removeme2')).not.toBeInTheDocument();
  });

  it('renders ToastAction correctly', () => {
    render(<ToastAction altText="Action">Test Action Component</ToastAction>);
    expect(screen.getByText('Test Action Component')).toBeInTheDocument();
  });
});
