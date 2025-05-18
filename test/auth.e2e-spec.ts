import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { TestSetup } from './utils/test.setup';
import e from 'express';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/user.entity';
import { Role } from '../src/users/role.enum';
import { PasswordService } from '../src/users/password/password.service';
import { JwtService } from '@nestjs/jwt';

describe('Authentication & authorization (e2e)', () => {
  let testSetup: TestSetup;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  })

  const testUser = {
    email: 'test@example.com',
    password: 'passwordT1!',
    name: 'Test User',
  }

  it('should require auth', async () => {
    return request(testSetup.app.getHttpServer())
      .get('/tasks')
      .expect(401);
  });
  it('should be able to register user', async () => {
    return request(testSetup.app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201)
      .expect(res => {
        expect(res.body.email).toBe('test@example.com');
        expect(res.body.name).toBe('Test User');
        expect(res.body).not.toHaveProperty('password');
      })
  });

  it('/auth/register POST - duplicate email', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    return await request(testSetup.app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(409);
  });

  it('/auth/login POST', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    const response = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'passwordT1!' });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeDefined();
  });

  it('/auth/profile GET', async () => {
    await request(testSetup.app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    const response = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'passwordT1!' });

    const token = response.body.accessToken;

    return await request(testSetup.app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(res => {
        expect(res.body.email).toBe('test@example.com');
        expect(res.body.name).toBe('Test User');
        expect(res.body).not.toHaveProperty('password');
      });
  });

  it('should include roles in jwt', async () => {
    const userRepo = testSetup.app.get(getRepositoryToken(User))

    await userRepo.save({
      ...testUser,
      roles: [Role.ADMIN],
      password: await testSetup.app.get(PasswordService)
        .hashPassword(testUser.password),
    });

    const response = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'passwordT1!' });

    const decoded = testSetup.app.get(JwtService)
      .verify(response.body.accessToken);

    expect(decoded.roles).toBeDefined();
    expect(decoded.roles).toContain(Role.ADMIN);
  });

  it('/auth/admin GET - admin access', async () => {
    const userRepo = testSetup.app.get(getRepositoryToken(User))

    await userRepo.save({
      ...testUser,
      roles: [Role.ADMIN],
      password: await testSetup.app.get(PasswordService)
        .hashPassword(testUser.password),
    });

    const response = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    const token = response.body.accessToken;

    return request(testSetup.app.getHttpServer())
      .get('/auth/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(res => {
        expect(res.body.message).toBe('Admin only');
      })
  });

  it('/auth/admin GET - regular user denied', async () => {
    const userRepo = testSetup.app.get(getRepositoryToken(User))

    await userRepo.save({
      ...testUser,
      roles: [Role.USER],
      password: await testSetup.app.get(PasswordService)
        .hashPassword(testUser.password),
    });

    const response = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    const token = response.body.accessToken;

    return request(testSetup.app.getHttpServer())
      .get('/auth/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  });

  it('/auth/register POST - attempting to register as admin', async () => {
    const userAdmin = {
      ...testUser,
      roles: [Role.ADMIN],
    }
    const userRepo = testSetup.app.get(getRepositoryToken(User))

    await request(testSetup.app.getHttpServer())
      .post('/auth/register')
      .send(userAdmin)
      .expect(201)
      .expect(res => {
        expect(res.body.roles).toEqual([Role.USER]);
      });
  });
});
