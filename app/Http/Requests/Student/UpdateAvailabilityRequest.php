<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'start_date' => ['nullable', 'date', 'after_or_equal:today'],
            'duration' => ['nullable', 'string', 'max:100'],
            'weekly_schedule' => ['nullable', 'array'],
            'weekly_schedule.monday' => ['nullable', 'boolean'],
            'weekly_schedule.tuesday' => ['nullable', 'boolean'],
            'weekly_schedule.wednesday' => ['nullable', 'boolean'],
            'weekly_schedule.thursday' => ['nullable', 'boolean'],
            'weekly_schedule.friday' => ['nullable', 'boolean'],
            'weekly_schedule.saturday' => ['nullable', 'boolean'],
            'weekly_schedule.sunday' => ['nullable', 'boolean'],
        ];
    }
}
