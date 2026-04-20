import { render, screen } from '@testing-library/react';
import App from './App';

test('renders portal header', () => {
  render(<App />);
  const header = screen.getByText(/portal/i);
  expect(header).toBeInTheDocument();
});
