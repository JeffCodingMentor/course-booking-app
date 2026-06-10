import { render, screen, act } from '@testing-library/react';
import Home from '@/app/page';

describe('Home Page', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders summer course booking login page and does not show info button', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slots: [] }),
      } as unknown as Response)
    );

    await act(async () => {
      render(<Home />);
    });
    
    // Title is present
    expect(screen.getByText('Jeff老師暑期班預約系統')).toBeInTheDocument();
    
    // The "說明" button should NOT be rendered on the login screen
    const infoButton = screen.queryByRole('button', { name: '說明' });
    expect(infoButton).toBeNull();
  });

  it('renders booking dashboard with info button when logged in', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slots: [] }),
      } as unknown as Response)
    );

    const mockStudent = {
      id: 'student_123',
      name: '張三',
      birthday: '20180815',
      parentPhone: '0912345678'
    };
    localStorage.setItem('student_session', JSON.stringify(mockStudent));

    await act(async () => {
      render(<Home />);
    });

    // The "說明" button should be rendered for logged-in students
    const infoButton = screen.getByRole('button', { name: '說明' });
    expect(infoButton).toBeInTheDocument();
  });
});
