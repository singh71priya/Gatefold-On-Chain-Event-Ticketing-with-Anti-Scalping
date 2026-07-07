import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketStub from '../components/TicketStub';

describe('TicketStub', () => {
  it('renders event name and ticket id', () => {
    render(
      <TicketStub eventName="Indie Rock Night" ticketId={3} owner="GABCDEF1234567890" faceValue={100} maxResalePrice={110} checkedIn={false} />
    );
    expect(screen.getByText('Indie Rock Night')).toBeInTheDocument();
    expect(screen.getByText('Ticket #0003')).toBeInTheDocument();
  });

  it('shows "Admitted" stamp when checked in', () => {
    render(
      <TicketStub eventName="Show" ticketId={1} owner="G123" faceValue={50} maxResalePrice={55} checkedIn={true} />
    );
    expect(screen.getByText('Admitted')).toBeInTheDocument();
    expect(screen.getByText('Used')).toBeInTheDocument();
  });

  it('calls onAction when the action button is clicked', async () => {
    const onAction = vi.fn();
    render(
      <TicketStub
        eventName="Show"
        ticketId={1}
        owner="G123"
        faceValue={50}
        maxResalePrice={55}
        checkedIn={false}
        onAction={onAction}
        actionLabel="Resell"
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Resell'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
