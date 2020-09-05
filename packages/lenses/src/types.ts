import { TemplateResult } from 'lit-element';
import { Entity } from '@uprtcl/cortex';

export interface Lens<T = any> {
  name: string;
  type?: string;
  render: (input: T) => TemplateResult;
}

export type LensSelector = (
  lenses: Lens[],
  entityLink: string,
  entity: any,
  lensType: string,
  context: string
) => Lens;
