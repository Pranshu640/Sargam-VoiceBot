// ============================================================
// Sargam AI — Groq LLM API Route (Keeps API key server-side)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY not configured. Add it to .env.local' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { messages, model, temperature, max_tokens, stream } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      );
    }

    const groqBody = {
      model: model || 'llama-3.3-70b-versatile',
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 300,
      stream: stream ?? false,
    };

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groqBody),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      return NextResponse.json(
        { error: `Groq API error: ${groqResponse.status}` },
        { status: groqResponse.status }
      );
    }

    // If streaming, pass through the stream
    if (stream) {
      const reader = groqResponse.body;
      if (!reader) {
        return NextResponse.json({ error: 'No response body' }, { status: 500 });
      }

      return new NextResponse(reader, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming: parse and return
    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      content,
      usage: data.usage,
      model: data.model,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
