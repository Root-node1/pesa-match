import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/common/guards/roles.guard.js';

describe('RolesGuard', () => {
  it('allows when no roles required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({}) }) } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });
  it('denies when user lacks required role', () => {
    const reflector = { getAllAndOverride: () => ['OWNER'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { roles: ['STAFF'] } }) }) } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(false);
  });
  it('allows when user has required role', () => {
    const reflector = { getAllAndOverride: () => ['OWNER'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { roles: ['OWNER'] } }) }) } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
