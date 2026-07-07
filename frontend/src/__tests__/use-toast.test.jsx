import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { useState, useEffect, useRef } from 'react';

describe('useToast', () => {
  beforeEach(() => {
    if (typeof dispatchForTest === 'function') {
      dispatchForTest({ type: 'REMOVE_TOAST' });
    }
  });

  afterEach(() => {
    if (typeof dispatchForTest === 'function') {
      dispatchForTest({ type: 'REMOVE_TOAST' });
    }
  });

  it('adds, updates, dismisses, and removes toasts', () => {
    const TestComponent = () => {
      const [toastInstance, setToastInstance] = useState(null);

      return (
        <div>
          <button onClick={() => {
            const t = toast({ title: 'Initial Title', description: 'Initial Desc' });
            setToastInstance(t);
          }}>Add Toast</button>

          <button onClick={() => {
            if (toastInstance) toastInstance.update({ id: toastInstance.id, title: 'Updated Title' });
          }}>Update Toast</button>

          <button onClick={() => {
            if (toastInstance) toastInstance.dismiss();
          }}>Dismiss Toast</button>

          <Toaster />
        </div>
      );
    };

    render(<TestComponent />);

    const addBtn = screen.getByText('Add Toast');

    act(() => {
      addBtn.click();
    });

    expect(screen.getByText('Initial Title')).toBeInTheDocument();
    expect(screen.getByText('Initial Desc')).toBeInTheDocument();

    const updateBtn = screen.getByText('Update Toast');
    act(() => {
      updateBtn.click();
    });

    expect(screen.getByText('Updated Title')).toBeInTheDocument();

    const dismissBtn = screen.getByText('Dismiss Toast');
    act(() => {
      dismissBtn.click();
    });
  });

  it('handles global dismiss and limits', () => {
    const TestLimitComponent = () => {
      const { toast: hookToast, dismiss } = useToast();
      const hasInit = useRef(false);

      useEffect(() => {
        if (!hasInit.current) {
          hasInit.current = true;
          // Adding multiple toasts
          hookToast({ title: 'Toast 1' });
          hookToast({ title: 'Toast 2' });
          hookToast({ title: 'Toast 3' });
          hookToast({ title: 'Toast 4' }); // Should push out Toast 1
        }
      }, [hookToast]);

      return (
        <div>
           <button onClick={() => dismiss()}>Dismiss All</button>
           <Toaster />
        </div>
      )
    };

    render(<TestLimitComponent />);

    // With TOAST_LIMIT = 3, Toast 1 should be dropped
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText('Toast 4')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();

    act(() => {
      screen.getByText('Dismiss All').click();
    });
  });
});
