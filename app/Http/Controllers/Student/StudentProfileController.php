<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\UpdateAvailabilityRequest;
use App\Http\Requests\Student\UpdatePreferencesRequest;
use App\Http\Requests\Student\UpdateProfileRequest;
use App\Http\Requests\Student\UpdateSkillsRequest;
use App\Models\Student;
use App\Models\StudentAvailability;
use App\Models\StudentPreference;
use App\Models\StudentSkill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentProfileController extends Controller
{
    /**
     * GET /api/students/me — Get logged-in student's full profile.
     */
    public function show(Request $request): JsonResponse
    {
        $student = $request->user()->student()
            ->with(['skills', 'preferences', 'availability'])
            ->firstOrFail();

        return response()->json(['data' => $student]);
    }

    /**
     * PUT /api/students/me — Update student profile.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $student = $request->user()->student;
        $student->update($request->validated());

        // Recalculate profile completeness
        $this->updateCompleteness($student);

        return response()->json([
            'message' => 'Profile updated.',
            'data' => $student->fresh(['skills', 'preferences', 'availability']),
        ]);
    }

    /**
     * PUT /api/students/me/skills — Replace all skills.
     */
    public function updateSkills(UpdateSkillsRequest $request): JsonResponse
    {
        $student = $request->user()->student;
        $data = $request->validated();

        // Delete old skills and insert new ones
        $student->skills()->delete();

        foreach ($data['skills'] as $skill) {
            $student->skills()->create($skill);
        }

        $this->updateCompleteness($student);

        return response()->json([
            'message' => 'Skills updated.',
            'data' => $student->skills()->get(),
        ]);
    }

    /**
     * PUT /api/students/me/preferences — Upsert preferences.
     */
    public function updatePreferences(UpdatePreferencesRequest $request): JsonResponse
    {
        $student = $request->user()->student;

        $preferences = StudentPreference::updateOrCreate(
            ['student_id' => $student->id],
            $request->validated()
        );

        $this->updateCompleteness($student);

        return response()->json([
            'message' => 'Preferences updated.',
            'data' => $preferences,
        ]);
    }

    /**
     * PUT /api/students/me/availability — Upsert availability.
     */
    public function updateAvailability(UpdateAvailabilityRequest $request): JsonResponse
    {
        $student = $request->user()->student;

        $availability = StudentAvailability::updateOrCreate(
            ['student_id' => $student->id],
            $request->validated()
        );

        $this->updateCompleteness($student);

        return response()->json([
            'message' => 'Availability updated.',
            'data' => $availability,
        ]);
    }

    /**
     * Calculate and update profile completeness (0-100).
     */
    private function updateCompleteness(Student $student): void
    {
        $student->refresh();
        $score = 0;

        // Personal info (20 pts)
        if ($student->first_name && $student->last_name) {
            $score += 10;
        }
        if ($student->phone && $student->address) {
            $score += 10;
        }

        // Academic info (20 pts)
        if ($student->school && $student->course) {
            $score += 15;
        }
        if ($student->year_level) {
            $score += 5;
        }

        // Skills (20 pts)
        if ($student->skills()->count() > 0) {
            $score += 20;
        }

        // Preferences (20 pts)
        if ($student->preferences) {
            $score += 20;
        }

        // Availability (20 pts)
        if ($student->availability) {
            $score += 20;
        }

        $student->update(['profile_completeness' => min($score, 100)]);
    }
}
