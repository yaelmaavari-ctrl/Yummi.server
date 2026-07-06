import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from 'openai/resources/chat/completions';
import { env, isAiConfigured } from '../config/env';
import { UserRole } from '../types';
import { ApiError } from '../utils/ApiError';
import { executeTool, getToolDefinitions, ToolContext } from './agent/agentTools';

/** A single turn of the conversation as supplied by the client. */
export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** A record of a tool the agent chose to call, for transparency in the UI. */
export interface ToolCallTrace {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentChatResult {
  reply: string;
  toolCalls: ToolCallTrace[];
}

/** Tools that mutate data — when one succeeds we can reply instantly in Hebrew. */
const WRITE_TOOLS = new Set([
  'addToCart',
  'updateCartItem',
  'removeFromCart',
  'placeOrder',
  'cancelMyOrder',
  'updateOrderStatus',
]);

interface ToolBatchResult {
  name: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** Builds an instant Hebrew reply when a write tool succeeds (skips another LLM call). */
function buildFastReply(results: ToolBatchResult[]): string | null {
  const successes = results.filter((r) => r.ok && WRITE_TOOLS.has(r.name));
  if (successes.length === 0) {
    return null;
  }

  const last = successes[successes.length - 1];
  const data = last.data as Record<string, unknown> | undefined;

  switch (last.name) {
    case 'addToCart':
      return `הוספתי ${data?.['quantity'] ?? 1}× ${data?.['added'] ?? 'פריט'} לעגלה שלך!`;
    case 'updateCartItem':
      return `עדכנתי את הכמות של ${data?.['updated'] ?? 'הפריט'} בעגלה.`;
    case 'removeFromCart':
      return `הסרתי את ${data?.['removed'] ?? 'הפריט'} מהעגלה.`;
    case 'placeOrder':
      return `ההזמנה בוצעה בהצלחה! מספר הזמנה: ${String(data?.['orderId'] ?? '').slice(-6).toUpperCase()}. סה"כ: ₪${data?.['total'] ?? ''}.`;
    case 'cancelMyOrder':
      return `ההזמנה בוטלה בהצלחה.`;
    case 'updateOrderStatus':
      return `ההזמנה #${data?.['ref'] ?? ''} עודכנה לסטטוס ${data?.['status'] ?? ''}.`;
    default:
      return 'בוצע בהצלחה!';
  }
}

/**
 * System prompt (Hebrew).
 *
 * Key rules enforced here:
 * - Always reply in Hebrew.
 * - Use tools for live data; never invent information.
 * - The assistant discovers order details itself (via the order tools) instead
 *   of asking the user to describe what is in an order.
 * - Employees (kitchen/delivery/admin) can manage orders through their tools.
 * - Confirm before placing or cancelling customer orders.
 */
const SYSTEM_PROMPT = `אתה "עוזר Yummi", עוזר ידידותי למערכת הזמנות האוכל Yummi.

שפה: ענה תמיד בעברית, לא משנה באיזו שפה המשתמש כותב.

כלים: השתמש בכלים הזמינים כדי לשלוף מידע אמיתי (תפריט, מחירים, שעות פעילות, הזמנות). לעולם אל תמציא פריטים, מחירים או פרטי הזמנה — תמיד בדוק דרך הכלים.

לקוחות יכולים: להוסיף לעגלה, לצפות/לעדכן/להסיר פריטים מהעגלה, לבצע הזמנה, ולבטל הזמנה שעדיין בסטטוס RECEIVED.

הוספה לעגלה:
- קרא ל-addToCart עם תיאור המוצר של המשתמש בשדה productName.
- אם addToCart מחזיר שגיאה שאין מוצר תואם, קרא את רשימת המוצרים הזמינים בשגיאה ונסה שוב מיד עם השם המדויק מהרשימה.

הפחתת כמות:
- קרא ל-viewCart כדי לראות את הכמות הנוכחית, ואז קרא ל-updateCartItem עם הכמות המוחלטת החדשה (למשל הנוכחית פחות 1).
- אם התוצאה תהיה 0, השתמש ב-removeFromCart במקום.

עובדים (מטבח / משלוחים / מנהל):
- אתה מכיר את כל ההזמנות במערכת. כשעובד מבקש לטפל בהזמנה, אל תבקש ממנו לתאר מה יש בה — מצא אותה בעצמך.
- עובד מטבח: השתמש ב-getKitchenOrders כדי לראות את התור, וב-updateOrderStatus כדי לאשר הזמנה (APPROVED), להתחיל הכנה (IN_PREPARATION), או לסמן מוכן (READY).
- שליח: השתמש ב-getDeliveryOrders וב-updateOrderStatus כדי לסמן הזמנה כהושלמה (COMPLETED).
- מנהל: יש לך גם getAllOrders ו-getSalesSummary.
- הזמנות מזוהות לפי קוד בן 6 תווים (למשל A3F4C2) שמוצג על המסך. אם עובד נותן קוד כזה — השתמש בו ישירות. אם לא ברור לאיזו הזמנה הכוונה, קרא קודם ל-getKitchenOrders/getDeliveryOrders כדי למצוא אותה.
- מחזור חיי הזמנה: RECEIVED → APPROVED → IN_PREPARATION → READY → COMPLETED.

לפני ביצוע או ביטול הזמנה של לקוח, אשר את הפרטים עם המשתמש.

השב בקצרה ובידידותיות.`;

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!isAiConfigured) {
    throw new ApiError(503, 'AI assistant is not configured. Set OPENAI_API_KEY to enable it.');
  }
  cachedClient ??= new OpenAI({
    apiKey: env.ai.apiKey,
    ...(env.ai.baseUrl ? { baseURL: env.ai.baseUrl } : {}),
  });
  return cachedClient;
}

