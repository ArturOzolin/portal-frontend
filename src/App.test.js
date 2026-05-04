import { render, screen } from '@testing-library/react';
import App from './App';
import { I18nProvider } from './i18n/I18nProvider';

test('renders portal header', () => {
  render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );
  const header = screen.getByText(/portal/i);
  expect(header).toBeInTheDocument();
});
