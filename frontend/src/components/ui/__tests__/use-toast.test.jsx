import React from 'react';
import { renderHook, act, render, screen } from '@testing-library/react';
import { useToast, toast, Toaster } from '../use-toast';
import { ToastProvider, Toast, ToastAction, ToastViewport } from '../toast';

describe('use-toast', () => {
  beforeEach(() => {
    // Clear toasts between tests
    const { result } = renderHook(() => useToast());
    act(() => {
      // Clear all toasts before each test by removing them completely
      result.current.remove();
    });
  });

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test Toast', description: 'This is a test' });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
  });

  it('should update a toast', () => {
    const { result } = renderHook(() => useToast());
    let toastRef;

    act(() => {
      toastRef = toast({ title: 'Initial Title', description: 'Initial' });
    });

    act(() => {
      toastRef.update({ title: 'Updated Title' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
    expect(result.current.toasts[0].description).toBe('Initial');
  });

  it('should dismiss a specific toast', () => {
    const { result } = renderHook(() => useToast());
    let toast1, toast2;

    act(() => {
      toast1 = toast({ title: 'Toast 1' });
      toast2 = toast({ title: 'Toast 2' });
    });

    act(() => {
      toast1.dismiss();
    });

    expect(result.current.toasts.find(t => t.id === toast1.id).open).toBe(false);
    expect(result.current.toasts.find(t => t.id === toast2.id).open).toBe(true);
  });

  it('should dismiss all toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    act(() => {
      result.current.dismiss();
    });

    result.current.toasts.forEach(t => {
      expect(t.open).toBe(false);
    });
  });

  it('should handle onOpenChange with false', () => {
     const { result } = renderHook(() => useToast());
     let toastRef;
     act(() => {
       toastRef = toast({ title: 'Test' });
     });

     const t = result.current.toasts.find(x => x.id === toastRef.id);

     act(() => {
       t.onOpenChange(false);
     });

     expect(result.current.toasts.find(x => x.id === toastRef.id).open).toBe(false);
  });

  it('should handle onOpenChange with true gracefully', () => {
     const { result } = renderHook(() => useToast());
     let toastRef;
     act(() => {
       toastRef = toast({ title: 'Test' });
     });

     const t = result.current.toasts.find(x => x.id === toastRef.id);

     act(() => {
       t.onOpenChange(true);
     });

     expect(result.current.toasts.find(x => x.id === toastRef.id).open).toBe(true);
  });

  it('renders Toaster component correctly', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Rendered Toast', description: 'This is visible', action: <button>Action</button> });
    });

    expect(screen.getByText('Rendered Toast')).toBeInTheDocument();
    expect(screen.getByText('This is visible')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('renders ToastAction correctly', () => {
    render(
      <ToastProvider>
        <Toast>
          <ToastAction altText="Try again">Try again</ToastAction>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('should remove a specific toast completely', () => {
    const { result } = renderHook(() => useToast());
    let toast1, toast2;

    act(() => {
      toast1 = toast({ title: 'Toast 1' });
      toast2 = toast({ title: 'Toast 2' });
    });

    expect(result.current.toasts.length).toBe(2);

    act(() => {
      result.current.remove(toast1.id);
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].id).toBe(toast2.id);
  });

  it('should remove all toasts completely when toastId is undefined', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    expect(result.current.toasts.length).toBe(2);

    act(() => {
      result.current.remove(); // Action REMOVE_TOAST with undefined ID
    });

    expect(result.current.toasts.length).toBe(0);
  });
});
