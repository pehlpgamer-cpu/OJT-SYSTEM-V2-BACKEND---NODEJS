<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Company;
use App\Models\Student;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoordinatorController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
    ) {}

    /**
     * GET /api/coordinators/me/students — View all students, optionally filter by status.
     */
    public function students(Request $request): JsonResponse
    {
        $query = Student::with('user');

        // Filter by placement status
        if ($request->filled('status')) {
            $status = $request->status;

            if ($status === 'placed') {
                $placedIds = Application::where('status', 'accepted')
                    ->pluck('student_id');
                $query->whereIn('id', $placedIds);
            }

            if ($status === 'unplaced') {
                $placedIds = Application::where('status', 'accepted')
                    ->pluck('student_id');
                $query->whereNotIn('id', $placedIds);
            }
        }

        $students = $query->paginate(15);

        return response()->json($students);
    }

    /**
     * GET /api/coordinators/me/placements — Placement summary.
     */
    public function placements(): JsonResponse
    {
        $placements = Application::where('status', 'accepted')
            ->with(['student.user', 'ojtPosting.company', 'ojtProgress'])
            ->orderByDesc('updated_at')
            ->paginate(15);

        return response()->json($placements);
    }

    /**
     * GET /api/coordinators/me/companies/pending — Pending company registrations.
     */
    public function pendingCompanies(): JsonResponse
    {
        $companies = Company::where('accreditation_status', 'pending')
            ->with('user')
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json($companies);
    }

    /**
     * PATCH /api/companies/{id}/approve — Approve a company.
     */
    public function approveCompany(int $id): JsonResponse
    {
        $company = Company::findOrFail($id);

        if ($company->accreditation_status !== 'pending') {
            return response()->json(['message' => 'Company is not pending approval.'], 422);
        }

        $company->update(['accreditation_status' => 'approved']);
        $company->user->update(['status' => 'active']);

        $this->notificationService->send(
            $company->user_id,
            'Registration Approved',
            'Your company registration has been approved. You can now create OJT postings.',
            'success'
        );

        return response()->json([
            'message' => 'Company approved.',
            'data' => $company->fresh(),
        ]);
    }

    /**
     * PATCH /api/companies/{id}/reject — Reject a company.
     */
    public function rejectCompany(int $id): JsonResponse
    {
        $company = Company::findOrFail($id);

        if ($company->accreditation_status !== 'pending') {
            return response()->json(['message' => 'Company is not pending approval.'], 422);
        }

        $company->update(['accreditation_status' => 'rejected']);

        $this->notificationService->send(
            $company->user_id,
            'Registration Rejected',
            'Your company registration has been rejected. Please contact support for details.',
            'error'
        );

        return response()->json([
            'message' => 'Company rejected.',
            'data' => $company->fresh(),
        ]);
    }
}
