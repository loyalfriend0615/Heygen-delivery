import OpenAI from "openai";

export class OpenAIAssistant {
  private client: OpenAI;
  private assistantId: string;
  private thread: any;

  constructor(apiKey: string, assistantId: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    this.assistantId = assistantId;
  }

  async initialize() {
    // Create a new thread only
    this.thread = await this.client.beta.threads.create();
  }

  async getResponse(userMessage: string): Promise<string> {
    if (!this.assistantId || !this.thread) {
      throw new Error("Assistant or thread not initialized. Call initialize() first.");
    }

    // Add user message to the thread
    await this.client.beta.threads.messages.create(this.thread.id, {
      role: "user",
      content: userMessage,
    });

    // Run the assistant with the existing assistant ID
    const run = await this.client.beta.threads.runs.createAndPoll(
      this.thread.id,
      { assistant_id: this.assistantId }
    );

    if (run.status === "completed") {
      // Get the assistant's response
      const messages = await this.client.beta.threads.messages.list(this.thread.id);

      // Find the latest assistant message
      const lastMessage = messages.data.find((msg) => msg.role === "assistant");

      if (lastMessage && lastMessage.content[0].type === "text") {
        return lastMessage.content[0].text.value;
      }
    }

    return "Sorry, I couldn't process your request.";
  }
} 