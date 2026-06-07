import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

describe('Home Page', () => {
  it('renders scaffolded message', () => {
    render(<Home />);
    expect(screen.getByText('Scaffolded')).toBeInTheDocument();
  });
});
