<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OjtPosting extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'title',
        'description',
        'location',
        'industry',
        'slots',
        'slots_filled',
        'duration',
        'schedule',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'schedule' => 'array',
        ];
    }

    /* ---- Relationships ---- */

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function skills()
    {
        return $this->hasMany(PostingSkill::class);
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function matchScores()
    {
        return $this->hasMany(MatchScore::class);
    }

    /* ---- Helpers ---- */

    public function hasAvailableSlots(): bool
    {
        return $this->slots_filled < $this->slots;
    }
}
