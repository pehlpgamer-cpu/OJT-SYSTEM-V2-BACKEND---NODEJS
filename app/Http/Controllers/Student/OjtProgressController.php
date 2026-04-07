<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\UpdateOjtProgressRequest;
use App\Models\Application;
use App\Models\OjtProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OjtProgressController extends Controller
{
    /**
     * GET /api/students/me/ojt-progress — View current OJT progress.
     */
    public function show(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        // Find accepted application with progress
        $application = Application::where('student_id', $student->id)
            ->where('status', 'accepted')
            ->with(['ojtProgress', 'ojtPosting.company'])
            ->first();

        if (!$application) {
            return response()->json(['message' => 'No active OJT placement found.'], 404);
        }

        return response()->json(['data' => $application]);
    }

    /**
     * PUT /api/students/me/ojt-progress — Update hours/remarks.
     */
    public function update(UpdateOjtProgressRequest $request): JsonResponse
    {
        $student = $request->user()->student;

        $application = Application::where('student_id', $student->id)
            ->where('status', 'accepted')
            ->firstOrFail();

        $progress = OjtProgress::updateOrCreate(
            ['application_id' => $application->id],
            $request->validated()
        );

        return response()->json([
            'message' => 'OJT progress updated.',
            'data' => $progress,
        ]);
    }
}
