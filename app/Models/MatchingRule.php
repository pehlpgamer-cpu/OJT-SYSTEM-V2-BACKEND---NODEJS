<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MatchingRule extends Model
{
    protected $fillable = [
        'rule_name',
        'skill_weight',
        'location_weight',
        'availability_weight',
        'minimum_score',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
