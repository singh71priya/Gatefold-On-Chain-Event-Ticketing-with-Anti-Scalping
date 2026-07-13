import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateEventForm from '../components/CreateEventForm';

describe('CreateEventForm', () => {
  it('disables submit until required fields are filled', () => {
    render(<CreateEventForm onCreate={vi.fn()} loading={false} />);
    const button = screen.getByText('Publish event on-chain');
    expect(button).toBeDisabled();
  });

  it('converts percentage inputs to basis points on submit', async () => {
    const onCreate = vi.fn();
    render(<CreateEventForm onCreate={onCreate} loading={false} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Indie Rock Night'), 'Jazz Night');
    await user.type(screen.getByPlaceholderText('100'), '200');
    await user.type(screen.getByPlaceholderText('50'), '30');

    await user.click(screen.getByText('Publish event on-chain'));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Jazz Night',
        faceValue: 2000000000, // 200 XLM × 10,000,000 stroops
        totalTickets: 30,
        maxResaleBps: 11000,
        royaltyBps: 500,
      })
    );
  });

  it('shows the loading label while submitting', () => {
    render(<CreateEventForm onCreate={vi.fn()} loading={true} />);
    expect(screen.getByText('Publishing…')).toBeInTheDocument();
  });
});
