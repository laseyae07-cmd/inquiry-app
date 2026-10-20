import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InquiryListPage from './InquiryListPage';
import { api, ApiError } from '../api/client';

vi.mock('../api/client', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, api: { listInquiries: vi.fn() } };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <InquiryListPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InquiryListPage', () => {
  it('shows the empty state when there are no inquiries', async () => {
    api.listInquiries.mockResolvedValue({ inquiries: [] });
    renderPage();

    expect(await screen.findByText('No inquiries yet.')).toBeInTheDocument();
  });

  it('shows an error with a Try again button when loading fails', async () => {
    api.listInquiries.mockRejectedValue(new ApiError(0, { error: 'Cannot reach the server' }));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows each inquiry with its status', async () => {
    api.listInquiries.mockResolvedValue({
      inquiries: [{
        id: '11111111-1111-1111-1111-111111111111',
        subject: 'Late delivery',
        customer_name: 'Nimal Perera',
        status: 'In Progress',
        created_at: '2026-10-20T08:00:00Z',
      }],
    });
    renderPage();

    // Find the table row for this inquiry, then look only inside that row
    const row = (await screen.findByText('Late delivery')).closest('tr');
    expect(within(row).getByText('In Progress')).toBeInTheDocument();
  });
});