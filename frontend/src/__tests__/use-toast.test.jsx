import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect } from 'react';

describe('use-toast', () => {
  beforeEach(() => {
    dispatchForTest({ type: 'REMOVE_TOAST' });
  });


  afterEach(() => {
    vi.restoreAllMocks();
  })

  const TestComponent = () => {
    const { dismiss } = useToast();
    return (
      <div>
        <button onClick={() => toast({ title: 'Test Toast', description: 'Test Description' })}>Show Toast</button>
        <button onClick={() => dismiss()}>Dismiss All</button>
      </div>
    );
  };

  it('shows a toast when calling toast()', async () => {
    const user = userEvent.setup();
    render(<><TestComponent /><Toaster /></>);

    await user.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });


  it('updates a toast', async () => {
      let t;
      act(() => {
          t = toast({title: "Initial title"})
      })
      render(<Toaster />)
      expect(screen.getByText('Initial title')).toBeInTheDocument();

      act(() => {
          t.update({id: t.id, title: "Updated title"})
      })
      expect(screen.getByText('Updated title')).toBeInTheDocument();
      expect(screen.queryByText('Initial title')).not.toBeInTheDocument();
  })

  it('dismisses a toast', async () => {
      let t;
      render(<Toaster />)
      act(() => {
          t = toast({title: "Title"})
      })
      expect(screen.getByText('Title')).toBeInTheDocument();

      const li = screen.getByText('Title').closest('li');
      expect(li).toHaveAttribute('data-state', 'open');

      act(() => {
          t.dismiss()
      })

      await waitFor(() => {
         expect(li).toHaveAttribute('data-state', 'closed');
      });

  })

  it('limits toasts to TOAST_LIMIT (3)', () => {
      act(() => {
          toast({title: "1"})
          toast({title: "2"})
          toast({title: "3"})
          toast({title: "4"})
      })

      render(<Toaster />)
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it('handles DISMISS_TOAST without id', async () => {
      const user = userEvent.setup();
      render(<><TestComponent /><Toaster /></>)

      act(() => {
          toast({title: "1"})
          toast({title: "2"})
      })

      const lists = document.querySelectorAll('li')
      expect(lists.length).toBe(2)

      await user.click(screen.getByText('Dismiss All'));

      await waitFor(() => {
          expect(lists[0]).toHaveAttribute('data-state', 'closed')
          expect(lists[1]).toHaveAttribute('data-state', 'closed')
      })
  })

  it('handles REMOVE_TOAST with id', async () => {
      let t;
      act(() => {
          t = toast({title: "1"})
          toast({title: "2"})
      })
      render(<Toaster />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()

      act(() => {
          dispatchForTest({type: 'REMOVE_TOAST', toastId: t.id})
      })

      expect(screen.queryByText('1')).not.toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('handles ToastAction and ToastClose rendering', async () => {
      const { ToastAction, ToastClose } = await import('../components/ui/toast');
      const { render } = await import('@testing-library/react');

      const { container } = render(<ToastAction altText="Action">Action</ToastAction>);
      expect(container.textContent).toBe('Action')
  })

  it('handles onOpenChange dismiss', async () => {

      // mock the hasPointerCapture to prevent TypeError
      const originalHasPointerCapture = window.HTMLElement.prototype.hasPointerCapture;
      window.HTMLElement.prototype.hasPointerCapture = vi.fn();

      let t;
      act(() => {
          t = toast({title: "title1"})
      })
      render(<Toaster />)
      expect(screen.getByText('title1')).toBeInTheDocument()

      const li = screen.getByText('title1').closest('li');

      act(() => {
          t.dismiss()
      })
      await waitFor(() => {
          expect(li).toHaveAttribute('data-state', 'closed')
      })

      const user = userEvent.setup();

      act(() => {
          t = toast({title: "title2"})
      })

      const li2 = screen.getByText('title2').closest('li');

      const button2 = li2.querySelector('button')

      await user.click(button2);

      await waitFor(() => {
          expect(li2).toHaveAttribute('data-state', 'closed')
      })

      window.HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture;
  })


  it('handles REMOVE_TOAST without toastId', async () => {
      let t;
      act(() => {
          t = toast({title: "1"})
      })
      render(<Toaster />)
      expect(screen.getByText('1')).toBeInTheDocument()

      act(() => {
          dispatchForTest({type: 'REMOVE_TOAST'})
      })

      expect(screen.queryByText('1')).not.toBeInTheDocument()
  })
});
