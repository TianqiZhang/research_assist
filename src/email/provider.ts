import type { EmailMessage, EmailProvider, EmailSendResult } from "../domain/providers";

export interface SendDigestEmailInput extends EmailMessage {
  digestId: string;
}

export class MockEmailProvider implements EmailProvider {
  readonly sent: EmailMessage[] = [];
  private readonly fail: boolean;

  constructor(options: { fail?: boolean } = {}) {
    this.fail = options.fail ?? false;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (this.fail) {
      throw new Error("Mock email failure");
    }

    this.sent.push(message);
    return {
      providerMessageId: `mock-${this.sent.length}`
    };
  }
}

export async function sendDigestEmail(
  input: SendDigestEmailInput,
  provider: EmailProvider
): Promise<EmailSendResult> {
  return provider.send({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });
}
