<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    /**
     * GET /api/admin/users — List all users with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        $users = $query->orderByDesc('created_at')->paginate(15);

        return response()->json($users);
    }

    /**
     * PATCH /api/admin/users/{id}/activate — Activate a user account.
     */
    public function activate(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['status' => 'active']);

        return response()->json([
            'message' => 'User activated.',
            'data' => $user->fresh(),
        ]);
    }

    /**
     * PATCH /api/admin/users/{id}/suspend — Suspend a user account.
     */
    public function suspend(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Prevent self-suspension
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'You cannot suspend yourself.'], 422);
        }

        $user->update(['status' => 'suspended']);

        // Revoke all tokens
        $user->tokens()->delete();

        return response()->json([
            'message' => 'User suspended.',
            'data' => $user->fresh(),
        ]);
    }
}
