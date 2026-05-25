import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '../components/ui/NotificationHub';

const TestComponent = () => {
  const { addNotification } = useNotifications();
  return (
    <button onClick={() => addNotification('success', 'Test Title', 'Test Message')}>
      Add Notification
    </button>
  );
};

describe('NotificationHub', () => {
  it('should display a notification when addNotification is called', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Add Notification'));

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });
});
