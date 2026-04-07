<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matching_rules', function (Blueprint $table) {
            $table->id();
            $table->string('rule_name')->unique();
            // Weights for each scoring component (must sum to 100)
            $table->unsignedTinyInteger('skill_weight')->default(50);
            $table->unsignedTinyInteger('location_weight')->default(25);
            $table->unsignedTinyInteger('availability_weight')->default(25);
            // Minimum score threshold for recommendations
            $table->unsignedTinyInteger('minimum_score')->default(30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matching_rules');
    }
};
