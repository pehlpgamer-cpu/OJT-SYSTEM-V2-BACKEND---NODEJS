<?php

namespace App\Services;

use App\Models\Notification;

/**
 * Create in-app notifications for users.
 */
class NotificationService
{
    /**
     * Send an in-app notification to a user.
     */
    public function send(int $userId, string $title, string $message, string $type = 'info', ?string $link = null): Notification
    {
        return Notification::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'link' => $link,
        ]);
    }

    /**
     * Send notification to multiple users.
     */
    public function sendToMany(array $userIds, string $title, string $message, string $type = 'info', ?string $link = null): void
    {
        $records = array_map(fn ($userId) => [
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'link' => $link,
            'created_at' => now(),
            'updated_at' => now(),
        ], $userIds);

        Notification::insert($records);
    }
}
