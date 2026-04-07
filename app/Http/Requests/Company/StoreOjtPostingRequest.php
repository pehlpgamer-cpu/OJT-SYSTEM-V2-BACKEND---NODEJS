<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class StoreOjtPostingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'location' => ['nullable', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'slots' => ['required', 'integer', 'min:1'],
            'duration' => ['nullable', 'string', 'max:100'],
            'schedule' => ['nullable', 'array'],
            'skills' => ['nullable', 'array'],
            'skills.*.skill_name' => ['required_with:skills', 'string', 'max:100'],
            'skills.*.is_required' => ['nullable', 'boolean'],
        ];
    }
}
