import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Query } from '@nestjs/common';

import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { TaskStatus } from './task.model';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';
import { WrongStatusException } from './exceptions/wrong-task-status-exception';
import { Task } from './task.entity';
import { CreateTaskLabelDto } from './create-task-label.dto';
import { TaskLabel } from './task-label.entity';
import { FindTaskParams } from './find-task.params';
import { PaginationParams } from '../common/pagination.params';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskLabel)
    private readonly labelsRepository: Repository<TaskLabel>,
  ) {}

  public async findAll(
    filters: FindTaskParams,
    pagination: PaginationParams,
    userId: string,
  ): Promise<[Task[], number]> {
    const query = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.labels', 'labels')
      .where('task.userId = :userId', { userId });

    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.search) {
      query.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${filters.search}%` },
      )
    }

    if (filters?.labels?.length) {
      const subQuery = query
        .subQuery()
        .select('labels.taskId')
        .from('task_label', 'labels')
        .where('labels.name IN (:...names)', { names: filters.labels })
        .getQuery();

      query.andWhere(`task.id IN ${subQuery}`);
      // query.andWhere('labels.name IN (:...names)', { names: filters.labels });
    }

    query.orderBy(`task.${filters.sortBy}`, filters.sortOrder);
    query.skip(pagination.offset).take(pagination.limit);

    return query.getManyAndCount();
  }

  public async fidOne(id: string): Promise<Task | null> {
    return await this.tasksRepository.findOne({
      where: { id },
      relations: ['labels'],
    });
  }

  public async create(createTaskDto: CreateTaskDto): Promise<Task> {
    if (createTaskDto.labels) {
      createTaskDto.labels = this.getUniqueLabels(createTaskDto.labels);
    }

    return await this.tasksRepository.save(createTaskDto);
  }

  public async deleteTask(task: Task): Promise<void> {
    await this.tasksRepository.remove(task);
  }

  public async updateTask(
    task: Task,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    if (
      updateTaskDto.status &&
      !this.isValidStatusTransition(task.status, updateTaskDto.status)
    ) {
      throw new WrongStatusException();
    }

    if (updateTaskDto.labels) {
      updateTaskDto.labels = this.getUniqueLabels(updateTaskDto.labels);
    }

    Object.assign(task, updateTaskDto);
    return await this.tasksRepository.save(task);
  }

  public async addLabels(
    task: Task,
    labelsDto: CreateTaskLabelDto[],
  ): Promise<Task> {
    const existingLabels = task.labels.map((label) => label.name);
    const labels = this.getUniqueLabels(labelsDto)
      .filter((dto) => !existingLabels.includes(dto.name))
      .map((label) => this.labelsRepository.create(label));

    if (labels.length) {
      task.labels = [...task.labels, ...labels];

      return await this.tasksRepository.save(task);
    }

    return task;
  }

  public async deleteLabels(
    task: Task,
    labelsToRemove: string[],
  ): Promise<Task> {
    task.labels = task.labels.filter(
      ({ name }) => !labelsToRemove.includes(name),
    );

    return await this.tasksRepository.save(task);
  }

  private isValidStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ) {
    const statusOrder = [TaskStatus.OPEN, TaskStatus.PROGRESS, TaskStatus.DONE];

    return statusOrder.indexOf(currentStatus) <= statusOrder.indexOf(newStatus);
  }

  private getUniqueLabels(
    labelsDtos: CreateTaskLabelDto[],
  ): CreateTaskLabelDto[] {
    const uniqNames = [...new Set(labelsDtos.map((label) => label.name))];

    return uniqNames.map((name) => ({ name }));
  }
}
