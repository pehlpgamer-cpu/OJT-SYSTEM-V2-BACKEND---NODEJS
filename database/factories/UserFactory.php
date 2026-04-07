<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => 'student',
            'status' => 'active',
            'remember_token' => Str::random(10),
        ];
    }

    public function student(): static
    {
        return $this->state(['role' => 'student', 'status' => 'active']);
    }

    public function company(): static
    {
        return $this->state(['role' => 'company', 'status' => 'pending']);
    }

    public function coordinator(): static
    {
        return $this->state(['role' => 'coordinator', 'status' => 'pending']);
    }

    public function admin(): static
    {
        return $this->state(['role' => 'admin', 'status' => 'active']);
    }
}