/**
 * gpt-oss models are reasoning models and are slow by default. Forcing low
 * reasoning effort makes them respond several times faster (and reduces the
 * "Parsing failed" tool-call errors), which we want for a snappy chat UX.
 * The param is ignored by non-gpt-oss models, so we only send it when relevant.
 */
const speedParams: { reasoning_effort?: 'low' } = env.ai.model.includes('gpt-oss')
  ? { reasoning_effort: 'low' }
  : {};

/**
 * Creates a completion, retrying once on the transient "Parsing failed" /
 * "failed to call a function" errors that reasoning models occasionally emit.
 */
async function createCompletion(
  client: OpenAI,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await client.chat.completions.create(params);
  } catch (err) {
    const detail = err instanceof Error ? err.message.toLowerCase() : '';
    if (detail.includes('parsing failed') || detail.includes('failed to call a function')) {
      return client.chat.completions.create(params);
    }
    throw err;
  }
}

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Maps Groq / provider errors to user-friendly messages. */
function mapProviderError(err: unknown): ApiError {
  const detail = err instanceof Error ? err.message : String(err);
  const low = detail.toLowerCase();

  if (low.includes('429') || low.includes('rate limit')) {
    return new ApiError(
      429,
      'העוזר החכם עמוס כרגע. אנא המתן דקה ונסה שוב.',
      detail
    );
  }

  if (
    low.includes('400') ||
    low.includes('failed to call a function') ||
    low.includes('failed_generation') ||
    low.includes('tool call validation failed')
  ) {
    return new ApiError(
      502,
      'העוזר החכם נתקל בבעיה עם הבקשה. נסח מחדש ונסה שוב.',
      detail
    );
  }

  return new ApiError(502, 'העוזר החכם אינו זמין כרגע. אנא נסה שוב.', detail);
}

/** Builds a valid assistant message that includes tool_calls (content may be null). */
function toAssistantToolMessage(
  choice: OpenAI.Chat.Completions.ChatCompletionMessage
): ChatCompletionMessageParam {
  return {
    role: 'assistant',
    content: choice.content ?? null,
    tool_calls: choice.tool_calls,
  };
}

/**
 * Forces a user-facing text answer once tool rounds are exhausted.
 *
 * We keep passing `tools` with `tool_choice: 'auto'` (never 'none') because
 * some Groq models — e.g. openai/gpt-oss — reject requests with
 * "Tool choice is none, but model called a tool" if they still emit a call.
 * The extra instruction nudges the model to answer in plain Hebrew text; if it
 * still tries a tool, `content` is null and we return a friendly fallback.
 */
