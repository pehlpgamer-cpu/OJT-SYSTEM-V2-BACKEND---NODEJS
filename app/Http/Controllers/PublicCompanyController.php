<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicCompanyController extends Controller
{
    /**
     * GET /api/partner-companies — Public list of approved companies.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Company::where('accreditation_status', 'approved');

        if ($request->filled('industry')) {
            $query->where('industry', 'like', '%' . $request->industry . '%');
        }

        if ($request->filled('location')) {
            $query->where('address', 'like', '%' . $request->location . '%');
        }

        $companies = $query->select([
            'id', 'company_name', 'industry', 'address', 'description', 'accreditation_status',
        ])->paginate(15);

        return response()->json($companies);
    }
}
