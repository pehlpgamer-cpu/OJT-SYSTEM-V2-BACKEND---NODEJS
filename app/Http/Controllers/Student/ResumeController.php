<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ResumeController extends Controller
{
    /**
     * GET /api/students/me/resumes — List all resumes.
     */
    public function index(Request $request): JsonResponse
    {
        $resumes = $request->user()->student->resumes()
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $resumes]);
    }

    /**
     * POST /api/students/me/resumes — Upload a new resume.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'resume' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:5120'], // 5 MB
        ]);

        $student = $request->user()->student;
        $file = $request->file('resume');

        // Store file in local storage
        $path = $file->store('resumes/' . $student->id, 'local');

        $resume = $student->resumes()->create([
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'is_active' => $student->resumes()->count() === 0, // First resume is active
        ]);

        return response()->json([
            'message' => 'Resume uploaded.',
            'data' => $resume,
        ], 201);
    }

    /**
     * GET /api/students/me/resumes/{id} — View a specific resume.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $resume = $request->user()->student->resumes()->findOrFail($id);

        return response()->json(['data' => $resume]);
    }

    /**
     * DELETE /api/students/me/resumes/{id} — Delete a resume.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $resume = $request->user()->student->resumes()->findOrFail($id);

        // Delete file from storage
        Storage::disk('local')->delete($resume->file_path);

        $resume->delete();

        return response()->json(['message' => 'Resume deleted.']);
    }

    /**
     * PUT /api/students/me/resumes/{id}/activate — Set as active resume.
     */
    public function activate(Request $request, int $id): JsonResponse
    {
        $student = $request->user()->student;
        $resume = $student->resumes()->findOrFail($id);

        // Deactivate all, then activate the selected one
        $student->resumes()->update(['is_active' => false]);
        $resume->update(['is_active' => true]);

        return response()->json([
            'message' => 'Resume activated.',
            'data' => $resume->fresh(),
        ]);
    }

    /**
     * GET /api/students/me/resumes/{id}/download — Download resume file.
     */
    public function download(Request $request, int $id)
    {
        $resume = $request->user()->student->resumes()->findOrFail($id);

        if (!Storage::disk('local')->exists($resume->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        return Storage::disk('local')->download($resume->file_path, $resume->file_name);
    }
}
