<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', 'in:student,company,coordinator'],

            // Student-specific fields
            'first_name' => ['required_if:role,student', 'nullable', 'string', 'max:255'],
            'last_name' => ['required_if:role,student', 'nullable', 'string', 'max:255'],

            // Company-specific fields
            'company_name' => ['required_if:role,company', 'nullable', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],

            // Coordinator-specific fields
            'department' => ['nullable', 'string', 'max:255'],
            'school_affiliation' => ['nullable', 'string', 'max:255'],
        ];
    }
}
