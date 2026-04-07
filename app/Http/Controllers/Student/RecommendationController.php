<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\MatchScore;
use App\Services\MatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function __construct(
        private MatchingService $matchingService,
    ) {}

    /**
     * GET /api/students/me/recommendations — Get ranked job recommendations.
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        // Recalculate scores on request (ensures freshness)
        $this->matchingService->calculateForStudent($student);

        $minScore = $this->matchingService->getMinimumScore();

        // Fetch recommendations above threshold, paginated
        $recommendations = MatchScore::where('student_id', $student->id)
            ->where('total_score', '>=', $minScore)
            ->with(['ojtPosting' => fn ($q) => $q->with(['company', 'skills'])])
            ->orderByDesc('total_score')
            ->paginate(15);

        return response()->json($recommendations);
    }
}
