<?php

namespace App\Http\Controllers;

use App\Models\OjtPosting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OjtPostingController extends Controller
{
    /**
     * GET /api/ojt-postings — Browse all active postings (public for authenticated users).
     */
    public function index(Request $request): JsonResponse
    {
        $query = OjtPosting::where('status', 'active')
            ->with(['company', 'skills']);

        // Optional filters
        if ($request->filled('industry')) {
            $query->where('industry', 'like', '%' . $request->industry . '%');
        }

        if ($request->filled('location')) {
            $query->where('location', 'like', '%' . $request->location . '%');
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        $postings = $query->orderByDesc('created_at')->paginate(15);

        return response()->json($postings);
    }

    /**
     * GET /api/ojt-postings/{id} — View posting details.
     */
    public function show(int $id): JsonResponse
    {
        $posting = OjtPosting::with(['company', 'skills'])->findOrFail($id);

        return response()->json(['data' => $posting]);
    }
}
