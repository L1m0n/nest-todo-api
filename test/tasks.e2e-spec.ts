import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { TestSetup } from './utils/test.setup';
import { Role } from '../src/users/role.enum';
import { TaskStatus } from '../src/tasks/task.model';

describe('Tasks (e2e)', () => {
  let testSetup: TestSetup;
  let accessToken: string;
  let taskId: string;

  const testUser = {
    email: 'test@example.com',
    password: 'passwordT1!',
    name: 'Test User',
  };

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);

    await request(testSetup.app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    const response = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send(testUser);

    accessToken = response.body.accessToken;

    const taskResponse = await request(testSetup.app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test task',
        description: 'Test description',
        status: TaskStatus.OPEN,
        labels: [{ name: 'test label' }],
      });

    taskId = taskResponse.body.id;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should no allow accesses to another user tasks', async () => {
    const otherUser = { ...testUser, email: 'otherTest@example.com' };

    await request(testSetup.app.getHttpServer())
      .post('/auth/register')
      .send(otherUser)
      .expect(201)
      .expect((res) => {
        expect(res.body.roles).toEqual([Role.USER]);
      });

    const response = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send(otherUser);

    const otherToken = response.body.accessToken;

    await request(testSetup.app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('should list user tasks only', async () => {
    await request(testSetup.app.getHttpServer())
      .get(`/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.meta.total).toEqual(1);
      });

    const otherUser = { ...testUser, email: 'otherTest@example.com' };

    await request(testSetup.app.getHttpServer())
      .post('/auth/register')
      .send(otherUser)
      .expect(201)
      .expect((res) => {
        expect(res.body.roles).toEqual([Role.USER]);
      });

    const response = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send(otherUser);

    const otherToken = response.body.accessToken;

    await request(testSetup.app.getHttpServer())
      .get(`/tasks`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.meta.total).toEqual(0);
      });
  });
});
