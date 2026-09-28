import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { useEffect, useRef } from 'react';

// A wrapper to clean up state between tests
const TestWrapper = ({ children }) => {
  const { dismiss } = useToast();
  const cleared = useRef(false);

  useEffect(() => {
    if (!cleared.current) {
      // Clear out all toasts before each test inside the wrapper to prevent bleed
      dispatchForTest({ type: "REMOVE_TOAST" });
      cleared.current = true;
    }
  }, [dismiss]);

  return <>{children}</>;
};

const TestComponent = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'Description', action: <button>Action</button> })}>Show Toast</button>
      <button onClick={() => {
         const t = toast({ title: 'Test Toast 2', description: 'Description 2' });
         setTimeout(() => t.dismiss(), 100);
      }}>Show And Dismiss Toast</button>

      <button onClick={() => {
         // To properly test UPDATE_TOAST, we will use dispatch later if needed, but for now let's just use the returned update function
         const t = toast({ title: 'Will Be Updated' });
         t.update({ id: t.id, title: 'Has Been Updated' });
      }}>Show And Update Toast Returned</button>

      <button onClick={() => dismiss()}>Dismiss All</button>
      <button onClick={() => dismiss('non-existent-id')}>Dismiss Specific Non Existent</button>
      <button onClick={() => {
          const t = toast({ title: 'To Be Removed' });
          dispatchForTest({ type: 'REMOVE_TOAST', toastId: t.id });
      }}>Show And Remove Specific</button>
      <button onClick={() => {
          dispatchForTest({ type: 'REMOVE_TOAST' });
      }}>Remove All</button>

      <div data-testid="toast-count">{toasts.length}</div>
      <div data-testid="toast-open-count">{toasts.filter(t => t.open).length}</div>
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
       vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    // clear memoryState
    dispatchForTest({ type: "REMOVE_TOAST" });
  });

  it('adds and dismisses toasts', async () => {
    render(<TestWrapper><TestComponent /></TestWrapper>);
    const showBtn = screen.getByText('Show Toast');

    act(() => {
      showBtn.click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    expect(screen.getByTestId('toast-open-count')).toHaveTextContent('1');

    const dismissAllBtn = screen.getByText('Dismiss All');

    act(() => {
      dismissAllBtn.click();
    });
    // It's still in the list but marked as closed
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    expect(screen.getByTestId('toast-open-count')).toHaveTextContent('0');
  });

  it('dismisses specific toast', async () => {
    render(<TestWrapper><TestComponent /></TestWrapper>);

    act(() => {
      screen.getByText('Dismiss Specific Non Existent').click();
    });

    // Nothing was open, so it doesn't change
    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('updates toasts', async () => {
    render(<TestWrapper><TestComponent /></TestWrapper>);

    act(() => {
      screen.getByText('Show And Update Toast Returned').click();
    });

    // It adds a toast and immediately updates it, so count should be 1
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('removes toasts', async () => {
      render(<TestWrapper><TestComponent /></TestWrapper>);

      act(() => {
          screen.getByText('Show Toast').click();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      act(() => {
          screen.getByText('Remove All').click();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

      act(() => {
          screen.getByText('Show And Remove Specific').click();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('renders Toaster', async () => {
     render(<TestWrapper><Toaster /><TestComponent /></TestWrapper>);
     act(() => {
        screen.getByText('Show Toast').click();
     });

     expect(screen.getByText('Test Toast')).toBeInTheDocument();
     expect(screen.getByText('Description')).toBeInTheDocument();
     expect(screen.getByText('Action')).toBeInTheDocument();

     act(() => {
        vi.runOnlyPendingTimers();
     });
  });
});
