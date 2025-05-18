export class MessageFormatterService {
  public format(message: string) {
    const timestamp = new Date().toISOString();

    return `[${timestamp}] ${message}`;
  }
}
