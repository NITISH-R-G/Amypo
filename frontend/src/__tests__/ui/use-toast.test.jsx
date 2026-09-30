import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../../components/ui/use-toast';
import * as React from 'react';

const TestComponent = () => {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast({ id: 'test-id', title: 'Test Toast', description: 'Test Description' })}>
        Show Toast
      </button>
      <button onClick={() => toast({ title: 'Test Toast 2', description: 'Test Description 2' })}>
        Show Toast 2
      </button>
      <Toaster />
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    act(() => {
      dispatchForTest({ type: 'REMOVE_TOAST' });
    });
  });

  it('renders a toast when triggered', async () => {
    render(<TestComponent />);
    const button = screen.getByText('Show Toast');

    await act(async () => {
      button.click();
    });

    expect(await screen.findByText('Test Toast')).toBeInTheDocument();
    expect(await screen.findByText('Test Description')).toBeInTheDocument();
  });

  it('dismisses a toast when close button is clicked', async () => {
    render(<TestComponent />);
    const button = screen.getByText('Show Toast');

    await act(async () => {
      button.click();
    });

    expect(await screen.findByText('Test Toast')).toBeInTheDocument();
    const closeBtn = document.querySelector('[toast-close]');

    await act(async () => {
      closeBtn.click();
    });

    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });

  it('handles UPDATE_TOAST properly', async () => {
    render(<TestComponent />);
    const button = screen.getByText('Show Toast');

    let t;
    await act(async () => {
      t = toast({ id: 't1', title: 'Initial Title' });
    });

    expect(await screen.findByText('Initial Title')).toBeInTheDocument();

    await act(async () => {
      t.update({ title: 'Updated Title' });
    });

    expect(await screen.findByText('Updated Title')).toBeInTheDocument();
  });

  it('respects TOAST_LIMIT', async () => {
    render(<TestComponent />);
    await act(async () => {
      toast({ title: 'T1' });
      toast({ title: 'T2' });
      toast({ title: 'T3' });
      toast({ title: 'T4' });
    });

    // Since TOAST_LIMIT is 3, T1 should be removed
    expect(screen.queryByText('T1')).not.toBeInTheDocument();
    expect(screen.getByText('T2')).toBeInTheDocument();
    expect(screen.getByText('T3')).toBeInTheDocument();
    expect(screen.getByText('T4')).toBeInTheDocument();
  });

  it('can dismiss all toasts', async () => {
    render(<TestComponent />);
    await act(async () => {
      toast({ title: 'T1' });
      toast({ title: 'T2' });
    });

    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('T2')).toBeInTheDocument();

    await act(async () => {
      dispatchForTest({ type: 'DISMISS_TOAST' });
    });

    expect(screen.queryByText('T1')).not.toBeInTheDocument();
    expect(screen.queryByText('T2')).not.toBeInTheDocument();
  });

  it('can remove a specific toast', async () => {
    render(<TestComponent />);

    let id;
    await act(async () => {
      const res = toast({ title: 'T1' });
      id = res.id;
      toast({ title: 'T2' });
    });

    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('T2')).toBeInTheDocument();

    await act(async () => {
      dispatchForTest({ type: 'REMOVE_TOAST', toastId: id });
    });

    expect(screen.queryByText('T1')).not.toBeInTheDocument();
    expect(screen.getByText('T2')).toBeInTheDocument();
  });
});
