<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateMatchingRulesRequest;
use App\Models\MatchingRule;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;

class MatchingRuleController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    /**
     * GET /api/admin/matching-rules — View current rules.
     */
    public function index(): JsonResponse
    {
        $rules = MatchingRule::where('is_active', true)->first();

        if (!$rules) {
            // Return defaults
            return response()->json(['data' => [
                'skill_weight' => 50,
                'location_weight' => 25,
                'availability_weight' => 25,
                'minimum_score' => 30,
                'is_active' => true,
            ]]);
        }

        return response()->json(['data' => $rules]);
    }

    /**
     * PUT /api/admin/matching-rules — Update matching rules.
     */
    public function update(UpdateMatchingRulesRequest $request): JsonResponse
    {
        $data = $request->validated();

        $rule = MatchingRule::where('is_active', true)->first();
        $oldValues = $rule?->toArray();

        $rule = MatchingRule::updateOrCreate(
            ['is_active' => true],
            array_merge($data, ['rule_name' => 'default'])
        );

        // Audit log
        $this->auditService->log(
            'updated_matching_rules',
            'matching_rules',
            $rule->id,
            $oldValues,
            $rule->toArray()
        );

        return response()->json([
            'message' => 'Matching rules updated.',
            'data' => $rule,
        ]);
    }
}
