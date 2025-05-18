import { CreateUserDto } from './create-user.dto';
import { validate } from 'class-validator';
import e from 'express';

describe('Create User DTO', () => {
  let dto: CreateUserDto;

  beforeEach(async () => {
    dto = new CreateUserDto();
    dto.email = 'test@test.com';
    dto.password = '123456A#';
    dto.name = 'testName';
  });

  it('should validate complete valid data', async () => {
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should fail on invalid email', async () => {
    dto.email = 'test';
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
    expect(errors[0]?.constraints).toHaveProperty('isEmail');
  });

  const testPassword = async (password: string, message: string) => {
    dto.password = password;
    const errors = await validate(dto);
    const passwordErrors = errors.find(
      (error) => error.property === 'password',
    );
    expect(passwordErrors).not.toBeUndefined();
    const messages = Object.values(passwordErrors?.constraints ?? {});
    expect(messages).toContain(message);
  };

  it('should fail without 1 uppercase letter', async () => {
    await testPassword(
      'tttttest',
      'Password must contain at least 1 uppercase character',
    );
  });

  it('should fail without 1 number', async () => {
    await testPassword('tttttesT', 'Password must contain at least 1 number');
  });

  it('should fail without 1 special symbol', async () => {
    await testPassword(
      'ttttesT1',
      'Password must contain at least 1 special symbol',
    );
  });
});
