import { UseCaseError } from "@/core/errors/use-case-error";



export class NotFoundError extends Error implements UseCaseError {
  constructor(identifier: string, resource: string) {
    super(`${resource} "${identifier}" not found.`)
  }
}