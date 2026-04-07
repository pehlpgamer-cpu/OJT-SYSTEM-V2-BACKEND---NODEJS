<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;

class CoordinatorReportController extends Controller
{
    public function __construct(
        private ReportService $reportService,
    ) {}

    /**
     * GET /api/coordinators/me/reports/placements — Placement analytics.
     */
    public function placements(): JsonResponse
    {
        return response()->json([
            'data' => $this->reportService->placementReport(),
        ]);
    }

    /**
     * GET /api/coordinators/me/reports/skills-demand — Skills demand report.
     */
    public function skillsDemand(): JsonResponse
    {
        return response()->json([
            'data' => $this->reportService->skillsDemandReport(),
        ]);
    }
}
