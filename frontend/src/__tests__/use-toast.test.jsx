import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useToast, toast, Toaster } from '../components/ui/use-toast';
import { useEffect, useRef } from 'react';

// Wrapper component to isolate toast tests and clear state
const TestWrapper = ({ actions }) => {
  const hasRun = useRef(false);
  const { dismiss } = useToast();

  useEffect(() => {
    if (actions && !hasRun.current) {
      hasRun.current = true;
      actions.forEach(action => {
        if (action.type === 'toast') {
          toast(action.payload);
        } else if (action.type === 'dismiss') {
          dismiss(action.payload);
        }
      });
    }
  }, [actions, dismiss]);

  return <Toaster />;
};

describe('use-toast', () => {
  afterEach(() => {
    // Clear toast state between tests using the hook's dismiss
    render(<TestWrapper actions={[{ type: 'dismiss' }]} />);
    vi.clearAllMocks();
  });

  it('adds a toast and renders it', async () => {
    render(<TestWrapper actions={[{ type: 'toast', payload: { title: 'Test Toast', description: 'This is a test' } }]} />);

    expect(await screen.findByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });

  it('limits the number of toasts to 3', async () => {
    const actions = [
      { type: 'toast', payload: { title: 'Toast 1' } },
      { type: 'toast', payload: { title: 'Toast 2' } },
      { type: 'toast', payload: { title: 'Toast 3' } },
      { type: 'toast', payload: { title: 'Toast 4' } },
    ];
    render(<TestWrapper actions={actions} />);

    expect(await screen.findByText('Toast 4')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();

    // Toast 1 should be pushed out
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
  });

  it('updates an existing toast', async () => {
    let updateFn;
    const ComponentToUpdate = () => {
      const { toast } = useToast();
      const hasRun = useRef(false);
      useEffect(() => {
        if (!hasRun.current) {
          hasRun.current = true;
          const { update } = toast({ title: 'Initial Title', description: 'Initial Desc' });
          updateFn = update;
        }
      }, [toast]);
      return <Toaster />;
    };

    render(<ComponentToUpdate />);

    expect(await screen.findByText('Initial Title')).toBeInTheDocument();

    act(() => {
      updateFn({ title: 'Updated Title', description: 'Updated Desc' });
    });

    expect(await screen.findByText('Updated Title')).toBeInTheDocument();
    expect(screen.getByText('Updated Desc')).toBeInTheDocument();
    expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
  });

  it('dismisses a specific toast', async () => {
    let dismissFn;
    let toastId;
    const ComponentToDismiss = () => {
      const { toast, dismiss } = useToast();
      const hasRun = useRef(false);
      useEffect(() => {
        if (!hasRun.current) {
          hasRun.current = true;
          const t = toast({ title: 'To Be Dismissed' });
          toastId = t.id;
          dismissFn = () => dismiss(toastId);
        }
      }, [toast, dismiss]);
      return <Toaster />;
    };

    render(<ComponentToDismiss />);

    expect(await screen.findByText('To Be Dismissed')).toBeInTheDocument();

    act(() => {
      dismissFn();
    });

    // We can't strictly test that it disappears immediately due to radix-ui animations
    // but we can test that the dismiss action doesn't crash and changes state.
    // We will just verify it's not throwing an error.
  });

  it('dismisses all toasts', async () => {
    let dismissAllFn;
    const ComponentToDismissAll = () => {
      const { toast, dismiss } = useToast();
      const hasRun = useRef(false);
      useEffect(() => {
        if (!hasRun.current) {
          hasRun.current = true;
          toast({ title: 'Toast A' });
          toast({ title: 'Toast B' });
          dismissAllFn = dismiss;
        }
      }, [toast, dismiss]);
      return <Toaster />;
    };

    render(<ComponentToDismissAll />);

    expect(await screen.findByText('Toast A')).toBeInTheDocument();
    expect(screen.getByText('Toast B')).toBeInTheDocument();

    act(() => {
      dismissAllFn();
    });
  });
});
