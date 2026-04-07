<?php

namespace Database\Factories;

use App\Models\Coordinator;
use Illuminate\Database\Eloquent\Factories\Factory;

class CoordinatorFactory extends Factory
{
    protected $model = Coordinator::class;

    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'department' => fake()->randomElement([
                'College of Computer Studies',
                'College of Engineering',
                'College of Information Technology',
                'School of Computing',
            ]),
            'school_affiliation' => fake()->randomElement([
                'Polytechnic University of the Philippines',
                'University of the Philippines',
                'Technological University of the Philippines',
            ]),
        ];
    }
}
