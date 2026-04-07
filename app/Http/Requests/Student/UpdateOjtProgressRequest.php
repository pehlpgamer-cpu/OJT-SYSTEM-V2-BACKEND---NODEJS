<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOjtProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'hours_rendered' => ['sometimes', 'integer', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
