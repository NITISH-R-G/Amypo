import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster } from '../../../components/ui/use-toast';
import { ToastAction } from '../../../components/ui/toast';
import { vi } from 'vitest';

const ClearToastState = () => {
  const { dismiss } = useToast();
  useEffect(() => {
    dismiss();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

const TestApp = () => {
  const { dismiss, toasts } = useToast();
  const [lastToast, setLastToast] = React.useState(null);

  return (
    <div>
      <Toaster />
      <button
        data-testid="add-toast"
        onClick={() => {
          const t = toast({
            title: 'Initial Title',
            description: 'Initial Description',
            action: <ToastAction altText="Action">Action</ToastAction>,
          });
          setLastToast(t);
        }}
      >
        Add
      </button>

      <button
        data-testid="update-toast"
        onClick={() => {
          if (lastToast) {
            lastToast.update({ id: lastToast.id, title: 'Updated Title' });
          }
        }}
      >
        Update
      </button>

      <button
        data-testid="dismiss-toast"
        onClick={() => {
          if (lastToast) {
            lastToast.dismiss();
          }
        }}
      >
        Dismiss
      </button>

      <button
        data-testid="add-multiple"
        onClick={() => {
          toast({ title: 'Toast 1' });
          toast({ title: 'Toast 2' });
          toast({ title: 'Toast 3' });
          toast({ title: 'Toast 4' });
        }}
      >
        Add Multiple
      </button>

      <button
        data-testid="dismiss-all"
        onClick={() => dismiss()}
      >
        Dismiss All
      </button>
      <div data-testid="toasts-open-length">{toasts.filter(t => t.open).length}</div>
    </div>
  );
};

describe('Toast Components', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    render(<ClearToastState />);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds and renders a toast with title, description, and action', async () => {
    render(<TestApp />);
    const addBtn = screen.getByTestId('add-toast');

    await user.click(addBtn);

    expect(screen.getByText('Initial Title')).toBeInTheDocument();
    expect(screen.getByText('Initial Description')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('updates a toast', async () => {
    render(<TestApp />);

    await user.click(screen.getByTestId('add-toast'));

    expect(screen.getByText('Initial Title')).toBeInTheDocument();

    await user.click(screen.getByTestId('update-toast'));

    expect(screen.getByText('Updated Title')).toBeInTheDocument();
    expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
  });

  it('dismisses a specific toast', async () => {
    render(<TestApp />);

    await user.click(screen.getByTestId('add-toast'));

    expect(screen.getByText('Initial Title')).toBeInTheDocument();
    expect(screen.getByTestId('toasts-open-length')).toHaveTextContent('1');

    await user.click(screen.getByTestId('dismiss-toast'));

    expect(screen.getByTestId('toasts-open-length')).toHaveTextContent('0');
  });

  it('limits toasts to TOAST_LIMIT and removes oldest', async () => {
    render(<TestApp />);

    await user.click(screen.getByTestId('add-multiple'));

    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 4')).toBeInTheDocument();
  });

  it('dismisses all toasts', async () => {
    render(<TestApp />);

    await user.click(screen.getByTestId('add-multiple'));

    expect(screen.getByText('Toast 4')).toBeInTheDocument();
    expect(screen.getByTestId('toasts-open-length')).toHaveTextContent('3');

    await user.click(screen.getByTestId('dismiss-all'));

    expect(screen.getByTestId('toasts-open-length')).toHaveTextContent('0');
  });

  it('dismisses a toast via the close button', async () => {
    render(<TestApp />);

    await user.click(screen.getByTestId('add-toast'));

    const closeButton = document.querySelector('button[toast-close=""]');
    expect(closeButton).toBeInTheDocument();
    expect(screen.getByTestId('toasts-open-length')).toHaveTextContent('1');

    await act(async () => {
      closeButton.click();
    });

    expect(screen.getByTestId('toasts-open-length')).toHaveTextContent('0');
  });
});
