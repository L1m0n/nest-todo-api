export class WrongStatusException extends Error {
  constructor() {
    super('wrong task status');
    this.name = 'WrongStatusException';
  }
}
