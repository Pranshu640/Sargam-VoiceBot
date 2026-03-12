// ============================================================
// Sargam AI — Groq LLM API Route (Keeps API key server-side)
// Supports tool calling / function calling
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY not configured. Add it to .env.local' },
      { status: 500 },
    );
  }

  try {
    const body = await req.json();
    const { messages, model, temperature, max_tokens, stream, tools, tool_choice } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 },
      );
    }

    const groqBody: Record<string, unknown> = {
      model: model || 'llama-3.3-70b-versatile',
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 300,
      stream: stream ?? false,
    };

    // Add tool calling if tools are provided
    if (tools && Array.isArray(tools) && tools.length > 0) {
      groqBody.tools = tools;
      groqBody.tool_choice = tool_choice || 'auto';
    }

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groqBody),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      return NextResponse.json(
        { error: `Groq API error: ${groqResponse.status}` },
        { status: groqResponse.status },
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
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming: parse and return full response (including tool_calls)
    const data = await groqResponse.json();
    const message = data.choices?.[0]?.message;
    const content = message?.content || '';
    const toolCalls = message?.tool_calls || null;

    return NextResponse.json({
      content,
      tool_calls: toolCalls,
      usage: data.usage,
      model: data.model,
      finish_reason: data.choices?.[0]?.finish_reason,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
