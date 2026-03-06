import { SetMetadata } from '@nestjs/common'

export const ROLE_VALUES = ['ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER'] as const

export type Role = (typeof ROLE_VALUES)[number]

export const ROLES_KEY = 'roles'

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)

export const isRole = (value: string): value is Role => ROLE_VALUES.includes(value as Role)
