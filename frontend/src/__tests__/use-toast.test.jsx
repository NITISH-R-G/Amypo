import React, { useEffect } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToast, toast, Toaster } from '../components/ui/use-toast';

// Helper component to clear toast state
function ClearToasts() {
  const { dismiss } = useToast();
  useEffect(() => {
    dismiss();
  }, []);
  return null;
}

function TestComponent() {
  return (
    <div>
      <button onClick={() => toast({ id: 'test-toast', title: 'Test Title', description: 'Test Description' })}>
        Show Toast
      </button>
      <button onClick={() => toast({ title: 'Another Toast' })}>
        Show Another Toast
      </button>
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    render(<ClearToasts />);
  });

  it('renders a toast when triggered', async () => {
    render(
      <>
        <Toaster />
        <TestComponent />
      </>
    );

    const button = screen.getByText('Show Toast');
    await userEvent.click(button);

    expect(await screen.findByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('updates a toast when requested', async () => {
    let updateToast;

    function UpdaterComponent() {
      return (
        <button onClick={() => {
          const { update } = toast({ title: 'Initial Title', id: 'update-id' });
          updateToast = update;
        }}>
          Show Updating Toast
        </button>
      );
    }

    render(
      <>
        <Toaster />
        <UpdaterComponent />
      </>
    );

    await userEvent.click(screen.getByText('Show Updating Toast'));
    expect(await screen.findByText('Initial Title')).toBeInTheDocument();

    act(() => {
      updateToast({ title: 'Updated Title' });
    });

    expect(await screen.findByText('Updated Title')).toBeInTheDocument();
    expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
  });

  it('dismisses a toast when the close button is clicked', async () => {
    render(
      <>
        <Toaster />
        <TestComponent />
      </>
    );

    await userEvent.click(screen.getByText('Show Toast'));
    expect(await screen.findByText('Test Title')).toBeInTheDocument();

    const closeButton = document.querySelector('button[toast-close=""]');
    expect(closeButton).toBeInTheDocument();

    // Use direct DOM click as per memory for Radix UI toast close buttons
    act(() => {
      closeButton.click();
    });

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('removes toasts appropriately based on limit', async () => {
      render(
        <>
          <Toaster />
          <TestComponent />
        </>
      );

      const button = screen.getByText('Show Another Toast');

      // The limit is 3, let's create 4 toasts
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);

      const titles = await screen.findAllByText('Another Toast');
      expect(titles.length).toBe(3); // Should be limited to 3 toasts
  });
});
