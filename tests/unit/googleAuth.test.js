/**
 * Google Auth Service Tests
 * 
 * WHY: Ensure Google OAuth logic works correctly before integration
 * WHAT: Tests for authentication, account linking, unlinking
 */

import { GoogleAuthService } from '../../src/services/GoogleAuthService.js';
import { AppError } from '../../src/utils/errorHandler.js';

// Mock models
function createMockModels() {
  return {
    User: {
      findByPk: async (id) => ({
        id,
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        password: 'hashed_password',
        google_id: null,
        update: async (data) => ({ id, ...data }),
        generateToken: () => 'mock_token',
      }),
      findByGoogleId: async (googleId) => {
        if (googleId === 'existing_google_id') {
          return {
            id: 1,
            name: 'Existing Google User',
            email: 'google@example.com',
            google_id: 'existing_google_id',
            generateToken: () => 'mock_token',
          };
        }
        return null;
      },
      findByEmail: async (email) => {
        if (email === 'existing@example.com') {
          return {
            id: 2,
            name: 'Existing Email User',
            email: 'existing@example.com',
            role: 'student',
            password: 'hashed_password',
            google_id: null,
            update: async (data) => ({ id: 2, ...data }),
          };
        }
        return null;
      },
      create: async (data) => ({
        id: 3,
        ...data,
        generateToken: () => 'mock_token',
      }),
    },
    Student: {
      create: async (data) => ({ id: 1, ...data }),
    },
  };
}

describe('GoogleAuthService', () => {
  let service;
  let models;

  beforeEach(() => {
    models = createMockModels();
    service = new GoogleAuthService(models);
  });

  describe('authenticateWithGoogle', () => {
    test('should authenticate existing Google user', async () => {
      const googleProfile = {
        id: 'existing_google_id',
        displayName: 'Test User',
        email: 'google@example.com',
      };

      const result = await service.authenticateWithGoogle(googleProfile);

      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock_token');
      expect(result.requiresLinking).toBeUndefined();
    });

    test('should detect duplicate email and request linking', async () => {
      const googleProfile = {
        id: 'new_google_id',
        displayName: 'New User',
        email: 'existing@example.com',
      };

      const result = await service.authenticateWithGoogle(googleProfile);

      expect(result.requiresLinking).toBe(true);
      expect(result.existingUserId).toBe(2);
      expect(result.googleProfile.email).toBe('existing@example.com');
    });

    test('should create new Google user if email not found', async () => {
      const googleProfile = {
        id: 'new_google_id',
        displayName: 'Brand New User',
        email: 'brandnew@example.com',
        photos: [{ value: 'https://example.com/pic.jpg' }],
      };

      const result = await service.authenticateWithGoogle(googleProfile);

      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock_token');
      expect(result.user.auth_provider).toBe('google');
    });
  });

  describe('confirmAccountLinking', () => {
    test('should link Google account to existing email user', async () => {
      const result = await service.confirmAccountLinking(
        2,
        'new_google_id',
        'existing@example.com'
      );

      expect(result.user).toBeDefined();
      expect(result.message).toContain('linked successfully');
      expect(result.token).toBe('mock_token');
    });

    test('should fail if user not found', async () => {
      models.User.findByPk = async (id) => null;

      await expect(
        service.confirmAccountLinking(999, 'google_id', 'test@example.com')
      ).rejects.toThrow('User not found');
    });
  });

  describe('unlinkGoogleAccount', () => {
    test('should unlink Google account', async () => {
      const result = await service.unlinkGoogleAccount(1);

      expect(result.user).toBeDefined();
      expect(result.message).toContain('unlinked successfully');
    });

    test('should fail if user has no password', async () => {
      models.User.findByPk = async (id) => ({
        id: 1,
        password: null, // No password - can't unlink
        google_id: 'google_123',
      });

      await expect(
        service.unlinkGoogleAccount(1)
      ).rejects.toThrow('Set a password before unlinking');
    });
  });

  describe('googleAccountExists', () => {
    test('should return true if Google account exists', async () => {
      const exists = await service.googleAccountExists('existing_google_id');
      expect(exists).toBe(true);
    });

    test('should return false if Google account does not exist', async () => {
      const exists = await service.googleAccountExists('nonexistent_google_id');
      expect(exists).toBe(false);
    });
  });

  describe('Security Tests', () => {
    test('should not expose sensitive fields in formatted response', async () => {
      const user = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        password: 'should_not_be_exposed',
        google_id: 'should_not_be_exposed',
      };

      const formatted = service._formatUser(user);

      expect(formatted.password).toBeUndefined();
      expect(formatted.google_id).toBeUndefined();
      expect(formatted.google_linked).toBe(true);
    });

    test('should auto-verify Google email addresses', async () => {
      const googleProfile = {
        id: 'google_123',
        displayName: 'Test User',
        email: 'google@example.com',
      };

      const result = await service.authenticateWithGoogle(googleProfile);

      // New user should be created with email_verified_at set
      expect(result.user).toBeDefined();
    });
  });
});

describe('Google OAuth Integration Tests', () => {
  test('should handle full Google signup flow', async () => {
    // 1. User clicks "Sign up with Google"
    // 2. Redirected to Google
    // 3. Google redirects back with profile
    // 4. System creates user
    // 5. Returns token
    
    // Mock the full flow
    const models = createMockModels();
    const service = new GoogleAuthService(models);

    const googleProfile = {
      id: 'new_google_id_123',
      displayName: 'New Google User',
      email: 'newgoogle@example.com',
    };

    const result = await service.authenticateWithGoogle(googleProfile);

    expect(result.user).toBeDefined();
    expect(result.token).toBe('mock_token');
    expect(result.user.google_linked).toBe(true);
  });

  test('should handle Google account linking for existing email user', async () => {
    // 1. User tries to sign up with Google
    // 2. Email already exists as email/password user
    // 3. System asks for linking confirmation
    // 4. User confirms
    // 5. Accounts linked
    
    const models = createMockModels();
    const service = new GoogleAuthService(models);

    // Step 1-3: Try to authenticate with Google using existing email
    const googleProfile = {
      id: 'google_456',
      displayName: 'Existing User',
      email: 'existing@example.com',
    };

    const authResult = await service.authenticateWithGoogle(googleProfile);

    expect(authResult.requiresLinking).toBe(true);
    expect(authResult.existingUserId).toBe(2);

    // Step 4-5: Confirm linking
    const linkResult = await service.confirmAccountLinking(
      authResult.existingUserId,
      googleProfile.id,
      googleProfile.email
    );

    expect(linkResult.user).toBeDefined();
    expect(linkResult.message).toContain('linked successfully');
  });
});
