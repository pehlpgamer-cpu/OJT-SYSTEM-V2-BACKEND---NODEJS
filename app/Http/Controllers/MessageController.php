<?php

namespace App\Http\Controllers;

use App\Http\Requests\Message\StoreMessageRequest;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    /**
     * GET /api/messages — List conversations (grouped by the other user).
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        // Get all messages involving the user, ordered by latest
        $messages = Message::where('sender_id', $userId)
            ->orWhere('receiver_id', $userId)
            ->with(['sender:id,name,role', 'receiver:id,name,role'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($messages);
    }

    /**
     * GET /api/messages/{userId} — Get conversation with a specific user.
     */
    public function conversation(Request $request, int $otherUserId): JsonResponse
    {
        $userId = $request->user()->id;

        $messages = Message::where(function ($q) use ($userId, $otherUserId) {
            $q->where('sender_id', $userId)->where('receiver_id', $otherUserId);
        })->orWhere(function ($q) use ($userId, $otherUserId) {
            $q->where('sender_id', $otherUserId)->where('receiver_id', $userId);
        })
            ->with(['sender:id,name,role', 'receiver:id,name,role'])
            ->orderBy('created_at')
            ->paginate(30);

        // Mark received messages as read
        Message::where('sender_id', $otherUserId)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json($messages);
    }

    /**
     * POST /api/messages — Send a message.
     */
    public function store(StoreMessageRequest $request): JsonResponse
    {
        $data = $request->validated();

        $message = Message::create([
            'sender_id' => $request->user()->id,
            'receiver_id' => $data['receiver_id'],
            'body' => $data['body'],
        ]);

        return response()->json([
            'message' => 'Message sent.',
            'data' => $message->load(['sender:id,name,role', 'receiver:id,name,role']),
        ], 201);
    }
}
