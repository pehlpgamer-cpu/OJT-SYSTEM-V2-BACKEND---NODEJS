<?php

namespace Database\Factories;

use App\Models\OjtPosting;
use Illuminate\Database\Eloquent\Factories\Factory;

class OjtPostingFactory extends Factory
{
    protected $model = OjtPosting::class;

    public function definition(): array
    {
        return [
            'title' => fake()->randomElement([
                'Web Developer Intern',
                'Frontend Developer Intern',
                'Backend Developer Intern',
                'Full Stack Developer Intern',
                'QA Tester Intern',
                'Data Analyst Intern',
                'UI/UX Designer Intern',
                'Mobile App Developer Intern',
                'DevOps Intern',
                'IT Support Intern',
            ]),
            'description' => fake()->paragraph(4),
            'location' => fake()->randomElement([
                'Makati City',
                'Quezon City',
                'Taguig City',
                'Pasig City',
                'Manila',
                'Cebu City',
                'Remote',
            ]),
            'industry' => fake()->randomElement([
                'Information Technology',
                'Software Development',
                'Web Development',
            ]),
            'slots' => fake()->numberBetween(1, 5),
            'slots_filled' => 0,
            'duration' => fake()->randomElement(['3 months', '4 months', '6 months', '480 hours', '600 hours']),
            'schedule' => [
                'monday' => true,
                'tuesday' => true,
                'wednesday' => true,
                'thursday' => true,
                'friday' => true,
                'saturday' => false,
                'sunday' => false,
            ],
            'status' => 'active',
        ];
    }
}
