<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;

class AdminReportController extends Controller
{
    public function __construct(
        private ReportService $reportService,
    ) {}

    /**
     * GET /api/admin/reports/system — System-wide analytics.
     */
    public function system(): JsonResponse
    {
        return response()->json([
            'data' => $this->reportService->systemReport(),
        ]);
    }
}
