<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMatchingRulesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'skill_weight' => ['required', 'integer', 'min:0', 'max:100'],
            'location_weight' => ['required', 'integer', 'min:0', 'max:100'],
            'availability_weight' => ['required', 'integer', 'min:0', 'max:100'],
            'minimum_score' => ['required', 'integer', 'min:0', 'max:100'],
        ];
    }

    /**
     * Weights must sum to 100.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $total = (int) $this->skill_weight
                + (int) $this->location_weight
                + (int) $this->availability_weight;

            if ($total !== 100) {
                $validator->errors()->add('weights', 'Skill, location, and availability weights must sum to 100.');
            }
        });
    }
}
