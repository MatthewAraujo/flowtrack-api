import { Task } from '@/domain/todo/enterprise/entities/task'

export class TaskPresenter {
  static toHTTP(task: Task) {
    return {
      id: task.id.toString(),
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      slug: task.slug.value,
      authorId: task.authorId.toString(),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }
  }
}