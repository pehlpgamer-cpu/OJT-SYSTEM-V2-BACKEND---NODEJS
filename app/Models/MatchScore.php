<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MatchScore extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'ojt_posting_id',
        'skill_score',
        'location_score',
        'availability_score',
        'total_score',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function ojtPosting()
    {
        return $this->belongsTo(OjtPosting::class);
    }
}
