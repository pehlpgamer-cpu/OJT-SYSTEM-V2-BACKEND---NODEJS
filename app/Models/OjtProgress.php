<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OjtProgress extends Model
{
    protected $table = 'ojt_progress';

    protected $fillable = [
        'application_id',
        'start_date',
        'end_date',
        'total_hours_required',
        'hours_rendered',
        'remarks',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function application()
    {
        return $this->belongsTo(Application::class);
    }
}
