<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSkillsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'skills' => ['required', 'array', 'min:1'],
            'skills.*.skill_name' => ['required', 'string', 'max:100'],
            'skills.*.proficiency' => ['required', 'string', 'in:beginner,intermediate,advanced'],
        ];
    }
}
