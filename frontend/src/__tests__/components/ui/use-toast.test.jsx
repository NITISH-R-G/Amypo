import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../../../components/ui/use-toast';
import React from 'react';
import { useRef, useEffect } from 'react';

// Wrapper to clear state
const TestWrapper = ({ children }) => {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      dispatchForTest({ type: 'REMOVE_TOAST' });
      initialized.current = true;
    }
  }, []);
  return <>{children}</>;
};

describe('useToast', () => {
  beforeEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  afterEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  it('adds and displays a toast', async () => {
    const TestComponent = () => {
      const { toasts, toast } = useToast();
      return (
        <div>
          <button onClick={() => toast({ title: 'Test Toast', description: 'Desc' })}>Show Toast</button>
          {toasts.map(t => <div key={t.id}>{t.title}</div>)}
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const button = screen.getByText('Show Toast');
    await act(async () => {
        button.click();
    });

    expect(await screen.findByText('Test Toast')).toBeInTheDocument();
  });

  it('updates a toast', async () => {
    const TestComponent = () => {
      const { toasts, toast } = useToast();
      const toastRef = useRef(null);

      return (
        <div>
          <button onClick={() => {
            toastRef.current = toast({ title: 'Initial Toast', description: 'Desc' });
          }}>Show Toast</button>

          <button onClick={() => {
             if (toastRef.current) {
               toastRef.current.update({ id: toastRef.current.id, title: 'Updated Toast' });
             }
          }}>Update Toast</button>

          {toasts.map(t => <div key={t.id}>{t.title}</div>)}
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const showButton = screen.getByText('Show Toast');
    await act(async () => {
        showButton.click();
    });
    expect(await screen.findByText('Initial Toast')).toBeInTheDocument();

    const updateButton = screen.getByText('Update Toast');
    await act(async () => {
        updateButton.click();
    });
    expect(await screen.findByText('Updated Toast')).toBeInTheDocument();
    expect(screen.queryByText('Initial Toast')).not.toBeInTheDocument();
  });

  it('dismisses a specific toast', async () => {
    const TestComponent = () => {
      const { toasts, toast, dismiss } = useToast();
      const toastRef = useRef(null);

      return (
        <div>
          <button onClick={() => {
            toastRef.current = toast({ title: 'Toast To Dismiss' });
          }}>Show</button>
          <button onClick={() => dismiss(toastRef.current.id)}>Dismiss</button>
          {toasts.map(t => <div key={t.id}>{t.title} - {t.open ? 'Open' : 'Closed'}</div>)}
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await act(async () => {
        screen.getByText('Show').click();
    });
    expect(await screen.findByText('Toast To Dismiss - Open')).toBeInTheDocument();

    await act(async () => {
        screen.getByText('Dismiss').click();
    });
    expect(await screen.findByText('Toast To Dismiss - Closed')).toBeInTheDocument();
  });

  it('dismisses all toasts', async () => {
    const TestComponent = () => {
      const { toasts, toast, dismiss } = useToast();

      return (
        <div>
          <button onClick={() => {
            toast({ title: 'T1' });
            toast({ title: 'T2' });
          }}>Show</button>
          <button onClick={() => dismiss()}>Dismiss All</button>
          {toasts.map(t => <div key={t.id}>{t.title} - {t.open ? 'Open' : 'Closed'}</div>)}
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await act(async () => {
        screen.getByText('Show').click();
    });
    expect(await screen.findByText('T1 - Open')).toBeInTheDocument();
    expect(await screen.findByText('T2 - Open')).toBeInTheDocument();

    await act(async () => {
        screen.getByText('Dismiss All').click();
    });
    expect(await screen.findByText('T1 - Closed')).toBeInTheDocument();
    expect(await screen.findByText('T2 - Closed')).toBeInTheDocument();
  });

  it('enforces TOAST_LIMIT', async () => {
    const TestComponent = () => {
      const { toasts, toast } = useToast();

      return (
        <div>
          <button onClick={() => {
            toast({ title: 'T1' });
            toast({ title: 'T2' });
            toast({ title: 'T3' });
            toast({ title: 'T4' }); // T1 should be removed
          }}>Show</button>
          {toasts.map(t => <div key={t.id}>{t.title}</div>)}
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await act(async () => {
        screen.getByText('Show').click();
    });

    // Limits to 3 (which is TOAST_LIMIT)
    expect(screen.queryByText('T1')).not.toBeInTheDocument();
    expect(screen.getByText('T2')).toBeInTheDocument();
    expect(screen.getByText('T3')).toBeInTheDocument();
    expect(screen.getByText('T4')).toBeInTheDocument();
  });

});

describe('Toaster component', () => {
    beforeEach(() => {
        dispatchForTest({ type: 'REMOVE_TOAST' });
    });

    afterEach(() => {
        dispatchForTest({ type: 'REMOVE_TOAST' });
    });

    it('renders toasts via Toaster component', async () => {
        const Trigger = () => {
          return <button onClick={() => toast({ title: 'Rendered Title', description: 'Rendered Desc', action: <button>ActionBtn</button> })}>Trigger</button>;
        }

        render(
            <TestWrapper>
               <Trigger />
               <Toaster />
            </TestWrapper>
        );

        await act(async () => {
            screen.getByText('Trigger').click();
        });

        expect(await screen.findByText('Rendered Title')).toBeInTheDocument();
        expect(screen.getByText('Rendered Desc')).toBeInTheDocument();
        expect(screen.getByText('ActionBtn')).toBeInTheDocument();
    });

    it('closes toast when close button is clicked', async () => {
         const Trigger = () => {
          return <button onClick={() => toast({ title: 'Close Me' })}>Trigger</button>;
        }

        render(
            <TestWrapper>
               <Trigger />
               <Toaster />
            </TestWrapper>
        );

        await act(async () => {
            screen.getByText('Trigger').click();
        });

        expect(await screen.findByText('Close Me')).toBeInTheDocument();

        // Find close button
        // The toast close button in standard Radix has cross icon, but we can look for role or test attributes if available.
        // It has ToastClose which likely renders a button with some default classes or structure.
        // If we can't find it by text, we might find it by clicking the close button element inside the toast
        // We can just query all buttons inside the Toaster that are not the Trigger or Action
        const buttons = screen.getAllByRole('button');
        const closeButton = buttons.find(b => b.textContent === '' || b.querySelector('svg'));

        expect(closeButton).toBeInTheDocument();

        await act(async () => {
            closeButton.click();
        });

        // Check that open: false was set or toast is gone
        // With real timers we can just check DOM right away because our state sets open to false,
        // which may remove the Radix dialog instantly depending on animation.
        expect(screen.queryByText('Close Me')).not.toBeInTheDocument();
    });
});