async function requestFinalReply(
  client: OpenAI,
  messages: ChatCompletionMessageParam[],
  tools: ReturnType<typeof getToolDefinitions>
): Promise<string> {
  const completion = await createCompletion(client, {
    model: env.ai.model,
    messages: [
      ...messages,
      {
        role: 'user',
        content: 'ענה עכשיו למשתמש בעברית, בטקסט בלבד, סיכום קצר של מה שקרה. אל תקרא לכלים.',
      },
    ],
    tools,
    tool_choice: 'auto',
    temperature: 0.2,
    ...speedParams,
  });
  return completion.choices[0]?.message?.content?.trim() || 'בוצע! אשמח לעזור בכל דבר נוסף.';
}

export const agentService = {
  /**
   * Runs one agent turn using OpenAI-compatible function calling.
   *
   * Natural multi-round loop (up to `maxToolRounds`):
   * - Each round the model may return text (→ done) or call tools.
   * - After executing a batch of tools we append the results and continue,
   *   so the model can react to them (e.g. retry addToCart with the correct
   *   product name taken from a tool error, or approve an order after listing
   *   the queue).
   * - If all rounds are consumed while still calling tools, we make one final
   *   call that nudges the model to answer in plain text.
   *
   * We always pass `tools` with `tool_choice: 'auto'` (never 'none') because
   * some Groq models reject 'none' if they still try to call a tool.
   */
  async chat(
    message: string,
    history: ChatHistoryMessage[],
    ctx: ToolContext
  ): Promise<AgentChatResult> {
    const client = getClient();
    const tools = getToolDefinitions(ctx.activeRole);

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      // Keep only the last 6 turns to limit token usage
      ...history.slice(-6).map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: message },
    ];

    const toolCalls: ToolCallTrace[] = [];

    for (let round = 0; round < env.ai.maxToolRounds; round += 1) {
      let completion;
      try {
        completion = await createCompletion(client, {
          model: env.ai.model,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.2,
          ...speedParams,
        });
      } catch (err) {
        throw mapProviderError(err);
      }

      const choice = completion.choices[0]?.message;
      if (!choice) {
        throw new ApiError(502, 'העוזר החכם החזיר תשובה ריקה.');
      }

      // Model produced a text answer — return immediately.
      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        return {
          reply: choice.content?.trim() || 'בוצע! אשמח לעזור בכל דבר נוסף.',
          toolCalls,
        };
      }

      // Execute every tool call in this batch and feed results back.
      messages.push(toAssistantToolMessage(choice));
      const toolResultMessages: ChatCompletionToolMessageParam[] = [];
      const batchResults: ToolBatchResult[] = [];

      for (const call of choice.tool_calls) {
        if (call.type !== 'function') continue;

        const args = parseToolArguments(call.function.arguments);
        toolCalls.push({ name: call.function.name, arguments: args });

        let resultPayload: string;
        try {
          const result = await executeTool(call.function.name, args, ctx);
          resultPayload = JSON.stringify({ ok: true, data: result });
          batchResults.push({ name: call.function.name, ok: true, data: result });
        } catch (err) {
          const msg = err instanceof ApiError ? err.message : 'Tool execution failed.';
          resultPayload = JSON.stringify({ ok: false, error: msg });
          batchResults.push({ name: call.function.name, ok: false, error: msg });
        }

        toolResultMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: resultPayload,
        });
      }

      if (toolResultMessages.length === 0) {
        break;
      }
      messages.push(...toolResultMessages);

      // Write tool succeeded → instant Hebrew reply, skip another slow LLM round.
      const fastReply = buildFastReply(batchResults);
      if (fastReply) {
        return { reply: fastReply, toolCalls };
      }
    }

    // Rounds exhausted while still calling tools — force a text answer.
    try {
      const reply = await requestFinalReply(client, messages, tools);
      return { reply, toolCalls };
    } catch (err) {
      throw mapProviderError(err);
    }
  },
};

/** Re-exported for callers that build the trusted context. */
export type { ToolContext };
export { UserRole };
