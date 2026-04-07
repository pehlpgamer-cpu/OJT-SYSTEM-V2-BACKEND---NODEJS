<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGuidelineRequest;
use App\Models\OjtGuideline;
use Illuminate\Http\JsonResponse;

class GuidelineController extends Controller
{
    /**
     * GET /api/guidelines — Public: list published guidelines.
     * GET /api/admin/guidelines — Admin: list all guidelines.
     */
    public function index(): JsonResponse
    {
        $query = OjtGuideline::orderBy('sort_order');

        if (!auth()->check() || !auth()->user()->isAdmin()) {
            $query->where('is_published', true);
        }

        $guidelines = $query->get();

        return response()->json(['data' => $guidelines]);
    }

    /**
     * POST /api/admin/guidelines — Create a guideline.
     */
    public function store(StoreGuidelineRequest $request): JsonResponse
    {
        $guideline = OjtGuideline::create($request->validated());

        return response()->json([
            'message' => 'Guideline created.',
            'data' => $guideline,
        ], 201);
    }

    /**
     * PUT /api/admin/guidelines/{id} — Update a guideline.
     */
    public function update(StoreGuidelineRequest $request, int $id): JsonResponse
    {
        $guideline = OjtGuideline::findOrFail($id);
        $guideline->update($request->validated());

        return response()->json([
            'message' => 'Guideline updated.',
            'data' => $guideline->fresh(),
        ]);
    }

    /**
     * DELETE /api/admin/guidelines/{id} — Delete a guideline.
     */
    public function destroy(int $id): JsonResponse
    {
        OjtGuideline::findOrFail($id)->delete();

        return response()->json(['message' => 'Guideline deleted.']);
    }
}
