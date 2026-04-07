<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\Company;
use App\Models\Coordinator;
use App\Models\Faq;
use App\Models\MatchingRule;
use App\Models\Message;
use App\Models\Notification;
use App\Models\OjtGuideline;
use App\Models\OjtPosting;
use App\Models\OjtProgress;
use App\Models\PostingSkill;
use App\Models\Resume;
use App\Models\Student;
use App\Models\StudentAvailability;
use App\Models\StudentPreference;
use App\Models\StudentSkill;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ========================================
        // 1. Admin User
        // ========================================
        $admin = User::factory()->admin()->create([
            'name' => 'System Admin',
            'email' => 'admin@ojtmatch.com',
            'password' => Hash::make('password'),
        ]);

        // ========================================
        // 2. Coordinators (2)
        // ========================================
        $coordinatorUser1 = User::factory()->coordinator()->create([
            'name' => 'Maria Santos',
            'email' => 'coordinator1@ojtmatch.com',
            'password' => Hash::make('password'),
        ]);
        Coordinator::factory()->create([
            'user_id' => $coordinatorUser1->id,
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'department' => 'College of Computer Studies',
            'school_affiliation' => 'Polytechnic University of the Philippines',
        ]);

        $coordinatorUser2 = User::factory()->coordinator()->create([
            'name' => 'Jose Reyes',
            'email' => 'coordinator2@ojtmatch.com',
            'password' => Hash::make('password'),
        ]);
        Coordinator::factory()->create([
            'user_id' => $coordinatorUser2->id,
            'first_name' => 'Jose',
            'last_name' => 'Reyes',
            'department' => 'College of Engineering',
            'school_affiliation' => 'University of the Philippines',
        ]);

        // ========================================
        // 3. Companies (5) with OJT Postings
        // ========================================
        $companies = [];
        $companyData = [
            ['name' => 'TechVentures Inc.', 'email' => 'company1@ojtmatch.com', 'company_name' => 'TechVentures Inc.', 'industry' => 'Software Development', 'status' => 'approved'],
            ['name' => 'DataFlow Corp.', 'email' => 'company2@ojtmatch.com', 'company_name' => 'DataFlow Corp.', 'industry' => 'Data Science', 'status' => 'approved'],
            ['name' => 'WebCraft Studios', 'email' => 'company3@ojtmatch.com', 'company_name' => 'WebCraft Studios', 'industry' => 'Web Development', 'status' => 'approved'],
            ['name' => 'CyberShield Solutions', 'email' => 'company4@ojtmatch.com', 'company_name' => 'CyberShield Solutions', 'industry' => 'Cybersecurity', 'status' => 'pending'],
            ['name' => 'GameForge PH', 'email' => 'company5@ojtmatch.com', 'company_name' => 'GameForge PH', 'industry' => 'Game Development', 'status' => 'pending'],
        ];

        foreach ($companyData as $data) {
            $companyUser = User::factory()->company()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make('password'),
            ]);

            $company = Company::factory()->create([
                'user_id' => $companyUser->id,
                'company_name' => $data['company_name'],
                'industry' => $data['industry'],
                'accreditation_status' => $data['status'],
            ]);

            $companies[] = $company;
        }

        // OJT Postings for approved companies
        $postingsData = [
            // TechVentures Inc.
            ['company_id' => $companies[0]->id, 'title' => 'Full Stack Developer Intern', 'location' => 'Makati City', 'industry' => 'Software Development', 'slots' => 3,
             'skills' => [['skill_name' => 'PHP', 'required' => true], ['skill_name' => 'Laravel', 'required' => true], ['skill_name' => 'Vue.js', 'required' => false], ['skill_name' => 'MySQL', 'required' => false]]],
            ['company_id' => $companies[0]->id, 'title' => 'Backend Developer Intern', 'location' => 'Makati City', 'industry' => 'Software Development', 'slots' => 2,
             'skills' => [['skill_name' => 'PHP', 'required' => true], ['skill_name' => 'Laravel', 'required' => true], ['skill_name' => 'REST APIs', 'required' => true]]],

            // DataFlow Corp.
            ['company_id' => $companies[1]->id, 'title' => 'Data Analyst Intern', 'location' => 'Quezon City', 'industry' => 'Data Science', 'slots' => 2,
             'skills' => [['skill_name' => 'Python', 'required' => true], ['skill_name' => 'SQL', 'required' => true], ['skill_name' => 'Data Visualization', 'required' => false]]],
            ['company_id' => $companies[1]->id, 'title' => 'Machine Learning Intern', 'location' => 'Quezon City', 'industry' => 'Data Science', 'slots' => 1,
             'skills' => [['skill_name' => 'Python', 'required' => true], ['skill_name' => 'TensorFlow', 'required' => true], ['skill_name' => 'Machine Learning', 'required' => true]]],

            // WebCraft Studios
            ['company_id' => $companies[2]->id, 'title' => 'Frontend Developer Intern', 'location' => 'Taguig City', 'industry' => 'Web Development', 'slots' => 3,
             'skills' => [['skill_name' => 'HTML/CSS', 'required' => true], ['skill_name' => 'JavaScript', 'required' => true], ['skill_name' => 'React', 'required' => false], ['skill_name' => 'Tailwind CSS', 'required' => false]]],
            ['company_id' => $companies[2]->id, 'title' => 'UI/UX Designer Intern', 'location' => 'Taguig City', 'industry' => 'Web Development', 'slots' => 2,
             'skills' => [['skill_name' => 'Figma', 'required' => true], ['skill_name' => 'Adobe XD', 'required' => false], ['skill_name' => 'UI/UX Design', 'required' => true]]],

            // Additional posting from TechVentures
            ['company_id' => $companies[0]->id, 'title' => 'QA Tester Intern', 'location' => 'Makati City', 'industry' => 'Software Development', 'slots' => 2,
             'skills' => [['skill_name' => 'Manual Testing', 'required' => true], ['skill_name' => 'Selenium', 'required' => false], ['skill_name' => 'JIRA', 'required' => false]]],

            // Additional posting from DataFlow
            ['company_id' => $companies[1]->id, 'title' => 'IT Support Intern', 'location' => 'Remote', 'industry' => 'Information Technology', 'slots' => 2,
             'skills' => [['skill_name' => 'Networking', 'required' => true], ['skill_name' => 'Troubleshooting', 'required' => true]]],

            // Additional posting from WebCraft
            ['company_id' => $companies[2]->id, 'title' => 'Mobile App Developer Intern', 'location' => 'Taguig City', 'industry' => 'Web Development', 'slots' => 2,
             'skills' => [['skill_name' => 'React Native', 'required' => true], ['skill_name' => 'JavaScript', 'required' => true], ['skill_name' => 'Mobile Development', 'required' => true]]],

            // Additional posting from WebCraft
            ['company_id' => $companies[2]->id, 'title' => 'DevOps Intern', 'location' => 'Remote', 'industry' => 'Information Technology', 'slots' => 1,
             'skills' => [['skill_name' => 'Docker', 'required' => true], ['skill_name' => 'CI/CD', 'required' => true], ['skill_name' => 'Linux', 'required' => false]]],
        ];

        $postings = [];
        foreach ($postingsData as $pData) {
            $skills = $pData['skills'];
            unset($pData['skills']);

            $posting = OjtPosting::factory()->create($pData);
            $postings[] = $posting;

            foreach ($skills as $skill) {
                PostingSkill::create([
                    'ojt_posting_id' => $posting->id,
                    'skill_name' => $skill['skill_name'],
                    'is_required' => $skill['required'],
                ]);
            }
        }

        // ========================================
        // 4. Students (8) with full profiles
        // ========================================
        $students = [];
        $studentData = [
            [
                'name' => 'Juan Dela Cruz', 'email' => 'student1@ojtmatch.com',
                'first_name' => 'Juan', 'last_name' => 'Dela Cruz',
                'school' => 'Polytechnic University of the Philippines', 'course' => 'BS Information Technology',
                'skills' => ['PHP', 'Laravel', 'JavaScript', 'HTML/CSS', 'MySQL'],
                'pref_industry' => 'Software Development', 'pref_location' => 'Makati City',
            ],
            [
                'name' => 'Ana Marie Garcia', 'email' => 'student2@ojtmatch.com',
                'first_name' => 'Ana Marie', 'last_name' => 'Garcia',
                'school' => 'University of the Philippines', 'course' => 'BS Computer Science',
                'skills' => ['Python', 'SQL', 'Data Visualization', 'Machine Learning', 'TensorFlow'],
                'pref_industry' => 'Data Science', 'pref_location' => 'Quezon City',
            ],
            [
                'name' => 'Carlos Reyes', 'email' => 'student3@ojtmatch.com',
                'first_name' => 'Carlos', 'last_name' => 'Reyes',
                'school' => 'De La Salle University', 'course' => 'BS Computer Science',
                'skills' => ['HTML/CSS', 'JavaScript', 'React', 'Tailwind CSS', 'Figma'],
                'pref_industry' => 'Web Development', 'pref_location' => 'Taguig City',
            ],
            [
                'name' => 'Maria Lourdes Santos', 'email' => 'student4@ojtmatch.com',
                'first_name' => 'Maria Lourdes', 'last_name' => 'Santos',
                'school' => 'Ateneo de Manila University', 'course' => 'BS Information Systems',
                'skills' => ['PHP', 'Laravel', 'Vue.js', 'REST APIs', 'Git'],
                'pref_industry' => 'Software Development', 'pref_location' => 'Makati City',
            ],
            [
                'name' => 'Patrick Lim', 'email' => 'student5@ojtmatch.com',
                'first_name' => 'Patrick', 'last_name' => 'Lim',
                'school' => 'Technological University of the Philippines', 'course' => 'BS Computer Engineering',
                'skills' => ['Networking', 'Troubleshooting', 'Linux', 'Docker', 'CI/CD'],
                'pref_industry' => 'Information Technology', 'pref_location' => 'Remote',
            ],
            [
                'name' => 'Jennifer Cruz', 'email' => 'student6@ojtmatch.com',
                'first_name' => 'Jennifer', 'last_name' => 'Cruz',
                'school' => 'Polytechnic University of the Philippines', 'course' => 'BS Information Technology',
                'skills' => ['Manual Testing', 'Selenium', 'JIRA', 'SQL', 'PHP'],
                'pref_industry' => 'Software Development', 'pref_location' => 'Makati City',
            ],
            [
                'name' => 'Miguel Torres', 'email' => 'student7@ojtmatch.com',
                'first_name' => 'Miguel', 'last_name' => 'Torres',
                'school' => 'University of the Philippines', 'course' => 'BS Software Engineering',
                'skills' => ['React Native', 'JavaScript', 'Mobile Development', 'UI/UX Design'],
                'pref_industry' => 'Web Development', 'pref_location' => 'Taguig City',
            ],
            [
                'name' => 'Sophia Rivera', 'email' => 'student8@ojtmatch.com',
                'first_name' => 'Sophia', 'last_name' => 'Rivera',
                'school' => 'De La Salle University', 'course' => 'BS Computer Science',
                'skills' => ['Python', 'PHP', 'Laravel', 'JavaScript', 'SQL'],
                'pref_industry' => 'Software Development', 'pref_location' => 'Quezon City',
            ],
        ];

        $weeklySchedule = [
            'monday' => true,
            'tuesday' => true,
            'wednesday' => true,
            'thursday' => true,
            'friday' => true,
            'saturday' => false,
            'sunday' => false,
        ];

        foreach ($studentData as $sData) {
            $studentUser = User::factory()->student()->create([
                'name' => $sData['name'],
                'email' => $sData['email'],
                'password' => Hash::make('password'),
            ]);

            $student = Student::factory()->create([
                'user_id' => $studentUser->id,
                'first_name' => $sData['first_name'],
                'last_name' => $sData['last_name'],
                'school' => $sData['school'],
                'course' => $sData['course'],
                'year_level' => '4th Year',
                'profile_completeness' => 100,
            ]);

            $students[] = $student;

            // Skills
            foreach ($sData['skills'] as $skill) {
                StudentSkill::create([
                    'student_id' => $student->id,
                    'skill_name' => $skill,
                    'proficiency' => fake()->randomElement(['beginner', 'intermediate', 'advanced']),
                ]);
            }

            // Preference
            StudentPreference::create([
                'student_id' => $student->id,
                'preferred_industry' => $sData['pref_industry'],
                'preferred_location' => $sData['pref_location'],
            ]);

            // Availability
            StudentAvailability::create([
                'student_id' => $student->id,
                'start_date' => now()->addMonth()->format('Y-m-d'),
                'duration' => '480 hours',
                'weekly_schedule' => $weeklySchedule,
            ]);

            // Resume
            Resume::factory()->create([
                'student_id' => $student->id,
            ]);
        }

        // ========================================
        // 5. Applications (various statuses)
        // ========================================
        // Student 1 (Juan) applied to Full Stack (accepted) and Backend (pending)
        $app1 = Application::factory()->create([
            'student_id' => $students[0]->id,
            'ojt_posting_id' => $postings[0]->id, // Full Stack Dev at TechVentures
            'resume_id' => Resume::where('student_id', $students[0]->id)->first()->id,
            'status' => 'accepted',
        ]);
        $postings[0]->increment('slots_filled');
        OjtProgress::create([
            'application_id' => $app1->id,
            'total_hours_required' => 480,
            'hours_rendered' => 120,
            'status' => 'in_progress',
            'start_date' => now()->subMonth()->format('Y-m-d'),
        ]);

        Application::factory()->create([
            'student_id' => $students[0]->id,
            'ojt_posting_id' => $postings[1]->id, // Backend Dev at TechVentures
            'resume_id' => Resume::where('student_id', $students[0]->id)->first()->id,
            'status' => 'rejected',
        ]);

        // Student 2 (Ana Marie) applied to Data Analyst (accepted)
        $app2 = Application::factory()->create([
            'student_id' => $students[1]->id,
            'ojt_posting_id' => $postings[2]->id, // Data Analyst at DataFlow
            'resume_id' => Resume::where('student_id', $students[1]->id)->first()->id,
            'status' => 'accepted',
        ]);
        $postings[2]->increment('slots_filled');
        OjtProgress::create([
            'application_id' => $app2->id,
            'total_hours_required' => 480,
            'hours_rendered' => 240,
            'status' => 'in_progress',
            'start_date' => now()->subMonths(2)->format('Y-m-d'),
        ]);

        // Student 3 (Carlos) applied to Frontend Dev (pending) and UI/UX (pending)
        Application::factory()->create([
            'student_id' => $students[2]->id,
            'ojt_posting_id' => $postings[4]->id, // Frontend Dev at WebCraft
            'resume_id' => Resume::where('student_id', $students[2]->id)->first()->id,
            'status' => 'pending',
        ]);
        Application::factory()->create([
            'student_id' => $students[2]->id,
            'ojt_posting_id' => $postings[5]->id, // UI/UX at WebCraft
            'resume_id' => Resume::where('student_id', $students[2]->id)->first()->id,
            'status' => 'pending',
        ]);

        // Student 4 (Maria) applied to Full Stack (pending)
        Application::factory()->create([
            'student_id' => $students[3]->id,
            'ojt_posting_id' => $postings[0]->id,
            'resume_id' => Resume::where('student_id', $students[3]->id)->first()->id,
            'status' => 'pending',
        ]);

        // Student 5 (Patrick) applied to IT Support (accepted)
        $app5 = Application::factory()->create([
            'student_id' => $students[4]->id,
            'ojt_posting_id' => $postings[7]->id, // IT Support at DataFlow
            'resume_id' => Resume::where('student_id', $students[4]->id)->first()->id,
            'status' => 'accepted',
        ]);
        $postings[7]->increment('slots_filled');
        OjtProgress::create([
            'application_id' => $app5->id,
            'total_hours_required' => 480,
            'hours_rendered' => 60,
            'status' => 'in_progress',
            'start_date' => now()->subWeeks(2)->format('Y-m-d'),
        ]);

        // Student 6 (Jennifer) applied to QA Tester (pending)
        Application::factory()->create([
            'student_id' => $students[5]->id,
            'ojt_posting_id' => $postings[6]->id, // QA Tester at TechVentures
            'resume_id' => Resume::where('student_id', $students[5]->id)->first()->id,
            'status' => 'pending',
        ]);

        // Student 7 (Miguel) applied to Mobile App Dev (withdrawn)
        Application::factory()->create([
            'student_id' => $students[6]->id,
            'ojt_posting_id' => $postings[8]->id, // Mobile App Dev at WebCraft
            'resume_id' => Resume::where('student_id', $students[6]->id)->first()->id,
            'status' => 'withdrawn',
        ]);

        // Student 8 (Sophia) - no applications yet (fresh student)

        // ========================================
        // 6. Matching Rules (default config)
        // ========================================
        MatchingRule::create([
            'rule_name' => 'Default Matching Configuration',
            'skill_weight' => 50,
            'location_weight' => 25,
            'availability_weight' => 25,
            'minimum_score' => 50,
            'is_active' => true,
        ]);

        // ========================================
        // 7. Sample Notifications
        // ========================================
        $notifData = [
            ['user_id' => User::where('email', 'student1@ojtmatch.com')->first()->id, 'title' => 'Application Accepted', 'message' => 'Your application for Full Stack Developer Intern at TechVentures Inc. has been accepted!', 'type' => 'application_accepted'],
            ['user_id' => User::where('email', 'student1@ojtmatch.com')->first()->id, 'title' => 'Application Rejected', 'message' => 'Your application for Backend Developer Intern at TechVentures Inc. has been rejected.', 'type' => 'application_rejected', 'is_read' => true],
            ['user_id' => User::where('email', 'company1@ojtmatch.com')->first()->id, 'title' => 'New Application', 'message' => 'Maria Lourdes Santos has applied for Full Stack Developer Intern.', 'type' => 'new_application'],
            ['user_id' => User::where('email', 'student2@ojtmatch.com')->first()->id, 'title' => 'Application Accepted', 'message' => 'Your application for Data Analyst Intern at DataFlow Corp. has been accepted!', 'type' => 'application_accepted', 'is_read' => true],
            ['user_id' => User::where('email', 'company3@ojtmatch.com')->first()->id, 'title' => 'New Application', 'message' => 'Carlos Reyes has applied for Frontend Developer Intern.', 'type' => 'new_application'],
            ['user_id' => User::where('email', 'company3@ojtmatch.com')->first()->id, 'title' => 'New Application', 'message' => 'Carlos Reyes has applied for UI/UX Designer Intern.', 'type' => 'new_application'],
        ];

        foreach ($notifData as $notif) {
            Notification::create(array_merge([
                'is_read' => false,
            ], $notif));
        }

        // ========================================
        // 8. Sample Messages
        // ========================================
        $student1User = User::where('email', 'student1@ojtmatch.com')->first();
        $company1User = User::where('email', 'company1@ojtmatch.com')->first();

        Message::create([
            'sender_id' => $company1User->id,
            'receiver_id' => $student1User->id,
            'body' => 'Welcome to TechVentures! Your internship starts on Monday. Please report to the HR office at 9 AM.',
            'is_read' => true,
        ]);
        Message::create([
            'sender_id' => $student1User->id,
            'receiver_id' => $company1User->id,
            'body' => 'Thank you! I will be there on time. Is there anything I need to bring?',
            'is_read' => true,
        ]);
        Message::create([
            'sender_id' => $company1User->id,
            'receiver_id' => $student1User->id,
            'body' => 'Just bring a valid ID and your laptop. We\'ll provide the rest.',
            'is_read' => false,
        ]);

        $coordinatorUser = User::where('email', 'coordinator1@ojtmatch.com')->first();
        Message::create([
            'sender_id' => $coordinatorUser->id,
            'receiver_id' => $student1User->id,
            'body' => 'Hi Juan, please submit your weekly report by Friday.',
            'is_read' => false,
        ]);

        // ========================================
        // 9. FAQs
        // ========================================
        $faqs = [
            ['question' => 'What is the OJT Job Matching Platform?', 'answer' => 'The OJT Job Matching Platform is an online system that helps students find On-the-Job Training opportunities by matching them with partner companies based on skills, location, and availability.', 'category' => 'General', 'sort_order' => 1],
            ['question' => 'How do I create a student account?', 'answer' => 'Click the Register button on the homepage, select "Student" as your role, and fill in your details including email, name, and password. You will receive a verification email to activate your account.', 'category' => 'Student', 'sort_order' => 2],
            ['question' => 'How does the matching algorithm work?', 'answer' => 'The system uses a weighted scoring algorithm that considers your skills match (50%), preferred location (25%), and availability (25%) to recommend the best OJT opportunities for you.', 'category' => 'General', 'sort_order' => 3],
            ['question' => 'How do I register my company as a partner?', 'answer' => 'Register with a "Company" role, complete your company profile, and wait for coordinator approval. Once approved, you can start posting OJT opportunities.', 'category' => 'Company', 'sort_order' => 4],
            ['question' => 'What documents do I need for my OJT application?', 'answer' => 'You need to upload your resume (PDF format, max 5MB) and optionally include a cover letter when applying to a posting.', 'category' => 'OJT Process', 'sort_order' => 5],
            ['question' => 'How many OJT hours do I need to complete?', 'answer' => 'The required OJT hours depend on your course and university requirements. Most programs require 480-600 hours. Check with your OJT coordinator for specific requirements.', 'category' => 'OJT Process', 'sort_order' => 6],
            ['question' => 'Can I apply to multiple companies?', 'answer' => 'Yes, you can apply to multiple OJT postings. However, you can only accept one offer at a time.', 'category' => 'Student', 'sort_order' => 7],
            ['question' => 'How do I track my OJT progress?', 'answer' => 'Once your application is accepted, you can track your hours and progress through the OJT Progress section in your student dashboard.', 'category' => 'OJT Process', 'sort_order' => 8],
        ];

        foreach ($faqs as $faq) {
            Faq::create(array_merge($faq, ['is_published' => true]));
        }

        // ========================================
        // 10. OJT Guidelines
        // ========================================
        $guidelines = [
            ['title' => 'General OJT Requirements', 'content' => "All students must complete the required number of OJT hours as specified by their program. Students must maintain at least 80% attendance and submit weekly progress reports.\n\nStudents are expected to follow the company's rules and regulations during their OJT period.", 'sort_order' => 1],
            ['title' => 'Code of Conduct', 'content' => "Students must observe professional behavior at all times during their OJT. This includes:\n\n1. Punctuality and regular attendance\n2. Proper dress code as required by the company\n3. Respect for company property and confidentiality\n4. Active participation in assigned tasks\n5. No use of company resources for personal purposes", 'sort_order' => 2],
            ['title' => 'Grading System', 'content' => "OJT performance will be evaluated based on the following criteria:\n\n- Company Evaluation: 50%\n- Weekly Reports: 20%\n- Final Report/Documentation: 20%\n- Coordinator Assessment: 10%\n\nA minimum grade of 75% is required to pass the OJT course.", 'sort_order' => 3],
            ['title' => 'Required Submissions', 'content' => "Students must submit the following documents:\n\n1. Signed MOA/Endorsement Letter (before OJT starts)\n2. Weekly Progress Reports (every Friday)\n3. Monthly Summary Report\n4. Final Documentation/Report (within 2 weeks after OJT completion)\n5. Company Evaluation Form (signed by supervisor)", 'sort_order' => 4],
            ['title' => 'Safety and Health Guidelines', 'content' => "Students must prioritize their safety and health during OJT. Report any workplace hazards or concerns to both the company supervisor and OJT coordinator immediately.\n\nIn case of medical emergencies, contact the company's HR department and inform the coordinator.", 'sort_order' => 5],
        ];

        foreach ($guidelines as $guideline) {
            OjtGuideline::create(array_merge($guideline, ['is_published' => true]));
        }

        // ========================================
        // Summary
        // ========================================
        $this->command->info('');
        $this->command->info('=========================================');
        $this->command->info('  OJT Job Matching - Database Seeded!');
        $this->command->info('=========================================');
        $this->command->info('');
        $this->command->info('Demo Accounts (all passwords: "password"):');
        $this->command->info('  Admin:       admin@ojtmatch.com');
        $this->command->info('  Coordinator: coordinator1@ojtmatch.com');
        $this->command->info('  Coordinator: coordinator2@ojtmatch.com');
        $this->command->info('  Company:     company1@ojtmatch.com (approved)');
        $this->command->info('  Company:     company2@ojtmatch.com (approved)');
        $this->command->info('  Company:     company3@ojtmatch.com (approved)');
        $this->command->info('  Company:     company4@ojtmatch.com (pending)');
        $this->command->info('  Company:     company5@ojtmatch.com (pending)');
        $this->command->info('  Student:     student1@ojtmatch.com (placed)');
        $this->command->info('  Student:     student2@ojtmatch.com (placed)');
        $this->command->info('  Student:     student3@ojtmatch.com (pending apps)');
        $this->command->info('  Student:     student4@ojtmatch.com (pending app)');
        $this->command->info('  Student:     student5@ojtmatch.com (placed)');
        $this->command->info('  Student:     student6@ojtmatch.com (pending app)');
        $this->command->info('  Student:     student7@ojtmatch.com (withdrawn)');
        $this->command->info('  Student:     student8@ojtmatch.com (no apps)');
        $this->command->info('');
        $this->command->info("Created: 1 Admin, 2 Coordinators, 5 Companies, 8 Students");
        $this->command->info("Created: 10 OJT Postings, 9 Applications, 3 OJT Progress");
        $this->command->info("Created: 8 FAQs, 5 Guidelines, 1 Matching Rule");
        $this->command->info('=========================================');
    }
}
