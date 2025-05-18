import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  BadRequestException, Query, ForbiddenException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './create-task.dto';
import { FindOneParams } from './find-one.params';
import { UpdateTaskDto } from './update-task.dto';
import { WrongStatusException } from './exceptions/wrong-task-status-exception';
import { Task } from './task.entity';
import { CreateTaskLabelDto } from './create-task-label.dto';
import { FindTaskParams } from './find-task.params';
import { PaginationParams } from '../common/pagination.params';
import { PaginationResponse } from '../common/pagination.response';
import { CurrentUserDecorator } from '../users/decorators/current-user.decorator';

@Controller('tasks')
export class TasksController {
  constructor(private taskService: TasksService) {}

  @Get()
  public async findAll(
    @Query() filters: FindTaskParams,
    @Query() pagination: PaginationParams,
    @CurrentUserDecorator() userId: string,
  ): Promise<PaginationResponse<Task>> {
    const [
      data,
      total,
    ] = await this.taskService.findAll(filters, pagination, userId);

    return {
      data,
      meta: {
        total,
        offset: pagination.offset,
        limit: pagination.limit,
      },
    }
  }

  @Get('/:id')
  public async getOne(
    @Param() params: FindOneParams,
    @CurrentUserDecorator() userId: string,
  ): Promise<Task> {
    return await this.findOneOrFail(params.id, userId);
  }

  @Post()
  public async create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUserDecorator() userId: string,
  ): Promise<Task> {
    return await this.taskService.create({ ...createTaskDto, userId });
  }

  @Patch('/:id')
  public async updateTask(
    @Param() params: FindOneParams,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUserDecorator() userId: string,
  ): Promise<Task> {
    const task = await this.findOneOrFail(params.id, userId);
    try {
      return this.taskService.updateTask(task, updateTaskDto);
    } catch (error) {
      if (error instanceof WrongStatusException) {
        throw new BadRequestException([error.message]);
      }

      throw error;
    }
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteOne(
    @Param() params: FindOneParams,
    @CurrentUserDecorator() userId: string,
  ): Promise<void> {
    const task = await this.findOneOrFail(params.id, userId);
    await this.taskService.deleteTask(task);
  }

  @Post('/:id/labels')
  public async addLabels(
    @Param() { id }: FindOneParams,
    @Body() labels: CreateTaskLabelDto[],
    @CurrentUserDecorator() userId: string,
  ): Promise<Task> {
    const task = await this.findOneOrFail(id, userId);

    return await this.taskService.addLabels(task, labels);
  }

  @Delete('/:id/labels')
  public async deleteLabels(
    @Param() { id }: FindOneParams,
    @Body() labelsNames: string[],
    @CurrentUserDecorator() userId: string,
  ): Promise<void> {
    const task = await this.findOneOrFail(id, userId);
    await this.taskService.deleteLabels(task, labelsNames);
  }

  private async findOneOrFail(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskService.fidOne(taskId);

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    this.checkTaskOwnerShip(task, userId);

    return task;
  }

  private checkTaskOwnerShip(task: Task, userId: string): void {
    if (task.userId !== userId) {
      throw new ForbiddenException('You can only access your own tasks');
    }
  }
}
