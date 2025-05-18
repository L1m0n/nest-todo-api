import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PasswordService } from './password.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return password', async () => {
    const mockHash = 'mock_hashed_password';
    (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

    const password = 'Password123#';
    const result = await service.hashPassword(password);

    expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    expect(result).toBe(mockHash);
  })
});
