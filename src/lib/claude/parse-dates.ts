import Anthropic from '@anthropic-ai/sdk';

interface ParsedDateRange {
  check_in: string;
  check_out: string;
  label: string;
}

export async function parseFreehandDates(text: string): Promise<ParsedDateRange[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const client = new Anthropic({ apiKey });
  const today = new Date().toISOString().split('T')[0];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are a date range parser. Given freehand text describing travel date preferences, output a JSON array of date ranges.

Each element must have: { "check_in": "YYYY-MM-DD", "check_out": "YYYY-MM-DD", "label": "human description" }

Rules:
- Generate ALL valid date ranges matching the description
- "weekday period" = Mon-Fri (check in Monday, check out Friday unless specified)
- "weekend" = Friday to Sunday (2 nights) unless otherwise specified
- "X day period" = X nights
- Today is ${today}
- Maximum 30 date ranges. If more would match, pick the first 30 chronologically.
- Only output a valid JSON array, nothing else. No markdown code fences.
- Labels should be short, like "Sep 15-17 (Mon-Wed)" or "Mar 6-8 (Fri-Sun)"`,
    messages: [{ role: 'user', content: text }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  // Strip markdown code fences if present
  let jsonStr = content.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('Expected array from AI');

  return parsed.slice(0, 30).map((item: ParsedDateRange) => ({
    check_in: item.check_in,
    check_out: item.check_out,
    label: item.label || `${item.check_in} to ${item.check_out}`,
  }));
}
