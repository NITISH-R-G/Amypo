import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from '../components/ui/toast';

// Mock ResizeObserver for Radix UI Toast
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Need to mock getBoundingClientRect
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
}));

describe('Toast Components', () => {
  it('renders a toast with title, description, and action', () => {
    render(
      <ToastProvider>
        <Toast open={true}>
          <div className="grid gap-1">
            <ToastTitle>Test Title</ToastTitle>
            <ToastDescription>Test Description</ToastDescription>
          </div>
          <ToastAction altText="Try again">Action</ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('closes the toast when close button is clicked', async () => {
    const handleOpenChange = vi.fn();

    render(
      <ToastProvider>
        <Toast open={true} onOpenChange={handleOpenChange}>
          <ToastTitle>Test Title</ToastTitle>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );

    const closeButton = screen.getByRole('button');

    // Using simple click on DOM node to avoid PointerCapture issues in JSDOM with Radix
    await act(async () => {
      closeButton.click();
    });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
