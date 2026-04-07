<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Company;
use App\Models\OjtPosting;
use App\Models\Student;
use App\Models\StudentSkill;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Aggregate report data for different roles.
 * All methods return arrays/collections suitable for JSON responses.
 */
class ReportService
{
    /**
     * Coordinator placement report — students by placement status.
     */
    public function placementReport(): array
    {
        $totalStudents = Student::count();
        $placed = Application::where('status', 'accepted')->distinct('student_id')->count('student_id');
        $pending = Application::where('status', 'pending')->distinct('student_id')->count('student_id');

        return [
            'total_students' => $totalStudents,
            'placed' => $placed,
            'pending_applications' => $pending,
            'unplaced' => $totalStudents - $placed,
            'placement_rate' => $totalStudents > 0
                ? round(($placed / $totalStudents) * 100, 1)
                : 0,
        ];
    }

    /**
     * Skills demand report — most requested skills across active postings.
     */
    public function skillsDemandReport(): array
    {
        $skills = DB::table('posting_skills')
            ->join('ojt_postings', 'posting_skills.ojt_posting_id', '=', 'ojt_postings.id')
            ->where('ojt_postings.status', 'active')
            ->select('posting_skills.skill_name', DB::raw('COUNT(*) as demand_count'))
            ->groupBy('posting_skills.skill_name')
            ->orderByDesc('demand_count')
            ->limit(20)
            ->get();

        return $skills->toArray();
    }

    /**
     * Company placement report — accepted students per company.
     */
    public function companyPlacementReport(int $companyId): array
    {
        $postings = OjtPosting::where('company_id', $companyId)
            ->withCount([
                'applications as total_applicants',
                'applications as accepted_count' => fn ($q) => $q->where('status', 'accepted'),
            ])
            ->get(['id', 'title', 'slots', 'slots_filled']);

        return $postings->toArray();
    }

    /**
     * System-level analytics for admin dashboard.
     */
    public function systemReport(): array
    {
        return [
            'total_users' => User::count(),
            'total_students' => Student::count(),
            'total_companies' => Company::count(),
            'total_postings' => OjtPosting::count(),
            'active_postings' => OjtPosting::where('status', 'active')->count(),
            'total_applications' => Application::count(),
            'accepted_applications' => Application::where('status', 'accepted')->count(),
            'pending_applications' => Application::where('status', 'pending')->count(),
            'users_by_role' => User::select('role', DB::raw('COUNT(*) as count'))
                ->groupBy('role')
                ->pluck('count', 'role'),
        ];
    }

    /**
     * Company historical data.
     */
    public function companyHistoryReport(int $companyId): array
    {
        return Application::join('ojt_postings', 'applications.ojt_posting_id', '=', 'ojt_postings.id')
            ->where('ojt_postings.company_id', $companyId)
            ->where('applications.status', 'accepted')
            ->join('students', 'applications.student_id', '=', 'students.id')
            ->select(
                'students.first_name',
                'students.last_name',
                'ojt_postings.title as posting_title',
                'applications.status',
                'applications.created_at'
            )
            ->orderByDesc('applications.created_at')
            ->get()
            ->toArray();
    }
}
