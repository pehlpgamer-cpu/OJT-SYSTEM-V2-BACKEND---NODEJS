<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Company;
use App\Models\Coordinator;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * POST /api/auth/register
     * Create a new user + role-specific profile.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            // Students are active immediately; companies/coordinators need approval
            $status = $data['role'] === 'student' ? 'active' : 'pending';

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => $data['role'],
                'status' => $status,
                'email_verified_at' => now(), // Auto-verify (no real email)
            ]);

            // Create role-specific profile
            $this->createRoleProfile($user, $data);

            return $user;
        });

        return response()->json([
            'message' => 'Registration successful.',
            'user' => $user->only('id', 'name', 'email', 'role', 'status'),
        ], 201);
    }

    /**
     * POST /api/auth/login
     * Authenticate and return a Bearer token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = User::where('email', $data['email'])->first();

        // Invalid credentials check
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        // Account status check
        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Account is not active. Current status: ' . $user->status,
            ], 403);
        }

        // Update last login timestamp
        $user->update(['last_login_at' => now()]);

        // Create Sanctum token
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $user->only('id', 'name', 'email', 'role', 'status'),
        ]);
    }

    /**
     * POST /api/auth/logout
     * Revoke the current token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * POST /api/auth/verify-email
     * Placeholder — auto-verified on register since no real email.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->update(['email_verified_at' => now()]);

        return response()->json(['message' => 'Email verified.']);
    }

    /**
     * POST /api/auth/forgot-password
     * Placeholder — returns success message (no real email sent).
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $exists = User::where('email', $request->email)->exists();

        // Always return success to prevent email enumeration (OWASP)
        return response()->json([
            'message' => 'If that email exists, a reset link has been sent.',
        ]);
    }

    /**
     * POST /api/auth/reset-password
     * Placeholder — resets password directly for demo.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'If that email exists, password has been reset.']);
        }

        $user->update(['password' => $request->password]);

        return response()->json(['message' => 'Password reset successful.']);
    }

    /**
     * Create the role-specific profile record.
     */
    private function createRoleProfile(User $user, array $data): void
    {
        switch ($user->role) {
            case 'student':
                Student::create([
                    'user_id' => $user->id,
                    'first_name' => $data['first_name'] ?? '',
                    'last_name' => $data['last_name'] ?? '',
                ]);
                break;

            case 'company':
                Company::create([
                    'user_id' => $user->id,
                    'company_name' => $data['company_name'] ?? '',
                    'industry' => $data['industry'] ?? null,
                ]);
                break;

            case 'coordinator':
                Coordinator::create([
                    'user_id' => $user->id,
                    'first_name' => $data['first_name'] ?? $data['name'],
                    'last_name' => $data['last_name'] ?? '',
                    'department' => $data['department'] ?? null,
                    'school_affiliation' => $data['school_affiliation'] ?? null,
                ]);
                break;
        }
    }
}
