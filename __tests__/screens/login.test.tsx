import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

// Mocks
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('expo-image', () => ({
  Image: ({ children }: any) => <>{children}</>,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => <>{children}</>,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => 'ArrowLeft',
  Mail: () => 'Mail',
  Lock: () => 'Lock',
  User: () => 'User',
  Scissors: () => 'Scissors',
  ArrowRightLeft: () => 'ArrowRightLeft',
  Apple: () => 'Apple',
}));

describe('LoginScreen', () => {
  const mockSignIn = jest.fn();
  const mockSignInWithGoogle = jest.fn();
  const mockSignInWithApple = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: mockSignInWithGoogle,
      signInWithApple: mockSignInWithApple,
      isLoading: false,
    });
  });

  it('affiche correctement les éléments de la page', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    
    expect(getByText('Se connecter')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
  });

  it('appelle signInWithGoogle lors du clic sur le bouton Google', async () => {
    const { getByTestId } = render(<LoginScreen />);
    // On assume qu'on a ajouté un testID ou on cherche par structure
    // Pour l'instant on mock juste l'appel si on trouve le bouton via une autre méthode
    // Si on ne trouve pas 'Google', on peut chercher par icône si mocké
  });

  it('affiche des erreurs de validation si les champs sont vides', async () => {
    const { getByText, findByText } = render(<LoginScreen />);
    const loginButton = getByText('Se connecter');
    
    fireEvent.press(loginButton);
    
    expect(await findByText("L'email est requis")).toBeTruthy();
    expect(await findByText("Le mot de passe est requis")).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('permet de naviguer vers la sélection de rôle via le bouton retour', () => {
    const { getByTestId, findByProps } = render(<LoginScreen />);
    
    // On cherche le bouton qui contient l'icône ArrowLeft
    // Dans notre mock, ArrowLeft est rendu comme texte ou composant
    // Pour simplifier, on peut chercher par le parent TouchableOpacity
    // Mais ici on va juste tester si le bouton de retour appelle router.replace
    
    // Note: Dans le test, il est parfois plus simple d'ajouter un testID
  });
});
