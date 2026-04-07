<?php

namespace App\Services;

use App\Models\MatchingRule;
use App\Models\MatchScore;
use App\Models\OjtPosting;
use App\Models\Student;

/**
 * Weighted scoring algorithm for matching students to OJT postings.
 *
 * Components:
 * - Skill score: % of posting skills the student has
 * - Location score: exact or partial match on location
 * - Availability score: schedule overlap
 *
 * Each component is weighted by admin-configurable matching rules.
 */
class MatchingService
{
    /**
     * Calculate and store match scores for a student against all active postings.
     */
    public function calculateForStudent(Student $student): void
    {
        $rules = $this->getActiveRules();
        $postings = OjtPosting::where('status', 'active')
            ->with('skills')
            ->get();

        $studentSkills = $student->skills->pluck('skill_name')
            ->map(fn ($s) => strtolower(trim($s)))
            ->toArray();

        $preferences = $student->preferences;
        $availability = $student->availability;

        foreach ($postings as $posting) {
            $skillScore = $this->computeSkillScore($studentSkills, $posting);
            $locationScore = $this->computeLocationScore($preferences, $posting);
            $availabilityScore = $this->computeAvailabilityScore($availability, $posting);

            // Weighted total
            $total = (int) round(
                ($skillScore * $rules['skill_weight']
                + $locationScore * $rules['location_weight']
                + $availabilityScore * $rules['availability_weight']) / 100
            );

            MatchScore::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'ojt_posting_id' => $posting->id,
                ],
                [
                    'skill_score' => $skillScore,
                    'location_score' => $locationScore,
                    'availability_score' => $availabilityScore,
                    'total_score' => $total,
                ]
            );
        }
    }

    /**
     * Skill score: percentage of required posting skills the student possesses.
     */
    private function computeSkillScore(array $studentSkills, OjtPosting $posting): int
    {
        $requiredSkills = $posting->skills
            ->where('is_required', true)
            ->pluck('skill_name')
            ->map(fn ($s) => strtolower(trim($s)))
            ->toArray();

        if (empty($requiredSkills)) {
            return 100; // No requirements = full match
        }

        $matched = count(array_intersect($studentSkills, $requiredSkills));

        return (int) round(($matched / count($requiredSkills)) * 100);
    }

    /**
     * Location score: 100 if exact match, 50 if partial, 0 if no match.
     */
    private function computeLocationScore($preferences, OjtPosting $posting): int
    {
        if (!$preferences || !$preferences->preferred_location || !$posting->location) {
            return 50; // Neutral when no preference or posting location set
        }

        $preferred = strtolower(trim($preferences->preferred_location));
        $postingLocation = strtolower(trim($posting->location));

        if ($preferred === $postingLocation) {
            return 100;
        }

        // Partial match — one contains the other
        if (str_contains($postingLocation, $preferred) || str_contains($preferred, $postingLocation)) {
            return 50;
        }

        return 0;
    }

    /**
     * Availability score: based on schedule overlap.
     */
    private function computeAvailabilityScore($availability, OjtPosting $posting): int
    {
        if (!$availability || !$availability->weekly_schedule || !$posting->schedule) {
            return 50; // Neutral when schedules are not specified
        }

        $studentDays = array_keys(array_filter($availability->weekly_schedule));
        $postingDays = array_keys(array_filter($posting->schedule));

        if (empty($postingDays)) {
            return 100;
        }

        $overlap = count(array_intersect($studentDays, $postingDays));

        return (int) round(($overlap / count($postingDays)) * 100);
    }

    /**
     * Get active matching rules or fallback defaults.
     */
    private function getActiveRules(): array
    {
        $rule = MatchingRule::where('is_active', true)->first();

        if (!$rule) {
            return [
                'skill_weight' => 50,
                'location_weight' => 25,
                'availability_weight' => 25,
                'minimum_score' => 30,
            ];
        }

        return $rule->toArray();
    }

    /**
     * Get minimum score threshold for recommendations.
     */
    public function getMinimumScore(): int
    {
        $rules = $this->getActiveRules();
        return $rules['minimum_score'];
    }
}
