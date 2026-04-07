<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('skill_name');
            // Proficiency: beginner, intermediate, advanced
            $table->enum('proficiency', ['beginner', 'intermediate', 'advanced'])->default('beginner');
            $table->timestamps();

            $table->unique(['student_id', 'skill_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_skills');
    }
};
