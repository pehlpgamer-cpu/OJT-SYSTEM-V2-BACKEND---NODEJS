<?php

namespace Database\Factories;

use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentFactory extends Factory
{
    protected $model = Student::class;

    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'phone' => fake()->phoneNumber(),
            'address' => fake()->address(),
            'school' => fake()->randomElement([
                'University of the Philippines',
                'Polytechnic University of the Philippines',
                'Technological University of the Philippines',
                'De La Salle University',
                'Ateneo de Manila University',
            ]),
            'course' => fake()->randomElement([
                'BS Computer Science',
                'BS Information Technology',
                'BS Information Systems',
                'BS Computer Engineering',
                'BS Software Engineering',
            ]),
            'year_level' => fake()->randomElement(['3rd Year', '4th Year']),
            'profile_completeness' => fake()->numberBetween(40, 100),
        ];
    }
}
