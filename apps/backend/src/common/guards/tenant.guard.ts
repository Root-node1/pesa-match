import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
    });
    if (memberships.length === 0) throw new ForbiddenException('No organization membership');
    const requested = req.headers['x-organization-id'];
    let membership = memberships[0];
    if (requested) {
      const found = memberships.find((m) => m.organizationId === requested);
      if (!found) throw new ForbiddenException('Organization not accessible');
      membership = found;
    }
    req.user.memberships = memberships;
    req.user.roles = membership.role ? [membership.role] : [];
    req.user.orgId = membership.organizationId;
    req.orgId = membership.organizationId;
    return true;
  }
}
