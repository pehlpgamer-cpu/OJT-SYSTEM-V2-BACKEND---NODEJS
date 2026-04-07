<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'preferred_industry',
        'preferred_role',
        'preferred_location',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
