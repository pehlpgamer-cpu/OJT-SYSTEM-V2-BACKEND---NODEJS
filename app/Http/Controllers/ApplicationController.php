<?php

namespace App\Http\Controllers;

use App\Http\Requests\Application\StoreApplicationRequest;
use App\Models\Application;
use App\Models\OjtPosting;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
    ) {}

    /**
     * POST /api/applications — Apply for an OJT position (student).
     */
    public function store(StoreApplicationRequest $request): JsonResponse
    {
        $student = $request->user()->student;
        $data = $request->validated();

        $posting = OjtPosting::findOrFail($data['ojt_posting_id']);

        // Check posting is active and has slots
        if ($posting->status !== 'active' || !$posting->hasAvailableSlots()) {
            return response()->json(['message' => 'This posting is no longer accepting applications.'], 422);
        }

        // Check for duplicate application
        $exists = Application::where('student_id', $student->id)
            ->where('ojt_posting_id', $posting->id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'You have already applied to this posting.'], 422);
        }

        // Use active resume if none specified
        $resumeId = $data['resume_id'] ?? $student->activeResume?->id;

        $application = Application::create([
            'student_id' => $student->id,
            'ojt_posting_id' => $posting->id,
            'resume_id' => $resumeId,
            'status' => 'pending',
            'cover_letter' => $data['cover_letter'] ?? null,
        ]);

        // Notify the company
        $this->notificationService->send(
            $posting->company->user_id,
            'New Application',
            "A student has applied to your posting: {$posting->title}",
            'info',
            "/applications/{$application->id}"
        );

        return response()->json([
            'message' => 'Application submitted.',
            'data' => $application->load('ojtPosting'),
        ], 201);
    }

    /**
     * GET /api/students/me/applications — List student's own applications.
     */
    public function studentApplications(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        $applications = Application::where('student_id', $student->id)
            ->with(['ojtPosting.company', 'resume'])
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json($applications);
    }

    /**
     * GET /api/applications/{id} — View a single application.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $application = Application::with(['student.user', 'ojtPosting.company', 'resume', 'ojtProgress'])
            ->findOrFail($id);

        // Authorization: student owns it, or company owns the posting
        $authorized = false;

        if ($user->isStudent() && $application->student->user_id === $user->id) {
            $authorized = true;
        }

        if ($user->isCompany()) {
            $companyId = $user->company->id;
            if ($application->ojtPosting->company_id === $companyId) {
                $authorized = true;
            }
        }

        if ($user->isCoordinator() || $user->isAdmin()) {
            $authorized = true;
        }

        if (!$authorized) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(['data' => $application]);
    }

    /**
     * DELETE /api/applications/{id} — Withdraw application (student only, pending only).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $student = $request->user()->student;

        $application = Application::where('student_id', $student->id)
            ->where('id', $id)
            ->firstOrFail();

        if ($application->status !== 'pending') {
            return response()->json(['message' => 'Only pending applications can be withdrawn.'], 422);
        }

        $application->update(['status' => 'withdrawn']);

        return response()->json(['message' => 'Application withdrawn.']);
    }

    /**
     * GET /api/applications/{id}/status — Track application status.
     */
    public function status(Request $request, int $id): JsonResponse
    {
        $application = Application::with('ojtProgress')->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $application->id,
                'status' => $application->status,
                'created_at' => $application->created_at,
                'updated_at' => $application->updated_at,
                'ojt_progress' => $application->ojtProgress,
            ],
        ]);
    }

    /**
     * GET /api/ojt-postings/{id}/applications — View applicants for a posting (company).
     */
    public function postingApplications(Request $request, int $postingId): JsonResponse
    {
        $company = $request->user()->company;

        // Ensure the posting belongs to this company
        $posting = $company->ojtPostings()->findOrFail($postingId);

        $applications = Application::where('ojt_posting_id', $posting->id)
            ->with(['student.user', 'student.skills', 'resume'])
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json($applications);
    }

    /**
     * GET /api/applications/{id}/student — View applicant's student profile (company).
     */
    public function applicantProfile(Request $request, int $id): JsonResponse
    {
        $application = Application::with([
            'student' => fn ($q) => $q->with(['user', 'skills', 'preferences', 'availability', 'activeResume']),
        ])->findOrFail($id);

        // Verify company owns the posting
        $company = $request->user()->company;
        if ($application->ojtPosting->company_id !== $company->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(['data' => $application->student]);
    }

    /**
     * PATCH /api/applications/{id}/accept — Accept an applicant (company).
     */
    public function accept(Request $request, int $id): JsonResponse
    {
        return $this->updateApplicationStatus($request, $id, 'accepted');
    }

    /**
     * PATCH /api/applications/{id}/reject — Reject an applicant (company).
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        return $this->updateApplicationStatus($request, $id, 'rejected');
    }

    /**
     * Shared logic for accept/reject.
     */
    private function updateApplicationStatus(Request $request, int $id, string $newStatus): JsonResponse
    {
        $company = $request->user()->company;
        $application = Application::with('ojtPosting')->findOrFail($id);

        // Verify the company owns the posting
        if ($application->ojtPosting->company_id !== $company->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($application->status !== 'pending') {
            return response()->json(['message' => 'Only pending applications can be ' . $newStatus . '.'], 422);
        }

        // For acceptance, check available slots
        if ($newStatus === 'accepted') {
            $posting = $application->ojtPosting;
            if (!$posting->hasAvailableSlots()) {
                return response()->json(['message' => 'No available slots for this posting.'], 422);
            }

            // Increment filled slots
            $posting->increment('slots_filled');

            // Create OJT progress record
            $application->ojtProgress()->create([
                'status' => 'not_started',
            ]);
        }

        $application->update(['status' => $newStatus]);

        // Notify the student
        $studentUserId = $application->student->user_id;
        $title = $newStatus === 'accepted' ? 'Application Accepted!' : 'Application Update';
        $message = $newStatus === 'accepted'
            ? "Congratulations! Your application for {$application->ojtPosting->title} has been accepted."
            : "Your application for {$application->ojtPosting->title} has been rejected.";

        $this->notificationService->send(
            $studentUserId,
            $title,
            $message,
            $newStatus === 'accepted' ? 'success' : 'warning',
        );

        return response()->json([
            'message' => "Application {$newStatus}.",
            'data' => $application->fresh(),
        ]);
    }

    /**
     * GET /api/students/me/placements — View accepted placement.
     */
    public function studentPlacements(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        $placements = Application::where('student_id', $student->id)
            ->where('status', 'accepted')
            ->with(['ojtPosting.company', 'ojtProgress'])
            ->get();

        return response()->json(['data' => $placements]);
    }
}
