<?php

namespace Database\Factories;

use App\Models\Faq;
use Illuminate\Database\Eloquent\Factories\Factory;

class FaqFactory extends Factory
{
    protected $model = Faq::class;

    public function definition(): array
    {
        return [
            'question' => fake()->sentence() . '?',
            'answer' => fake()->paragraph(2),
            'category' => fake()->randomElement(['General', 'Student', 'Company', 'OJT Process', 'Technical']),
            'sort_order' => fake()->numberBetween(1, 50),
            'is_published' => true,
        ];
    }
}
