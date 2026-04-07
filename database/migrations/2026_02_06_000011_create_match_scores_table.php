<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ojt_posting_id')->constrained()->cascadeOnDelete();
            // Individual score components (0-100)
            $table->unsignedTinyInteger('skill_score')->default(0);
            $table->unsignedTinyInteger('location_score')->default(0);
            $table->unsignedTinyInteger('availability_score')->default(0);
            // Weighted total score (0-100)
            $table->unsignedTinyInteger('total_score')->default(0);
            $table->timestamps();

            $table->unique(['student_id', 'ojt_posting_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_scores');
    }
};
