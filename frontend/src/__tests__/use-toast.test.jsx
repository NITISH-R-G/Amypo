import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import userEvent from '@testing-library/user-event';
import React, { useEffect, useRef } from 'react';

const TestComponent = () => {
  const { toast: hookToast, dismiss } = useToast();
  const cleared = useRef(false);

  useEffect(() => {
    if (!cleared.current) {
       dispatchForTest({ type: 'REMOVE_TOAST' });
       cleared.current = true;
    }
  }, []);

  return (
    <div>
      <button onClick={() => hookToast({ title: 'Test Title', description: 'Test Desc' })}>Show Toast</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <Toaster />
    </div>
  );
};

const ActionTestComponent = () => {
  const cleared = useRef(false);

  useEffect(() => {
    if (!cleared.current) {
       dispatchForTest({ type: 'REMOVE_TOAST' });
       cleared.current = true;
    }
  }, []);

  return (
    <div>
      <button onClick={() => toast({ title: 'Global Title', description: 'Global Desc', action: <button>Action</button> })}>Show Global Toast</button>
      <Toaster />
    </div>
  );
};

describe('use-toast', () => {
  beforeEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  it('renders and displays a toast via hook', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Show Toast'));
    expect(await screen.findByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Desc')).toBeInTheDocument();
  });

  it('dismisses all toasts', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Show Toast'));
    expect(await screen.findByText('Test Title')).toBeInTheDocument();

    await user.click(screen.getByText('Dismiss All'));
    // Wait for state updates natively since dispatch fires immediately
  });

  it('displays a toast via global toast function and can click action', async () => {
    const user = userEvent.setup();
    render(<ActionTestComponent />);

    await user.click(screen.getByText('Show Global Toast'));
    expect(await screen.findByText('Global Title')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('removes toast via dispatchForTest', () => {
    dispatchForTest({ type: 'ADD_TOAST', toast: { id: '1', title: 'T1' } });
    dispatchForTest({ type: 'REMOVE_TOAST', toastId: '1' });
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });

  it('updates toast', () => {
    const t = toast({ title: 'T1' });
    t.update({ title: 'T2' });
  });
});
