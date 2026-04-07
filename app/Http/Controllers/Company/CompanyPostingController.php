<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreOjtPostingRequest;
use App\Http\Requests\Company\UpdateOjtPostingRequest;
use App\Models\OjtPosting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompanyPostingController extends Controller
{
    /**
     * GET /api/companies/me/ojt-postings — List company's own postings.
     */
    public function index(Request $request): JsonResponse
    {
        $company = $request->user()->company;

        $postings = $company->ojtPostings()
            ->with('skills')
            ->withCount('applications')
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json($postings);
    }

    /**
     * POST /api/companies/me/ojt-postings — Create a new OJT posting.
     */
    public function store(StoreOjtPostingRequest $request): JsonResponse
    {
        $company = $request->user()->company;
        $data = $request->validated();

        $posting = DB::transaction(function () use ($company, $data) {
            $posting = $company->ojtPostings()->create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'location' => $data['location'] ?? null,
                'industry' => $data['industry'] ?? $company->industry,
                'slots' => $data['slots'],
                'duration' => $data['duration'] ?? null,
                'schedule' => $data['schedule'] ?? null,
            ]);

            // Create skill requirements
            if (!empty($data['skills'])) {
                foreach ($data['skills'] as $skill) {
                    $posting->skills()->create([
                        'skill_name' => $skill['skill_name'],
                        'is_required' => $skill['is_required'] ?? true,
                    ]);
                }
            }

            return $posting;
        });

        return response()->json([
            'message' => 'OJT posting created.',
            'data' => $posting->load('skills'),
        ], 201);
    }

    /**
     * PUT /api/ojt-postings/{id} — Update a posting.
     */
    public function update(UpdateOjtPostingRequest $request, int $id): JsonResponse
    {
        $company = $request->user()->company;
        $posting = $company->ojtPostings()->findOrFail($id);
        $data = $request->validated();

        DB::transaction(function () use ($posting, $data) {
            $posting->update(collect($data)->except('skills')->toArray());

            // Replace skills if provided
            if (array_key_exists('skills', $data)) {
                $posting->skills()->delete();
                foreach ($data['skills'] as $skill) {
                    $posting->skills()->create([
                        'skill_name' => $skill['skill_name'],
                        'is_required' => $skill['is_required'] ?? true,
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Posting updated.',
            'data' => $posting->fresh('skills'),
        ]);
    }

    /**
     * PATCH /api/ojt-postings/{id}/status — Activate/deactivate posting.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:active,inactive,closed'],
        ]);

        $company = $request->user()->company;
        $posting = $company->ojtPostings()->findOrFail($id);

        $posting->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Posting status updated.',
            'data' => $posting->fresh(),
        ]);
    }

    /**
     * DELETE /api/ojt-postings/{id} — Delete a posting.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $company = $request->user()->company;
        $posting = $company->ojtPostings()->findOrFail($id);

        // Only delete if no accepted applications
        $hasAccepted = $posting->applications()->where('status', 'accepted')->exists();
        if ($hasAccepted) {
            return response()->json(['message' => 'Cannot delete a posting with accepted applications.'], 422);
        }

        $posting->delete();

        return response()->json(['message' => 'Posting deleted.']);
    }
}
