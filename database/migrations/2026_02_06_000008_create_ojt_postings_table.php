<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ojt_postings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->string('industry')->nullable();
            $table->unsignedInteger('slots')->default(1);
            $table->unsignedInteger('slots_filled')->default(0);
            $table->string('duration')->nullable(); // e.g. "3 months"
            $table->json('schedule')->nullable(); // weekly schedule
            $table->enum('status', ['active', 'inactive', 'closed'])->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ojt_postings');
    }
};
