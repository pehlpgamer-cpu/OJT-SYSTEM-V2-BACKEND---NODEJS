<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PostingSkill extends Model
{
    use HasFactory;

    protected $fillable = [
        'ojt_posting_id',
        'skill_name',
        'is_required',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
        ];
    }

    public function ojtPosting()
    {
        return $this->belongsTo(OjtPosting::class);
    }
}
