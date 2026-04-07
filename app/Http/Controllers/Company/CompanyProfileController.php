<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\UpdateCompanyProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyProfileController extends Controller
{
    /**
     * GET /api/companies/me — Get company profile.
     */
    public function show(Request $request): JsonResponse
    {
        $company = $request->user()->company;

        return response()->json(['data' => $company]);
    }

    /**
     * PUT /api/companies/me — Update company profile.
     */
    public function update(UpdateCompanyProfileRequest $request): JsonResponse
    {
        $company = $request->user()->company;
        $company->update($request->validated());

        return response()->json([
            'message' => 'Company profile updated.',
            'data' => $company->fresh(),
        ]);
    }
}
