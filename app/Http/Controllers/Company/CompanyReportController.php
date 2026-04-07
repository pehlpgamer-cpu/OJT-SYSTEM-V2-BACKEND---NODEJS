<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyReportController extends Controller
{
    public function __construct(
        private ReportService $reportService,
    ) {}

    /**
     * GET /api/companies/me/reports/placements — Placement report.
     */
    public function placements(Request $request): JsonResponse
    {
        $companyId = $request->user()->company->id;

        return response()->json([
            'data' => $this->reportService->companyPlacementReport($companyId),
        ]);
    }

    /**
     * GET /api/companies/me/reports/history — Historical data.
     */
    public function history(Request $request): JsonResponse
    {
        $companyId = $request->user()->company->id;

        return response()->json([
            'data' => $this->reportService->companyHistoryReport($companyId),
        ]);
    }
}
