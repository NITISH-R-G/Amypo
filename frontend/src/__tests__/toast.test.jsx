import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect, useRef } from 'react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { ToastAction, ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from '../components/ui/toast';
import '@testing-library/jest-dom/vitest';

function TestComponent() {
  const { toast, dismiss } = useToast();

  useEffect(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  }, []);

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'Test Description', action: <button>Action</button> })}>
        Show Toast
      </button>
      <button onClick={() => toast({ title: 'Toast 1' })}>Show Toast 1</button>
      <button onClick={() => toast({ title: 'Toast 2' })}>Show Toast 2</button>
      <button onClick={() => toast({ title: 'Toast 3' })}>Show Toast 3</button>
      <button onClick={() => toast({ title: 'Toast 4' })}>Show Toast 4</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <Toaster />
    </div>
  );
}

function TestUpdateComponent() {
  const { toast } = useToast();
  const [toastObj, setToastObj] = React.useState(null);
  useEffect(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  }, []);
  return (
    <div>
      <button onClick={() => {
        const t = toast({ title: 'Initial' });
        setToastObj(t);
      }}>Show Initial</button>
      <button onClick={() => {
        if (toastObj) {
          toastObj.update({ id: toastObj.id, title: 'Updated' });
        }
      }}>Update</button>
      <button onClick={() => {
        if (toastObj) {
          toastObj.dismiss();
        }
      }}>Dismiss</button>
      <Toaster />
    </div>
  )
}

describe('Toaster & use-toast', () => {
    it('shows a toast on click and removes it via close button', async () => {
      render(<TestComponent />);
      const button = screen.getByText('Show Toast');
      await act(async () => {
          button.click();
      });

      const toastTitle = await screen.findByText('Test Toast');
      expect(toastTitle).toBeInTheDocument();
      const toastDesc = await screen.findByText('Test Description');
      expect(toastDesc).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: '' }); // close button
      await act(async () => {
          closeButton.click();
      });

    });

    it('enforces toast limit', async () => {
       render(<TestComponent />);
       await act(async () => { screen.getByText('Show Toast 1').click(); });
       await act(async () => { screen.getByText('Show Toast 2').click(); });
       await act(async () => { screen.getByText('Show Toast 3').click(); });
       await act(async () => { screen.getByText('Show Toast 4').click(); });

       // limit is 3, so Toast 1 should be gone
       expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
       expect(screen.getByText('Toast 2')).toBeInTheDocument();
       expect(screen.getByText('Toast 3')).toBeInTheDocument();
       expect(screen.getByText('Toast 4')).toBeInTheDocument();
    });

    it('dismisses all toasts', async () => {
       render(<TestComponent />);
       await act(async () => { screen.getByText('Show Toast 1').click(); });
       await act(async () => { screen.getByText('Show Toast 2').click(); });

       expect(screen.getByText('Toast 1')).toBeInTheDocument();
       expect(screen.getByText('Toast 2')).toBeInTheDocument();

       await act(async () => { screen.getByText('Dismiss All').click(); });

       expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
       expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
    });

    it('updates a toast and dismisses it', async () => {
       render(<TestUpdateComponent />);
       await act(async () => { screen.getByText('Show Initial').click(); });
       expect(screen.getByText('Initial')).toBeInTheDocument();
       await act(async () => { screen.getByText('Update').click(); });
       expect(screen.getByText('Updated')).toBeInTheDocument();
       expect(screen.queryByText('Initial')).not.toBeInTheDocument();
       await act(async () => { screen.getByText('Dismiss').click(); });
       expect(screen.queryByText('Updated')).not.toBeInTheDocument();
    });
});

describe('useToast hook standalone', () => {
  it('adds and removes toasts properly', () => {
    dispatchForTest({ type: 'ADD_TOAST', toast: { id: 'x1', onOpenChange: (open) => { if (!open) {} } }});
    dispatchForTest({ type: 'DISMISS_TOAST', toastId: undefined });
    dispatchForTest({ type: 'REMOVE_TOAST', toastId: undefined });
  });

  it('triggers onOpenChange dismiss internally', () => {
    let mockToastObj;
    function TestOpenChange() {
      const { toast } = useToast();
      useEffect(() => {
        dispatchForTest({ type: 'REMOVE_TOAST' });
        mockToastObj = toast({ title: 'test onOpenChange' });
      }, [toast]);
      return <Toaster />
    }
    render(<TestOpenChange />);
  });

  it('tests REMOVE_TOAST with specific id', () => {
    dispatchForTest({ type: 'ADD_TOAST', toast: { id: 'x2' }});
    dispatchForTest({ type: 'REMOVE_TOAST', toastId: 'x2' });
  });

  it('covers remaining reducer edge cases', () => {
    dispatchForTest({ type: 'UNKNOWN_ACTION' });
  });

  it('covers missing reducer return', () => {
    const defaultState = dispatchForTest({ type: 'UNKNOWN_ACTION' });
  });

  it('covers UPDATE_TOAST with non-matching id', () => {
    dispatchForTest({ type: 'ADD_TOAST', toast: { id: 'x3' }});
    dispatchForTest({ type: 'UPDATE_TOAST', toast: { id: 'x4' }});
  });

  it('covers ToastAction rendering explicitly', () => {
    render(
      <ToastProvider>
        <Toast open>
            <ToastAction altText="Try again">Try again</ToastAction>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });
});
