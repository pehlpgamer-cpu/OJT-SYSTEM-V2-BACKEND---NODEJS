<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompanyFactory extends Factory
{
    protected $model = Company::class;

    public function definition(): array
    {
        return [
            'company_name' => fake()->company(),
            'industry' => fake()->randomElement([
                'Information Technology',
                'Software Development',
                'Web Development',
                'Data Science',
                'Cybersecurity',
                'Digital Marketing',
                'Game Development',
            ]),
            'address' => fake()->address(),
            'description' => fake()->paragraph(3),
            'contact_person' => fake()->name(),
            'contact_phone' => fake()->phoneNumber(),
            'accreditation_status' => 'approved',
        ];
    }
}
