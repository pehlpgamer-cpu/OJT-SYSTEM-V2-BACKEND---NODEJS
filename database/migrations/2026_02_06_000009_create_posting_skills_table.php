<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posting_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ojt_posting_id')->constrained()->cascadeOnDelete();
            $table->string('skill_name');
            $table->boolean('is_required')->default(true);
            $table->timestamps();

            $table->unique(['ojt_posting_id', 'skill_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posting_skills');
    }
};
