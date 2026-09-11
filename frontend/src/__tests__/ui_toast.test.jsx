import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster } from '../components/ui/use-toast';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

const TestComponent = () => {
  const { toast } = useToast();

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'Test Description' })}>
        Show Toast
      </button>
    </div>
  );
};

const DismissTestComponent = () => {
    const { toast, dismiss } = useToast();
    const [toastId, setToastId] = React.useState(null);

    return (
        <div>
            <button onClick={() => {
                const { id } = toast({ title: 'Dismissable Toast', description: 'Will be dismissed' });
                setToastId(id);
            }}>
                Show Dismissable Toast
            </button>
            <button onClick={() => dismiss(toastId)}>
                Dismiss Toast
            </button>
        </div>
    )
}


const UpdateTestComponent = () => {
    const { toast } = useToast();
    const [updater, setUpdater] = React.useState(null);

    return (
        <div>
            <button onClick={() => {
                const { update } = toast({ title: 'Initial Toast', description: 'Initial Description' });
                setUpdater(() => update);
            }}>
                Show Updatable Toast
            </button>
            <button onClick={() => updater && updater({ title: 'Updated Toast', description: 'Updated Description' })}>
                Update Toast
            </button>
        </div>
    )
}


describe('Toast Components', () => {
  beforeEach(() => {
    // Clear toast state between tests
    const ClearComponent = () => {
      const { dismiss } = useToast();
      useEffect(() => {
        dismiss();
      }, []);
      return null;
    };
    render(<ClearComponent />);
  });

  it('renders a toast when triggered', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    await user.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('dismisses a toast when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <>
          <TestComponent />
          <Toaster />
        </>
      );

      await user.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Test Toast')).toBeInTheDocument();

      const closeButton = document.querySelector('button[toast-close=""]');
      expect(closeButton).toBeInTheDocument();

      await act(async () => {
          closeButton.click();
      });

      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });

  it('updates an existing toast', async () => {
      const user = userEvent.setup();
      render(
        <>
          <UpdateTestComponent />
          <Toaster />
        </>
      );

      await user.click(screen.getByText('Show Updatable Toast'));
      expect(screen.getByText('Initial Toast')).toBeInTheDocument();

      await user.click(screen.getByText('Update Toast'));
      expect(screen.getByText('Updated Toast')).toBeInTheDocument();
      expect(screen.queryByText('Initial Toast')).not.toBeInTheDocument();
  });

  it('programmatically dismisses a toast', async () => {
      const user = userEvent.setup();
      render(
        <>
          <DismissTestComponent />
          <Toaster />
        </>
      );

      await user.click(screen.getByText('Show Dismissable Toast'));
      expect(screen.getByText('Dismissable Toast')).toBeInTheDocument();

      await user.click(screen.getByText('Dismiss Toast'));
      expect(screen.queryByText('Dismissable Toast')).not.toBeInTheDocument();
  });

});
