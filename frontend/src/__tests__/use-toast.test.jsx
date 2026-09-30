import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { useEffect, useRef } from 'react';
import { ToastAction } from '../components/ui/toast';

// A component to test the useToast hook
const ToastTestComponent = () => {
  const { toast: hookToast, dismiss, toasts, update } = useToast();

  // Expose for tests
  window.testHookToast = hookToast;
  window.testDismiss = dismiss;
  window.testUpdate = update;

  // Clear memory state between tests
  useEffect(() => {
     if (typeof dispatchForTest === 'function') {
         dispatchForTest({ type: "REMOVE_TOAST" }); // Clear without id clears all
     }
  }, []);

  return (
    <div>
      <Toaster />
    </div>
  );
};

describe('use-toast hook', () => {

  it('renders a toast when called and updates it', async () => {
    render(<ToastTestComponent />);

    let result;
    await act(async () => {
      result = window.testHookToast({ title: 'Test Toast', description: 'This is a test.' });
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('This is a test.')).toBeInTheDocument();

    await act(async () => {
      result.update({ title: 'Updated Toast', description: 'Updated desc.' });
    });

    expect(screen.getByText('Updated Toast')).toBeInTheDocument();
    expect(screen.getByText('Updated desc.')).toBeInTheDocument();
  });

  it('dismisses a toast when dismiss is called', async () => {
    render(<ToastTestComponent />);

    let id;
    await act(async () => {
      const result = window.testHookToast({ title: 'Dismiss Me' });
      id = result.id;
    });

    expect(screen.getByText('Dismiss Me')).toBeInTheDocument();

    await act(async () => {
      window.testDismiss(id);
    });

    expect(screen.queryByText('Dismiss Me')).not.toBeInTheDocument();
  });

  it('handles multiple toasts and respects limit', async () => {
    render(<ToastTestComponent />);

    await act(async () => {
      window.testHookToast({ title: 'Toast 1' });
      window.testHookToast({ title: 'Toast 2' });
      window.testHookToast({ title: 'Toast 3' });
      window.testHookToast({ title: 'Toast 4' }); // Should push out Toast 1 if limit is 3
    });

    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 4')).toBeInTheDocument();
  });

  it('dismisses all toasts when dismiss is called without id', async () => {
     render(<ToastTestComponent />);

    await act(async () => {
      window.testHookToast({ title: 'To Dismiss 1' });
      window.testHookToast({ title: 'To Dismiss 2' });
    });

    expect(screen.getByText('To Dismiss 1')).toBeInTheDocument();
    expect(screen.getByText('To Dismiss 2')).toBeInTheDocument();

    await act(async () => {
      window.testDismiss();
    });

    expect(screen.queryByText('To Dismiss 1')).not.toBeInTheDocument();
    expect(screen.queryByText('To Dismiss 2')).not.toBeInTheDocument();
  });

  it('removes toast via REMOVE_TOAST explicitly', async () => {
    render(<ToastTestComponent />);
    let id;
    await act(async () => {
      const result = window.testHookToast({ title: 'Remove Me' });
      id = result.id;
    });
    expect(screen.getByText('Remove Me')).toBeInTheDocument();

    await act(async () => {
       if (typeof dispatchForTest === 'function') {
           dispatchForTest({ type: "REMOVE_TOAST", toastId: id });
       }
    });

    expect(screen.queryByText('Remove Me')).not.toBeInTheDocument();
  });

  it('renders a toast with an action', async () => {
    render(<ToastTestComponent />);

    await act(async () => {
      window.testHookToast({
        title: 'Action Toast',
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    });

    expect(screen.getByText('Action Toast')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('unmounts on generic dismiss', async () => {
     render(<ToastTestComponent />);
     let dismissed = false;
     await act(async () => {
        window.testHookToast({
            title: 'Dismiss Action Toast',
            onOpenChange: (open) => {
                if(!open) {
                    dismissed = true;
                    window.testDismiss();
                }
            }
        });
     });

     const closeButton = document.querySelector('button[toast-close]');

     await act(async () => {
       closeButton.click();
     });

     expect(screen.queryByText('Dismiss Action Toast')).not.toBeInTheDocument();
  });
});

describe('use-toast standalone toast() function', () => {
  it('updates a toast using standalone toast function', async () => {
      render(<ToastTestComponent />);

      let res;
      await act(async () => {
          res = toast({ title: 'Standalone Toast' });
      });
      expect(screen.getByText('Standalone Toast')).toBeInTheDocument();

      await act(async () => {
          res.update({ title: 'Updated Standalone Toast', id: res.id });
      });

      expect(screen.getByText('Updated Standalone Toast')).toBeInTheDocument();

      await act(async () => {
          res.dismiss();
      });

      expect(screen.queryByText('Updated Standalone Toast')).not.toBeInTheDocument();
  });
});
