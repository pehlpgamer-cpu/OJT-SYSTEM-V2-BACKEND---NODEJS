<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'phone',
        'address',
        'school',
        'course',
        'year_level',
        'profile_completeness',
    ];

    /* ---- Relationships ---- */

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function skills()
    {
        return $this->hasMany(StudentSkill::class);
    }

    public function preferences()
    {
        return $this->hasOne(StudentPreference::class);
    }

    public function availability()
    {
        return $this->hasOne(StudentAvailability::class);
    }

    public function resumes()
    {
        return $this->hasMany(Resume::class);
    }

    public function activeResume()
    {
        return $this->hasOne(Resume::class)->where('is_active', true);
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function matchScores()
    {
        return $this->hasMany(MatchScore::class);
    }
}
