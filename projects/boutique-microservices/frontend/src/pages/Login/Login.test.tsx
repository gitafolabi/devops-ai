import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { AuthContext } from '../../contexts/AuthContext';

const mockLogin = jest.fn();
const mockClearError = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderLogin = (authOverrides = {}) => {
  const authValue = {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    login: mockLogin,
    logout: jest.fn(),
    clearError: mockClearError,
    ...authOverrides,
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Login page', () => {
  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders Sign In button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows link to register page', () => {
    renderLogin();
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
  });

  it('displays error message from auth context', () => {
    renderLogin({ error: 'Invalid email or password' });
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });

  it('disables button and shows loading text when loading', () => {
    renderLogin({ loading: true });
    const button = screen.getByRole('button', { name: /signing in/i });
    expect(button).toBeDisabled();
  });

  it('calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('navigates to home on successful login', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
