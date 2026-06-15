import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { agentDispatchClient } from '@/lib/server-utils';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prompt, modelProvider, voice } = body;

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const livekitUrl = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !livekitUrl) {
            return NextResponse.json({ error: "LiveKit server credentials not configured" }, { status: 500 });
        }

        // Create a unique room name for this browser test session
        const roomName = `web-test-${Math.floor(Math.random() * 100000)}`;

        console.log(`Dispatching agent for browser WebRTC session in room ${roomName}`);

        // Construct metadata to pass prompt/model/voice choices to the agent
        const metadata = JSON.stringify({
            phone_number: "web-client", // Indicates browser connection
            user_prompt: prompt || "",
            model_provider: modelProvider || "openai",
            voice_id: voice || "alloy"
        });

        // 1. Dispatch the Agent to this room
        const dispatch = await agentDispatchClient.createDispatch(roomName, "outbound-caller", {
            metadata: metadata
        });

        // 2. Generate Access Token for browser client to join the same room
        const tokenIdentity = `web-client-${Math.floor(Math.random() * 1000)}`;
        const at = new AccessToken(apiKey, apiSecret, {
            identity: tokenIdentity,
            name: "Browser Tester",
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        const token = await at.toJwt();

        return NextResponse.json({
            success: true,
            roomName,
            token,
            serverUrl: livekitUrl,
            dispatchId: dispatch.id
        });

    } catch (error: any) {
        console.error("Error setting up browser WebRTC dispatch:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
