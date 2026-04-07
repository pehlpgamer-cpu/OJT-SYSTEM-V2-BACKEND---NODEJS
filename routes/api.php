<?php

use App\Http\Controllers\Admin\AdminReportController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\FaqController;
use App\Http\Controllers\Admin\GuidelineController;
use App\Http\Controllers\Admin\MatchingRuleController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Company\CompanyPostingController;
use App\Http\Controllers\Company\CompanyProfileController;
use App\Http\Controllers\Company\CompanyReportController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\Coordinator\CoordinatorController;
use App\Http\Controllers\Coordinator\CoordinatorReportController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OjtPostingController;
use App\Http\Controllers\PublicCompanyController;
use App\Http\Controllers\Student\OjtProgressController;
use App\Http\Controllers\Student\RecommendationController;
use App\Http\Controllers\Student\ResumeController;
use App\Http\Controllers\Student\StudentProfileController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes (no auth required)
|--------------------------------------------------------------------------
*/

// Auth
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1'); // 5 attempts per minute (OWASP brute-force protection)
    Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:3,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Public content
Route::get('/partner-companies', [PublicCompanyController::class, 'index']);
Route::get('/faqs', [FaqController::class, 'index']);
Route::get('/guidelines', [GuidelineController::class, 'index']);
Route::post('/contact', [ContactController::class, 'store'])
    ->middleware('throttle:5,1');

/*
|--------------------------------------------------------------------------
| Authenticated Routes (Sanctum Bearer token)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    // Logout
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Authenticated user info
    Route::get('/user', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        $user->load(['student', 'company', 'coordinator']);
        return response()->json(['data' => $user]);
    });

    // Browse OJT postings (any authenticated user)
    Route::get('/ojt-postings', [OjtPostingController::class, 'index']);
    Route::get('/ojt-postings/{id}', [OjtPostingController::class, 'show']);

    // Notifications (all roles)
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::patch('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::patch('/read-all', [NotificationController::class, 'markAllAsRead']);
    });

    // Messages (students & companies)
    Route::middleware('role:student,company')->prefix('messages')->group(function () {
        Route::get('/', [MessageController::class, 'index']);
        Route::get('/{userId}', [MessageController::class, 'conversation']);
        Route::post('/', [MessageController::class, 'store']);
    });

    // Application detail (multi-role access controlled inside controller)
    Route::get('/applications/{id}', [ApplicationController::class, 'show']);
    Route::get('/applications/{id}/status', [ApplicationController::class, 'status']);

    /*
    |----------------------------------------------------------------------
    | Student Routes
    |----------------------------------------------------------------------
    */
    Route::middleware('role:student')->group(function () {
        // Profile
        Route::get('/students/me', [StudentProfileController::class, 'show']);
        Route::put('/students/me', [StudentProfileController::class, 'update']);
        Route::put('/students/me/skills', [StudentProfileController::class, 'updateSkills']);
        Route::put('/students/me/preferences', [StudentProfileController::class, 'updatePreferences']);
        Route::put('/students/me/availability', [StudentProfileController::class, 'updateAvailability']);

        // Resumes
        Route::get('/students/me/resumes', [ResumeController::class, 'index']);
        Route::post('/students/me/resumes', [ResumeController::class, 'store']);
        Route::get('/students/me/resumes/{id}', [ResumeController::class, 'show']);
        Route::delete('/students/me/resumes/{id}', [ResumeController::class, 'destroy']);
        Route::put('/students/me/resumes/{id}/activate', [ResumeController::class, 'activate']);
        Route::get('/students/me/resumes/{id}/download', [ResumeController::class, 'download']);

        // Recommendations
        Route::get('/students/me/recommendations', [RecommendationController::class, 'index']);

        // Applications
        Route::post('/applications', [ApplicationController::class, 'store']);
        Route::get('/students/me/applications', [ApplicationController::class, 'studentApplications']);
        Route::delete('/applications/{id}', [ApplicationController::class, 'destroy']);

        // Placements & Progress
        Route::get('/students/me/placements', [ApplicationController::class, 'studentPlacements']);
        Route::get('/students/me/ojt-progress', [OjtProgressController::class, 'show']);
        Route::put('/students/me/ojt-progress', [OjtProgressController::class, 'update']);
    });

    /*
    |----------------------------------------------------------------------
    | Company Routes
    |----------------------------------------------------------------------
    */
    Route::middleware('role:company')->group(function () {
        // Profile
        Route::get('/companies/me', [CompanyProfileController::class, 'show']);
        Route::put('/companies/me', [CompanyProfileController::class, 'update']);

        // OJT Postings
        Route::get('/companies/me/ojt-postings', [CompanyPostingController::class, 'index']);
        Route::post('/companies/me/ojt-postings', [CompanyPostingController::class, 'store']);
        Route::put('/ojt-postings/{id}', [CompanyPostingController::class, 'update']);
        Route::patch('/ojt-postings/{id}/status', [CompanyPostingController::class, 'updateStatus']);
        Route::delete('/ojt-postings/{id}', [CompanyPostingController::class, 'destroy']);

        // Applicants
        Route::get('/ojt-postings/{id}/applications', [ApplicationController::class, 'postingApplications']);
        Route::get('/applications/{id}/student', [ApplicationController::class, 'applicantProfile']);
        Route::patch('/applications/{id}/accept', [ApplicationController::class, 'accept']);
        Route::patch('/applications/{id}/reject', [ApplicationController::class, 'reject']);

        // Reports
        Route::get('/companies/me/reports/placements', [CompanyReportController::class, 'placements']);
        Route::get('/companies/me/reports/history', [CompanyReportController::class, 'history']);
    });

    /*
    |----------------------------------------------------------------------
    | Coordinator Routes
    |----------------------------------------------------------------------
    */
    Route::middleware('role:coordinator')->group(function () {
        Route::get('/coordinators/me/students', [CoordinatorController::class, 'students']);
        Route::get('/coordinators/me/placements', [CoordinatorController::class, 'placements']);
        Route::get('/coordinators/me/companies/pending', [CoordinatorController::class, 'pendingCompanies']);
        Route::patch('/companies/{id}/approve', [CoordinatorController::class, 'approveCompany']);
        Route::patch('/companies/{id}/reject', [CoordinatorController::class, 'rejectCompany']);

        // Reports
        Route::get('/coordinators/me/reports/placements', [CoordinatorReportController::class, 'placements']);
        Route::get('/coordinators/me/reports/skills-demand', [CoordinatorReportController::class, 'skillsDemand']);
    });

    /*
    |----------------------------------------------------------------------
    | Admin Routes
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        // Users
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::patch('/users/{id}/activate', [AdminUserController::class, 'activate']);
        Route::patch('/users/{id}/suspend', [AdminUserController::class, 'suspend']);

        // Matching rules
        Route::get('/matching-rules', [MatchingRuleController::class, 'index']);
        Route::put('/matching-rules', [MatchingRuleController::class, 'update']);

        // Reports & Logs
        Route::get('/reports/system', [AdminReportController::class, 'system']);
        Route::get('/logs', [AuditLogController::class, 'index']);

        // Content management (FAQs & Guidelines)
        Route::post('/faqs', [FaqController::class, 'store']);
        Route::put('/faqs/{id}', [FaqController::class, 'update']);
        Route::delete('/faqs/{id}', [FaqController::class, 'destroy']);

        Route::post('/guidelines', [GuidelineController::class, 'store']);
        Route::put('/guidelines/{id}', [GuidelineController::class, 'update']);
        Route::delete('/guidelines/{id}', [GuidelineController::class, 'destroy']);
    });
});
