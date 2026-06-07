import { render, screen, act } from '@testing-library/react';
import Home from '@/app/page';

describe('Home Page', () => {
  it('renders summer course booking login page', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slots: [] }),
      } as unknown as Response)
    );

    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText('Jeff老師暑期班預約系統')).toBeInTheDocument();
  });
});
