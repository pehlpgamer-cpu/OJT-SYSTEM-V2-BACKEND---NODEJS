<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentAvailability extends Model
{
    use HasFactory;

    protected $table = 'student_availability';

    protected $fillable = [
        'student_id',
        'start_date',
        'duration',
        'weekly_schedule',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'weekly_schedule' => 'array',
        ];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
