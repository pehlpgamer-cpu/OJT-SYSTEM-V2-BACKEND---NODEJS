<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OjtGuideline extends Model
{
    protected $fillable = [
        'title',
        'content',
        'sort_order',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }
}
