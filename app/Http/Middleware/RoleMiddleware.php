<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Restrict access to specific user roles.
 * Usage: ->middleware('role:student,company')
 */
class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        $user = $request->user();

        // No authenticated user
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Check if user role is in the allowed list
        if (!in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'Forbidden. Insufficient role.'], 403);
        }

        // Check if account is active
        if ($user->status !== 'active') {
            return response()->json(['message' => 'Account is not active.'], 403);
        }

        return $next($request);
    }
}
