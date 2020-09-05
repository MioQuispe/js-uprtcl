import { Lens } from '@uprtcl/lenses';

export interface AclLenseInput {
  uref: string;
  parentId: string;
}
export interface AccessControlService {
  canWrite(uref: string, userId?: string): Promise<boolean>;
  lense(): Lens<AclLenseInput>;
}
