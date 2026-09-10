import React, { useEffect, useRef } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from '../components/ui/toast';

const TestComponent = () => {
  const { toast, dismiss, toasts } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
        dismiss();
        initialized.current = true;
    }
  }, [dismiss]);

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Title', description: 'Test Desc', action: <ToastAction altText="Action">Action</ToastAction> })}>
        Add Toast
      </button>
      <button onClick={() => dismiss()}>
        Dismiss All
      </button>
      <button onClick={() => {
        const { id, update, dismiss } = toast({ title: 'To Update' });
        setTimeout(() => update({ title: 'Updated Title' }), 10);
      }}>
        Update Toast
      </button>
      <button onClick={() => {
        const { id, dismiss } = toast({ title: 'To Dismiss' });
        setTimeout(() => dismiss(), 10);
      }}>
        Dismiss Single
      </button>
      <button onClick={() => {
        dispatchForTest({ type: "REMOVE_TOAST" });
      }}>
        Remove All
      </button>
      <button onClick={() => {
        const { id } = toast({ title: 'To Remove' });
        dispatchForTest({ type: "REMOVE_TOAST", toastId: id });
      }}>
        Remove Single
      </button>
    </div>
  );
};

describe('toast components', () => {
  it('renders Toaster and can add/update/dismiss/remove toasts', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestComponent />
        <Toaster />
      </ToastProvider>
    );

    await user.click(screen.getByText('Add Toast'));

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Desc')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();

    const closeBtn = document.querySelector('[toast-close]');
    expect(closeBtn).toBeInTheDocument();
    await user.click(closeBtn);

    await user.click(screen.getByText('Update Toast'));
    expect(await screen.findByText('Updated Title')).toBeInTheDocument();

    await user.click(screen.getByText('Dismiss All'));
    await user.click(screen.getByText('Dismiss Single'));

    await user.click(screen.getByText('Remove All'));
    await user.click(screen.getByText('Remove Single'));
  });

  it('can render toast primitives directly for refs and onOpenChange', () => {
    const ref = React.createRef();
    let onOpenChangeCalled = false;
    render(
      <ToastProvider>
        <Toast ref={ref} open={true} onOpenChange={(open) => { onOpenChangeCalled = true; }}>
          <ToastTitle ref={React.createRef()}>Title</ToastTitle>
          <ToastDescription ref={React.createRef()}>Desc</ToastDescription>
          <ToastAction ref={React.createRef()} altText="alt">Act</ToastAction>
          <ToastClose ref={React.createRef()} />
        </Toast>
        <ToastViewport ref={React.createRef()} />
      </ToastProvider>
    );
    expect(ref.current).not.toBeNull();
  });
});
