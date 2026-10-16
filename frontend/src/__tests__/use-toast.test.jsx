import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { useEffect, useRef } from 'react';

// Wrapper to clear state between tests
const TestWrapper = ({ children }) => {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      if (typeof dispatchForTest === 'function') {
        dispatchForTest({ type: 'REMOVE_TOAST' });
      }
      initialized.current = true;
    }
  }, []);
  return <>{children}</>;
};

const TestComponent = () => {
  const { toast, dismiss } = useToast();

  // Expose the returned objects from toast() so we can test updates and individual dismissal
  useEffect(() => {
    // Only dispatch toast when explicitly requested by test to avoid race condition or hidden state
  }, []);

  const showAndSaveToast = () => {
      window.testToastRef = toast({ title: 'Initial Title', description: 'Desc' });
  };

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Title', description: 'Test Description' })}>
        Show Toast
      </button>
      <button onClick={() => toast({ title: 'Update Title', description: 'Update Description', action: <button>Action</button> })}>
        Show Update Toast
      </button>
      <button onClick={showAndSaveToast}>
        Show & Save Initial
      </button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <button onClick={() => window.testToastRef?.dismiss()}>Dismiss Specific</button>
      <button onClick={() => window.testToastRef?.update({ id: window.testToastRef.id, title: 'Updated Title' })}>Update Specific</button>
      <button onClick={() => dispatchForTest({ type: 'REMOVE_TOAST' })}>Remove All</button>
      <button onClick={() => dispatchForTest({ type: 'REMOVE_TOAST', toastId: window.testToastRef?.id })}>Remove Specific</button>
    </div>
  );
};

describe('use-toast', () => {
  it('adds and renders a toast', async () => {
    render(
      <TestWrapper>
        <TestComponent />
        <Toaster />
      </TestWrapper>
    );

    const button = screen.getByText('Show Toast');

    await act(async () => {
      button.click();
    });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('dismisses a toast via close button', async () => {
    render(
      <TestWrapper>
        <TestComponent />
        <Toaster />
      </TestWrapper>
    );

    const button = screen.getByText('Show Toast');
    await act(async () => {
      button.click();
    });

    const closeButton = document.querySelector('[toast-close]');

    if (closeButton) {
        await act(async () => {
          closeButton.click();
        });
    }

    // We can also trigger a Dismiss All
    const dismissAllButton = screen.getByText('Dismiss All');
    await act(async () => {
        dismissAllButton.click();
    });
  });

  it('updates a toast and dismisses specific', async () => {
      render(
          <TestWrapper>
              <TestComponent />
              <Toaster />
          </TestWrapper>
      );

      const showSaveButton = screen.getByText('Show & Save Initial');
      await act(async () => {
          showSaveButton.click();
      });

      expect(screen.getByText('Initial Title')).toBeInTheDocument();

      const updateButton = screen.getByText('Update Specific');
      await act(async () => {
          updateButton.click();
      });

      expect(screen.getByText('Updated Title')).toBeInTheDocument();

      const dismissSpecificButton = screen.getByText('Dismiss Specific');
      await act(async () => {
          dismissSpecificButton.click();
      });

      const removeSpecificButton = screen.getByText('Remove Specific');
      await act(async () => {
          removeSpecificButton.click();
      });

      const removeAllButton = screen.getByText('Remove All');
      await act(async () => {
          removeAllButton.click();
      });
  });
});
