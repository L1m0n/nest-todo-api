import { Injectable } from '@nestjs/common';
import { MessageFormatterService } from '../message-formatter/message-formatter.service';

@Injectable()
export class LoggerService {
  constructor(private readonly messageFormater: MessageFormatterService) {}

  public log(message: string): string {
    const formattedMessage = this.messageFormater.format(message);

    console.log(formattedMessage);
    return formattedMessage;
  }
}
