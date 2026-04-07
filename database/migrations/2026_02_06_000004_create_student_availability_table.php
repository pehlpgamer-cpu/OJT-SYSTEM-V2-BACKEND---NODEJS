<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_availability', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->date('start_date')->nullable();
            $table->string('duration')->nullable(); // e.g. "3 months", "480 hours"
            $table->json('weekly_schedule')->nullable(); // e.g. {"monday":true,"tuesday":true,...}
            $table->timestamps();

            $table->unique('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_availability');
    }
};
