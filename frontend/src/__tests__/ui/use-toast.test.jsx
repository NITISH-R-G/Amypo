import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Toaster, useToast, toast } from '../../components/ui/use-toast';

// Helper component to trigger toasts
const ToastTrigger = ({ actionType, payload }) => {
  const { toast, dismiss } = useToast();

  return (
    <div>
      <button
        data-testid="add-toast"
        onClick={() => toast(payload)}
      >
        Add Toast
      </button>
      <button
        data-testid="dismiss-all"
        onClick={() => dismiss()}
      >
        Dismiss All
      </button>
      <button
        data-testid="update-toast"
        onClick={() => {
          const { id } = toast({ title: 'Old Title' });
          setTimeout(() => {
            toast({ id, title: 'New Title' });
          }, 0);
        }}
      >
        Update Toast
      </button>
    </div>
  );
};

// Component to clear module state between tests
const ClearToastState = () => {
  const { dismiss } = useToast();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dismiss();
  }, []);
  return null;
};

describe('useToast', () => {
  beforeEach(() => {
    render(<ClearToastState />);
  });

  it('adds and renders a toast', async () => {
    render(
      <>
        <ToastTrigger payload={{ title: 'Test Title', description: 'Test Description' }} />
        <Toaster />
      </>
    );

    const button = screen.getByTestId('add-toast');
    act(() => {
      button.click();
    });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('dismisses a toast', async () => {
    render(
      <>
        <ToastTrigger payload={{ title: 'Dismiss Me' }} />
        <Toaster />
      </>
    );

    const addButton = screen.getByTestId('add-toast');
    act(() => {
      addButton.click();
    });

    expect(screen.getByText('Dismiss Me')).toBeInTheDocument();

    const dismissButton = screen.getByTestId('dismiss-all');
    act(() => {
      dismissButton.click();
    });

    expect(screen.queryByText('Dismiss Me')).not.toBeInTheDocument();
  });

  it('updates an existing toast', async () => {
    render(
      <>
        <ToastTrigger payload={{ title: 'First Title' }} />
        <Toaster />
      </>
    );

    const updateButton = screen.getByTestId('update-toast');
    act(() => {
      updateButton.click();
    });

    // We can also test direct update through the useToast update returned from toast
    let toastRef;
    const UpdateDirect = () => {
      const { toast } = useToast();
      return (
        <button
          data-testid="direct-update"
          onClick={() => {
            toastRef = toast({ title: 'Init Title' });
            toastRef.update({ id: toastRef.id, title: 'Updated Title' });
          }}
        >
          Direct Update
        </button>
      );
    };

    render(
      <>
        <UpdateDirect />
        <Toaster />
      </>
    );

    const directUpdateBtn = screen.getByTestId('direct-update');
    act(() => {
      directUpdateBtn.click();
    });

    const updatedToasts = screen.getAllByText('Updated Title');
    expect(updatedToasts.length).toBeGreaterThan(0);
  });

  it('limits the number of toasts rendered', async () => {
    render(
      <>
        <ToastTrigger payload={{ title: 'Toast 1' }} />
        <Toaster />
      </>
    );

    const addButton = screen.getByTestId('add-toast');

    // Default limit is 3, let's add 4
    act(() => { addButton.click(); });
    act(() => { addButton.click(); });
    act(() => { addButton.click(); });
    act(() => { addButton.click(); });

    // Since they are identical we should query by all
    const toasts = screen.getAllByText('Toast 1');
    expect(toasts.length).toBeLessThanOrEqual(3);
  });
});
