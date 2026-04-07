<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'ojt_posting_id',
        'resume_id',
        'status',
        'cover_letter',
    ];

    /* ---- Relationships ---- */

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function ojtPosting()
    {
        return $this->belongsTo(OjtPosting::class);
    }

    public function resume()
    {
        return $this->belongsTo(Resume::class);
    }

    public function ojtProgress()
    {
        return $this->hasOne(OjtProgress::class);
    }
}
