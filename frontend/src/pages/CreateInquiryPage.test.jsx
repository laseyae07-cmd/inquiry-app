import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CreateInquiryPage from './CreateInquiryPage';
import { api, ApiError } from '../api/client';

// Replace the real API with a fake, so no server is needed.
// ApiError is kept real because the page checks error.status and error.fields.
vi.mock('../api/client', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, api: { createInquiry: vi.fn() } };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateInquiryPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateInquiryPage', () => {
  it('shows field errors and does NOT call the API when the form is empty', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /save inquiry/i }));

    expect(screen.getByText('Customer name is required')).toBeInTheDocument();
    expect(screen.getByText('Subject is required')).toBeInTheDocument();
    expect(api.createInquiry).not.toHaveBeenCalled();
  });

  it('shows the server message and keeps what the user typed when saving fails', async () => {
    api.createInquiry.mockRejectedValue(
      new ApiError(0, { error: 'Cannot reach the server. Check your connection and try again' })
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Customer name'), 'Nimal Perera');
    await user.type(screen.getByLabelText('Contact (phone or email)'), '0771234567');
    await user.type(screen.getByLabelText('Subject'), 'Late delivery');
    await user.type(screen.getByLabelText('Description'), 'Order has not arrived.');
    await user.click(screen.getByRole('button', { name: /save inquiry/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    // The typed text is still there, and the button can be clicked again
    expect(screen.getByLabelText('Customer name')).toHaveValue('Nimal Perera');
    expect(screen.getByRole('button', { name: /save inquiry/i })).toBeEnabled();
  });
});