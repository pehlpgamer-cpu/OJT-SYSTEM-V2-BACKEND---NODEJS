<?php

namespace Database\Factories;

use App\Models\Resume;
use Illuminate\Database\Eloquent\Factories\Factory;

class ResumeFactory extends Factory
{
    protected $model = Resume::class;

    public function definition(): array
    {
        return [
            'file_name' => 'resume_' . fake()->uuid() . '.pdf',
            'file_path' => 'resumes/' . fake()->uuid() . '.pdf',
            'file_size' => fake()->numberBetween(50000, 2000000),
            'mime_type' => 'application/pdf',
            'is_active' => true,
        ];
    }
}
