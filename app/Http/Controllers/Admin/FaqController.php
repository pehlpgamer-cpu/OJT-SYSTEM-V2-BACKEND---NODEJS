<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFaqRequest;
use App\Models\Faq;
use Illuminate\Http\JsonResponse;

class FaqController extends Controller
{
    /**
     * GET /api/faqs — Public: list published FAQs.
     * GET /api/admin/faqs — Admin: list all FAQs.
     */
    public function index(): JsonResponse
    {
        $query = Faq::orderBy('sort_order');

        // Non-admin only sees published
        if (!auth()->check() || !auth()->user()->isAdmin()) {
            $query->where('is_published', true);
        }

        $faqs = $query->get();

        return response()->json(['data' => $faqs]);
    }

    /**
     * POST /api/admin/faqs — Create a new FAQ.
     */
    public function store(StoreFaqRequest $request): JsonResponse
    {
        $faq = Faq::create($request->validated());

        return response()->json([
            'message' => 'FAQ created.',
            'data' => $faq,
        ], 201);
    }

    /**
     * PUT /api/admin/faqs/{id} — Update a FAQ.
     */
    public function update(StoreFaqRequest $request, int $id): JsonResponse
    {
        $faq = Faq::findOrFail($id);
        $faq->update($request->validated());

        return response()->json([
            'message' => 'FAQ updated.',
            'data' => $faq->fresh(),
        ]);
    }

    /**
     * DELETE /api/admin/faqs/{id} — Delete a FAQ.
     */
    public function destroy(int $id): JsonResponse
    {
        Faq::findOrFail($id)->delete();

        return response()->json(['message' => 'FAQ deleted.']);
    }
}
