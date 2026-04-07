<?php

namespace Database\Factories;

use App\Models\OjtGuideline;
use Illuminate\Database\Eloquent\Factories\Factory;

class OjtGuidelineFactory extends Factory
{
    protected $model = OjtGuideline::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'content' => fake()->paragraphs(3, true),
            'category' => fake()->randomElement(['General', 'Requirements', 'Conduct', 'Grading', 'Submissions']),
            'sort_order' => fake()->numberBetween(1, 50),
            'is_published' => true,
        ];
    }
}
